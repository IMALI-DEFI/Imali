'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const S=require('./security'),P=require('./providers'),D=require('./destinations');
function loadConfig(){const c=JSON.parse(fs.readFileSync('/etc/imali-social/config.json','utf8'));const key=Buffer.from(fs.readFileSync('/etc/imali-social/vault.key','utf8').trim(),'base64');if(key.length!==32)throw Error('VAULT_KEY_INVALID');if(c.origin!=='https://api.imali-defi.com')throw Error('CALLBACK_ORIGIN_INVALID');return {c,key};}
function callback(c,p){return c.origin+'/api/social/callback/'+p;}
function configured(c,p){const a=c.apps?.[p]||{};return Boolean(a.client_id&&a.client_secret&&(p!=='facebook'&&p!=='instagram'||/^v\d+\.\d+$/.test(a.graph_version||''))&&(p!=='linkedin'||a.api_version));}
function safeError(e){const code=String(e.message||'').match(/^PROVIDER_HTTP_\d+_CODE_[A-Za-z0-9.-]+(?:_SUB_[A-Za-z0-9.-]+)?/);return code?code[0]:/^[A-Z][A-Z0-9_]{2,100}$/.test(e.message)?e.message:'SOCIAL_OPERATION_FAILED';}
function cookie(req,name){return String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';}
function granted(t){return Array.isArray(t.scope)?t.scope:String(t.scope||'').split(/[ ,]+/).filter(Boolean);}
async function withLock(db,b,p,fn){const client=await db.connect();try{await client.query('BEGIN');await client.query("SET LOCAL lock_timeout='2s'");const r=await client.query('SELECT * FROM social_connections_v1 WHERE brand=$1 AND platform=$2 FOR UPDATE',[b,p]);if(!r.rows[0])throw Error('DESTINATION_MISSING');const result=await fn(client,r.rows[0]);await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}
function mount(app,{db,authenticateToken,requireAdmin}){
 const express=require('express'),router=express.Router();
 router.use((req,res,next)=>{res.set('Cache-Control','no-store');next();});
 const wrap=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(400).json({success:false,error:safeError(e)});}};
 require('./instagram-jobs').mount(router,{db,loadConfig,wrap,safeError});
 require('./facebook-jobs').mount(router,{db,wrap});
 require('./campaign-review').mount(router,{db,wrap});
 require('./center').mount(router,{db,wrap,loadConfig});
 require('./automation').mount(router,{db,wrap});
 require('./threads-jobs').mount(router,{db,wrap,loadConfig});
 router.get('/connections',wrap(async(req,res)=>{const {c}=loadConfig();const r=await db.query('SELECT * FROM social_connections_v1 ORDER BY brand,platform');res.json({success:true,automatic_publishing:require('./automation').runtimeStatus().automatic_publishing,connections:r.rows.map(x=>({...S.publicConnection(x),destination_key:x.brand,destination_label:D.destinations[x.brand]?.label,expected_username:D.expectedUsername(x.brand,x.platform),app_configured:configured(c,x.platform),callback_url:callback(c,x.platform),test_types:['x','facebook','linkedin'].includes(x.platform)?['text','link']:x.platform==='instagram'?['image','reel']:x.platform==='threads'?['image']:[],media_validation:'requires_connected_account'}))});}));
 router.post('/:brand/:platform/connect',wrap(async(req,res)=>{
  const {brand:b,platform:p}=req.params;S.validate(b,p);const {c,key}=loadConfig();if(!configured(c,p))throw Error('APP_SETUP_REQUIRED');
  if(p==='tiktok'&&!c.apps[p].approved_use_case)throw Error('TIKTOK_USE_CASE_REVIEW_REQUIRED');
  const usernameMode=p==='threads'||(b==='founder'&&p==='instagram');
  const expected=String(
    usernameMode
      ? (req.body.expected_account_name||req.body.expected_account_id||'')
      : (req.body.expected_account_id||'')
  ).trim().replace(usernameMode?/^@/:/(?!)/,'');
  if(usernameMode)D.assertUsername(b,p,expected);

  if(!expected||expected.length>160)
    throw Error(p==='threads'?'EXPECTED_THREADS_USERNAME_REQUIRED':'EXPECTED_ACCOUNT_ID_REQUIRED');

  const old=(await db.query(
    'SELECT account_id,account_name,generation FROM social_connections_v1 WHERE brand=$1 AND platform=$2',
    [b,p]
  )).rows[0];

  if(!old)throw Error('DESTINATION_MISSING');
  if(
    !usernameMode &&
    old?.account_id &&
    old.account_id!==expected
  ) throw Error('DESTINATION_MISMATCH');

  if(
    usernameMode &&
    old?.account_name &&
    String(old.account_name).toLowerCase()!==expected.toLowerCase()
  ) throw Error('DESTINATION_MISMATCH');
  const state=S.nonce(),browser=S.nonce(),verifier=S.nonce(),digest=S.hash(state);
  await db.query('DELETE FROM social_oauth_states_v1 WHERE state_hash IN (SELECT state_hash FROM social_oauth_states_v1 WHERE expires_at<now() LIMIT 100)');
  const count=(await db.query('SELECT count(*)::int n FROM social_oauth_states_v1 WHERE admin_id=$1 AND expires_at>now() AND used_at IS NULL',[String(req.user.id)])).rows[0].n;if(count>=10)throw Error('TOO_MANY_PENDING_CONNECTIONS');
  await db.query("INSERT INTO social_oauth_states_v1 VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+interval '10 minutes',NULL)",[digest,b,p,String(req.user.id),S.hash(browser),S.seal(key,verifier,digest),expected,old.generation]);
  res.cookie('social_oauth_'+state.slice(0,12),browser,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/social/callback',maxAge:600000});
  res.json({success:true,authorization_url:P.authorization(p,c.apps[p],callback(c,p),state,crypto.createHash('sha256').update(verifier).digest('base64url'))});
 }));
 router.post('/:brand/:platform/confirm',wrap(async(req,res)=>{const {brand:b,platform:p}=req.params;S.validate(b,p);await withLock(db,b,p,async(client,x)=>{S.assertDestination(x,b,p,String(req.body.account_id));if(x.connection_status!=='PENDING_CONFIRMATION')throw Error('CONNECTION_NOT_VERIFIED');await client.query("UPDATE social_connections_v1 SET connection_status='CONNECTED',updated_at=now() WHERE brand=$1 AND platform=$2",[b,p]);});res.json({success:true});}));
 router.post('/:brand/:platform/disconnect',wrap(async(req,res)=>{const {brand:b,platform:p}=req.params;S.validate(b,p);await withLock(db,b,p,async(client)=>{await client.query("UPDATE social_connections_v1 SET token_cipher=NULL,connection_status='DISCONNECTED',token_expiration=NULL,generation=generation+1,updated_at=now() WHERE brand=$1 AND platform=$2",[b,p]);await client.query("UPDATE social_queue_v1 SET state='FAILED',error='DISCONNECTED_REAPPROVAL_REQUIRED' WHERE brand=$1 AND platform=$2 AND state IN ('DRAFT','APPROVED','SCHEDULED','RETRY')",[b,p]);await client.query('UPDATE social_oauth_states_v1 SET used_at=now() WHERE brand=$1 AND platform=$2 AND used_at IS NULL',[b,p]);});res.json({success:true,provider_revocation:'Remove app permission in platform settings to revoke all provider-side access.'});}));
 router.post('/:brand/:platform/refresh',wrap(async(req,res)=>{const {brand:b,platform:p}=req.params;S.validate(b,p);const {c,key}=loadConfig();await withLock(db,b,p,async(client,x)=>{if(!x.token_cipher)throw Error('RECONNECT_REQUIRED');const t=await P.refresh(p,c.apps[p],S.open(key,x.token_cipher,b+':'+p));const exp=t.expires_in?new Date(Date.now()+Number(t.expires_in)*1000):null;await client.query('UPDATE social_connections_v1 SET token_cipher=$3,token_expiration=$4,last_error=NULL,updated_at=now() WHERE brand=$1 AND platform=$2',[b,p,S.seal(key,t,b+':'+p),exp]);});res.json({success:true});}));
 router.post('/:brand/:platform/test-post',wrap(async(req,res)=>{
  const {brand:b,platform:p}=req.params;S.validate(b,p);const {c,key}=loadConfig();if(!c.manual_test_enabled)throw Error('MANUAL_TESTS_DISABLED');
  if(req.body.brand!==b)throw Error('CONTENT_BRAND_MISMATCH');const idempotency=String(req.body.idempotency_key||'');if(!/^[a-zA-Z0-9_-]{16,100}$/.test(idempotency))throw Error('IDEMPOTENCY_KEY_REQUIRED');
  const content={type:req.body.type,text:String(req.body.text||''),link:req.body.link?String(req.body.link):null};if(!['text','link'].includes(content.type)||!['x','facebook','linkedin'].includes(p))throw Error('MEDIA_TEST_REQUIRES_CONNECTION_VALIDATION');if(content.text.length>3000)throw Error('TEXT_TOO_LONG');if(content.link){const u=new URL(content.link);if(u.protocol!=='https:'||u.username||u.password)throw Error('LINK_INVALID');}
  const outcome=await withLock(db,b,p,async(client,x)=>{
   S.assertDestination(x,b,p,String(req.body.account_id));if(x.connection_status!=='CONNECTED')throw Error('CONNECTION_NOT_CONFIRMED');if(req.body.approve!==true)throw Error('EXPLICIT_TEST_APPROVAL_REQUIRED');
   const prior=(await client.query('SELECT id,state,platform_post_id,public_url,error,content FROM social_queue_v1 WHERE brand=$1 AND platform=$2 AND idempotency_key=$3',[b,p,idempotency])).rows[0];if(prior){if(JSON.stringify(prior.content)!==JSON.stringify(content)&&S.hash(JSON.stringify(Object.entries(prior.content).sort()))!==S.hash(JSON.stringify(Object.entries(content).sort())))throw Error('IDEMPOTENCY_CONTENT_MISMATCH');delete prior.content;return prior;}
   if(x.token_expiration&&new Date(x.token_expiration)<=new Date())throw Error('TOKEN_EXPIRED_REFRESH_OR_RECONNECT');
   const recent=(await client.query("SELECT count(*)::int n FROM social_queue_v1 WHERE brand=$1 AND platform=$2 AND created_at>now()-interval '1 minute'",[b,p])).rows[0].n;if(recent)throw Error('TEST_RATE_LIMIT');
   const id=crypto.randomUUID();await client.query("INSERT INTO social_queue_v1(id,brand,platform,account_id,generation,state,content,approved_by,idempotency_key) VALUES($1,$2,$3,$4,$5,'POSTING',$6,$7,$8)",[id,b,p,x.account_id,x.generation,content,String(req.user.id),idempotency]);
   // Commit the in-flight marker BEFORE the network request: a crash must never cause blind reposting.
   await client.query('COMMIT');await client.query('BEGIN');await client.query('SELECT 1 FROM social_connections_v1 WHERE brand=$1 AND platform=$2 FOR UPDATE',[b,p]);
   const current=(await client.query('SELECT generation,connection_status FROM social_connections_v1 WHERE brand=$1 AND platform=$2',[b,p])).rows[0];if(current.generation!==x.generation||current.connection_status!=='CONNECTED'){await client.query("UPDATE social_queue_v1 SET state='FAILED',error='DESTINATION_CHANGED' WHERE id=$1",[id]);return {id,state:'FAILED',error:'DESTINATION_CHANGED'};}
   try{const t=S.open(key,x.token_cipher,b+':'+p),posted=await P.publishText(p,c.apps[p],t,x,content);await client.query("UPDATE social_queue_v1 SET state='POSTED',platform_post_id=$2,public_url=$3,published_at=now(),updated_at=now() WHERE id=$1",[id,posted.id,posted.url]);await client.query('UPDATE social_connections_v1 SET last_success=now(),last_error=NULL WHERE brand=$1 AND platform=$2',[b,p]);return {id,state:'POSTED',platform_post_id:posted.id,public_url:posted.url};}
   catch(e){const err=safeError(e),uncertain=err==='PROVIDER_TRANSPORT_UNCERTAIN'||err==='PROVIDER_RESPONSE_INVALID'||err==='PUBLISH_CONFIRMATION_MISSING'||/^PROVIDER_HTTP_5/.test(err);await client.query("UPDATE social_queue_v1 SET state=$2,error=$3,updated_at=now() WHERE id=$1",[id,uncertain?'POSTING':'FAILED',uncertain?'CONFIRMATION_UNKNOWN_DO_NOT_RETRY':err]);await client.query('UPDATE social_connections_v1 SET last_error=$3 WHERE brand=$1 AND platform=$2',[b,p,err]);return {id,state:uncertain?'POSTING':'FAILED',error:uncertain?'CONFIRMATION_UNKNOWN_DO_NOT_RETRY':err};}
  });res.json({success:outcome.state==='POSTED',data:outcome});
 }));
 router.get('/queue',wrap(async(req,res)=>{const r=await db.query('SELECT id,brand,platform,account_id,state,platform_post_id,published_at,public_url,error,provider_state,created_at FROM social_queue_v1 ORDER BY created_at DESC LIMIT 100');res.json({success:true,automatic_publishing:require('./automation').runtimeStatus().automatic_publishing,items:r.rows});}));
 app.use('/api/admin/social',authenticateToken,requireAdmin,router);
 app.get('/api/social/callback/:platform',async(req,res)=>{
  res.set({'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"});
  try{const p=req.params.platform;S.validate('imali',p);const state=String(req.query.state||'');if(!/^[A-Za-z0-9_-]{43}$/.test(state))throw Error('STATE_INVALID');const {c,key}=loadConfig(),digest=S.hash(state),browser=cookie(req,'social_oauth_'+state.slice(0,12));
   const r=await db.query('UPDATE social_oauth_states_v1 SET used_at=now() WHERE state_hash=$1 AND platform=$2 AND browser_hash=$3 AND expires_at>now() AND used_at IS NULL RETURNING *',[digest,p,S.hash(browser)]);if(!r.rows.length)throw Error('STATE_EXPIRED_OR_REPLAYED');const st=r.rows[0];
   const admin=(await db.query('SELECT is_admin,email FROM users WHERE id=$1',[st.admin_id])).rows[0];if(!admin||!(admin.is_admin||admin.email===process.env.OWNER_EMAIL||admin.email==='wayne@imali-defi.com'))throw Error('ADMIN_ACCESS_REVOKED');
   if(req.query.error)throw Error('AUTHORIZATION_DECLINED');const code=String(req.query.code||'');if(!code||code.length>4096)throw Error('CODE_INVALID');
   const t=await P.exchange(
    p,c.apps[p],callback(c,p),code,
    S.open(key,st.verifier_cipher,digest)
   );

   const who=await P.identify(
    p,c.apps[p],t,
    (p==='threads'||(st.brand==='founder'&&p==='instagram')) ? undefined : st.expected_account
   );

   D.assertUsername(st.brand,p,who.name);
   if(p==='threads'||(st.brand==='founder'&&p==='instagram')){
    const actual=String(who.name||'')
      .trim()
      .replace(/^@/,'')
      .toLowerCase();

    const usernameMode=p==='threads'||(b==='founder'&&p==='instagram');
  const expected=String(st.expected_account||'')
      .trim()
      .replace(/^@/,'')
      .toLowerCase();

    if(!actual || actual!==expected)
      throw Error('DESTINATION_MISMATCH');
   }else{
    if(String(who.id)!==String(st.expected_account))
      throw Error('DESTINATION_MISMATCH');
   }
   const gs=granted(t);const missing=P.scopes(p,c.apps[p]).filter(s=>!gs.includes(s));
   await withLock(db,st.brand,p,async(client,x)=>{if(x.generation!==st.generation)throw Error('CONNECTION_CHANGED_DURING_AUTHORIZATION');if(x.account_id&&x.account_id!==who.id)throw Error('DESTINATION_MISMATCH');await client.query("UPDATE social_connections_v1 SET account_id=$3,account_name=$4,connection_status=$5,granted_scopes=$6,token_expiration=$7,token_cipher=$8,generation=generation+1,last_success=now(),last_error=$9,updated_at=now() WHERE brand=$1 AND platform=$2",[st.brand,p,String(who.id),who.name,missing.length?'SCOPES_UNVERIFIED':'PENDING_CONFIRMATION',JSON.stringify(gs),t.expires_in?new Date(Date.now()+Number(t.expires_in)*1000):null,S.seal(key,t,st.brand+':'+p),missing.length?'REQUIRED_SCOPES_UNVERIFIED':null]);});
   res.clearCookie('social_oauth_'+state.slice(0,12),{path:'/api/social/callback',secure:true,httpOnly:true,sameSite:'lax'});res.status(200).type('text').send('Account verified. Return to Social Connections to review the brand and confirm the destination. No post was sent.');
  }catch(e){res.status(400).type('text').send('Connection not completed: '+safeError(e)+'. Return to Social Connections.');}
 });
}
module.exports={mount,configured,callback,safeError};
