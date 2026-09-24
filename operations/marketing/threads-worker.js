'use strict';
const fs=require('node:fs');
const R=require('./campaign-runtime'),{Pool}=R.postgres(),DB=require('./campaign-db'),S=R.social('security'),M=R.social('threads-media');
const safe=e=>/^[A-Z][A-Z0-9_]{2,100}$/.test(e.message)?e.message:'THREADS_OPERATION_FAILED';
function loadConfig(){const c=JSON.parse(fs.readFileSync('/etc/imali-social/config.json'));const key=Buffer.from(fs.readFileSync('/etc/imali-social/vault.key','utf8').trim(),'base64');if(key.length!==32)throw Error('VAULT_KEY_INVALID');if(!c.apps?.threads?.client_id||!c.apps?.threads?.client_secret)throw Error('THREADS_APP_NOT_CONFIGURED');return {c,key}}
async function advance(db,id){const client=await db.connect();let locked=false;try{
 locked=(await client.query('SELECT pg_try_advisory_lock(hashtext($1)) ok',['threads:'+id])).rows[0].ok;if(!locked)return {id,state:'BUSY'};
 const j=(await client.query("SELECT * FROM social_queue_v1 WHERE id=$1 AND platform='threads'",[id])).rows[0];if(!j)throw Error('JOB_NOT_FOUND');
 R.social('campaign-guard').assertNotPreparedCampaign(j);
 const p=j.provider_state||{};
 if(['POSTED','FAILED'].includes(j.state)||p.step==='REVIEW')return {id,state:j.state,error:j.error};
 const save=async(state,error=null)=>client.query('UPDATE social_queue_v1 SET state=$2,provider_state=$3,error=$4,updated_at=now() WHERE id=$1',[id,state,p,error]);
 if(['CREATING','PUBLISHING'].includes(p.step)){p.step='REVIEW';await save('POSTING','CONFIRMATION_UNKNOWN_DO_NOT_RETRY');return {id,state:'REVIEW'}}
 if(!['APPROVED','POSTING'].includes(j.state)||!j.approved_by)throw Error('EXPLICIT_APPROVAL_REQUIRED');
 if(j.scheduled_at&&new Date(j.scheduled_at)>new Date())return {id,state:'SCHEDULED'};
 const {key}=loadConfig();
 const x=(await client.query("SELECT * FROM social_connections_v1 WHERE brand=$1 AND platform='threads'",[j.brand])).rows[0];
 if(!x||x.connection_status!=='CONNECTED')throw Error('CONNECTION_NOT_CONFIRMED');
 if(x.account_id!==j.account_id||x.generation!==j.generation)throw Error('DESTINATION_CHANGED');
 if(x.token_expiration&&new Date(x.token_expiration)<=new Date())throw Error('TOKEN_EXPIRED_REFRESH_OR_RECONNECT');
 const t=S.open(key,x.token_cipher,j.brand+':threads');
 try{
  if(!p.container_id){const content=await M.checkMedia(j.brand,j.content);p.step='CREATING';await save('POSTING');p.container_id=await M.create(t,x,content);p.step='PROCESSING';await save('POSTING');return {id,state:'PROCESSING'}}
  if(p.step==='PROCESSING'){
   const status=await M.status(t,p.container_id);
   if(status==='IN_PROGRESS')return {id,state:'PROCESSING'};
   if(status!=='FINISHED'){p.step='REVIEW';await save('FAILED','THREADS_CONTAINER_'+String(status||'UNKNOWN').replace(/[^A-Z_]/g,''));return {id,state:'REVIEW'}}
   p.step='PUBLISHING';await save('POSTING');
   p.media_id=await M.publish(t,x,p.container_id);p.step='CONFIRMING';await save('POSTING');
  }
  if(p.step==='CONFIRMING'){
   const result=await M.confirm(t,p.media_id,x);p.step='DONE';
   await client.query("UPDATE social_queue_v1 SET state='POSTED',provider_state=$2,error=NULL,platform_post_id=$3,public_url=$4,published_at=now(),updated_at=now() WHERE id=$1",[id,p,result.id,result.url]);
   await client.query("UPDATE social_connections_v1 SET last_success=now(),last_error=NULL WHERE brand=$1 AND platform='threads'",[j.brand]);return {id,state:'POSTED',public_url:result.url};
  }
  throw Error('THREADS_JOB_STATE_INVALID');
 }catch(e){const uncertain=['CREATING','PUBLISHING'].includes(p.step);const error=uncertain?'CONFIRMATION_UNKNOWN_DO_NOT_RETRY':safe(e);p.step='REVIEW';await save('POSTING',error);await client.query("UPDATE social_connections_v1 SET last_error=$2 WHERE brand=$1 AND platform='threads'",[j.brand,error]);return {id,state:'REVIEW',error}}
 }finally{if(locked)await client.query('SELECT pg_advisory_unlock(hashtext($1))',['threads:'+id]).catch(()=>{});client.release()}}
async function main(){const db=new Pool(DB.options());try{const jobs=(await db.query("SELECT id FROM social_queue_v1 WHERE platform='threads' AND state IN ('APPROVED','POSTING') AND approved_by IS NOT NULL AND (scheduled_at IS NULL OR scheduled_at<=now()) AND COALESCE(provider_state->>'step','')<>'REVIEW' ORDER BY created_at LIMIT 20")).rows;const results=[];for(const j of jobs){try{results.push(await advance(db,j.id))}catch(e){results.push({id:j.id,state:'ERROR',error:safe(e)})}}console.log(JSON.stringify({processed:results.length,results}))}finally{await db.end()}}
if(require.main===module)main().catch(e=>{console.error(safe(e));process.exitCode=1});
module.exports={advance};
