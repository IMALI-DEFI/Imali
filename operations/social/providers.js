'use strict';
const specs={
 x:{auth:'https://x.com/i/oauth2/authorize',token:'https://api.x.com/2/oauth2/token',scopes:['tweet.read','tweet.write','users.read','offline.access','media.write'],pkce:true},
 facebook:{auth:'https://www.facebook.com/dialog/oauth',token:'https://graph.facebook.com/oauth/access_token',scopes:['pages_show_list','pages_read_engagement','pages_manage_posts']},
 instagram:{auth:'https://www.instagram.com/oauth/authorize',token:'https://api.instagram.com/oauth/access_token',scopes:['instagram_business_basic','instagram_business_content_publish']},
 threads:{
  auth:'https://threads.net/oauth/authorize',
  token:'https://graph.threads.net/oauth/access_token',
  scopes:['threads_basic','threads_content_publish']
 },
 tiktok:{auth:'https://www.tiktok.com/v2/auth/authorize/',token:'https://open.tiktokapis.com/v2/oauth/token/',scopes:['user.info.basic','video.publish']},
 linkedin:{auth:'https://www.linkedin.com/oauth/v2/authorization',token:'https://www.linkedin.com/oauth/v2/accessToken',scopes:['openid','profile','w_member_social']},
 youtube:{auth:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',scopes:['https://www.googleapis.com/auth/youtube.upload','https://www.googleapis.com/auth/youtube.readonly']}
};
const apiHosts=new Set(['api.x.com','graph.facebook.com','graph.instagram.com','api.instagram.com','graph.threads.net','open.tiktokapis.com','www.linkedin.com','api.linkedin.com','oauth2.googleapis.com','www.googleapis.com']);
async function request(url,{token,form,body,method='GET',headers={}}={}){
 const u=new URL(url);if(u.protocol!=='https:'||!apiHosts.has(u.hostname)||u.username||u.password)throw Error('PROVIDER_URL_DENIED');
 const h={Accept:'application/json',...headers};if(token)h.Authorization='Bearer '+token;
 if(form){h['Content-Type']='application/x-www-form-urlencoded';body=new URLSearchParams(form).toString();}
 else if(body){h['Content-Type']='application/json';body=JSON.stringify(body);}
 let r;try{r=await fetch(u,{method,headers:h,body,redirect:'error',signal:AbortSignal.timeout(20000)});}catch{throw Error('PROVIDER_TRANSPORT_UNCERTAIN');}
 let j;try{j=await r.json();}catch{throw Error('PROVIDER_RESPONSE_INVALID');}
 if(!r.ok||j.error&&j.error.code!=='ok'){
  const e=j&&j.error||{};
  const code=String(e.code||'UNKNOWN').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,40);
  const sub=String(e.error_subcode||'').replace(/[^A-Za-z0-9_.-]/g,'_').slice(0,40);
  // Provider descriptions can echo request values. Retain codes, never tokens/text.
  const msg='';
  throw Error('PROVIDER_HTTP_'+r.status+'_CODE_'+code+(sub?'_SUB_'+sub:'')+(msg?'_'+msg:''));
 }
 return {data:j,status:r.status,id:r.headers.get('x-restli-id')};
}
function scopes(platform,cfg){return platform==='linkedin'&&cfg.account_type==='organization'?['openid','profile','w_organization_social','r_organization_admin']:specs[platform].scopes;}
function authorization(platform,cfg,callback,state,challenge){const s=specs[platform],u=new URL(s.auth);const q={response_type:'code',[platform==='tiktok'?'client_key':'client_id']:cfg.client_id,redirect_uri:callback,state,scope:scopes(platform,cfg).join(platform==='tiktok'||platform==='instagram'||platform==='threads'?',':' ')};if(s.pkce)Object.assign(q,{code_challenge:challenge,code_challenge_method:'S256'});if(platform==='youtube')Object.assign(q,{access_type:'offline',prompt:'consent'});if(platform==='instagram')Object.assign(q,{enable_fb_login:'0',force_authentication:'1'});u.search=new URLSearchParams(q);return u.toString();}
async function exchange(platform,cfg,callback,code,verifier){let form={grant_type:'authorization_code',code,redirect_uri:callback,[platform==='tiktok'?'client_key':'client_id']:cfg.client_id,client_secret:cfg.client_secret};const headers={};if(platform==='x'){delete form.client_secret;headers.Authorization='Basic '+Buffer.from(cfg.client_id+':'+cfg.client_secret).toString('base64');form.code_verifier=verifier;}
 let t=(await request(specs[platform].token,{method:'POST',form,headers})).data;
 if(!t.access_token)throw Error('TOKEN_EXCHANGE_FAILED');
 // Instagram's long-lived exchange is officially a GET; never log its URL.
 if(platform==='instagram')t={...t,...(await request('https://graph.instagram.com/access_token?'+new URLSearchParams({grant_type:'ig_exchange_token',client_secret:cfg.client_secret,access_token:t.access_token}))).data};
 if(platform==='facebook')t={...t,...(await request('https://graph.facebook.com/'+cfg.graph_version+'/oauth/access_token?'+new URLSearchParams({grant_type:'fb_exchange_token',client_id:cfg.client_id,client_secret:cfg.client_secret,fb_exchange_token:t.access_token}))).data};
 if(platform==='threads'){
  t={...t,...(await request(
   'https://graph.threads.net/access_token?'+new URLSearchParams({
    grant_type:'th_exchange_token',
    client_secret:cfg.client_secret,
    access_token:t.access_token
   })
  )).data};
 }
 t.scope=t.scope||t.permissions;t.obtained_at=Date.now();return t;
}
async function identify(platform,cfg,t,expected){const token=t.access_token;
 if(platform==='x'){const j=(await request('https://api.x.com/2/users/me',{token})).data.data;return {id:j.id,name:j.username};}
 if(platform==='youtube'){const j=(await request('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',{token})).data.items||[];const v=j.find(x=>x.id===expected);if(!v)throw Error('CHANNEL_NOT_AUTHORIZED');return {id:v.id,name:v.snippet.title};}
 if(platform==='instagram'){const j=(await request('https://graph.instagram.com/'+cfg.graph_version+'/me?fields=user_id,username',{token})).data;return {id:String(j.user_id||j.id),name:j.username};}
 if(platform==='threads'){
  const j=(await request('https://graph.threads.net/v1.0/me?fields=id,username',{token})).data;
  if(!j.id)throw Error('IDENTITY_UNAVAILABLE');
  const debug=(await request('https://graph.threads.net/debug_token?'+new URLSearchParams({input_token:token}),{token})).data.data;
  if(!debug?.is_valid||String(debug.user_id)!==String(j.id)||String(debug.app_id)!==String(cfg.client_id))throw Error('TOKEN_IDENTITY_INVALID');
  t.scope=Array.isArray(debug.scopes)?debug.scopes:[];
  return {id:String(j.id),name:j.username||String(j.id)};
 }
 if(platform==='facebook'){
  if(!/^v\d+\.\d+$/.test(cfg.graph_version||''))throw Error('GRAPH_VERSION_REQUIRED');
  const base='https://graph.facebook.com/'+cfg.graph_version;
  const perms=(await request(base+'/me/permissions',{token})).data.data||[];t.scope=perms.filter(p=>p.status==='granted').map(p=>p.permission).join(' ');
  let path=base+'/me/accounts?fields=id,name,access_token,tasks&limit=100';
  for(let i=0;i<5;i++){const j=(await request(path,{token})).data;const page=(j.data||[]).find(p=>String(p.id)===expected);if(page){if(!(page.tasks||[]).some(x=>['CREATE_CONTENT','MANAGE'].includes(x)))throw Error('PAGE_ROLE_MISSING');t.access_token=page.access_token;t.token_kind='page';return {id:String(page.id),name:page.name};}if(!j.paging?.cursors?.after)break;path=base+'/me/accounts?fields=id,name,access_token,tasks&limit=100&after='+encodeURIComponent(j.paging.cursors.after);}
  throw Error('PAGE_NOT_AUTHORIZED');
 }
 if(platform==='tiktok'){const j=(await request('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name',{token})).data.data?.user;if(!j)throw Error('IDENTITY_UNAVAILABLE');return {id:j.open_id,name:j.display_name};}
 if(platform==='linkedin'){
  if(cfg.account_type==='organization'){
   if(!/^urn:li:organization:[0-9]+$/.test(expected))throw Error('ORGANIZATION_URN_REQUIRED');
   const headers={'Linkedin-Version':cfg.api_version,'X-Restli-Protocol-Version':'2.0.0'};
   let allowed=false;
   for(let start=0;start<1000;start+=100){
    const j=(await request('https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&state=APPROVED&count=100&start='+start,{token,headers})).data;
    const rows=j.elements||[];
    if(rows.some(x=>(x.organization||x.organizationTarget)===expected&&x.state==='APPROVED'&&['ADMINISTRATOR','CONTENT_ADMINISTRATOR','CONTENT_ADMIN'].includes(x.role))){allowed=true;break;}
    if(rows.length<100)break;
   }
   if(!allowed)throw Error('ORGANIZATION_ROLE_NOT_AUTHORIZED');
   const j=(await request('https://api.linkedin.com/rest/organizations/'+expected.split(':').pop(),{token,headers})).data;
   return {id:expected,name:j.localizedName||expected};
  }
  const j=(await request('https://api.linkedin.com/v2/userinfo',{token})).data;return {id:'urn:li:person:'+j.sub,name:j.name};
 }
 throw Error('UNKNOWN_PLATFORM');
}
async function refresh(platform,cfg,t){let data;
 if(platform==='instagram'){data=(await request('https://graph.instagram.com/refresh_access_token?'+new URLSearchParams({grant_type:'ig_refresh_token',access_token:t.access_token}))).data;}
 else if(platform==='threads'){data=(await request('https://graph.threads.net/refresh_access_token?'+new URLSearchParams({grant_type:'th_refresh_token',access_token:t.access_token}))).data;}
 else {if(!t.refresh_token)throw Error('RECONNECT_REQUIRED');const form={grant_type:'refresh_token',refresh_token:t.refresh_token,[platform==='tiktok'?'client_key':'client_id']:cfg.client_id,client_secret:cfg.client_secret},headers={};if(platform==='x'){delete form.client_secret;headers.Authorization='Basic '+Buffer.from(cfg.client_id+':'+cfg.client_secret).toString('base64');}data=(await request(specs[platform].token,{method:'POST',form,headers})).data;}
 if(!data.access_token)throw Error('REFRESH_FAILED');return {...t,...data,obtained_at:Date.now()};
}
async function publishText(platform,cfg,t,c,content){
 if(platform==='facebook'){if(!require('./facebook-service').loadConfig().enabled)throw Error('FACEBOOK_PUBLISH_DISABLED');throw Error('USE_FACEBOOK_PUBLISH_ROUTE');}
 if(platform==='threads')throw Error('USE_DURABLE_THREADS_WORKER');
 if(!['text','link'].includes(content.type))throw Error('MEDIA_ADAPTER_PENDING_CONNECTION_VALIDATION');
 const text=String(content.text||'');if(!text.trim())throw Error('TEXT_REQUIRED');
 if(platform==='x'){const j=(await request('https://api.x.com/2/tweets',{method:'POST',token:t.access_token,body:{text:text+(content.link?'\n'+content.link:'')}})).data;if(!j.data?.id)throw Error('PUBLISH_CONFIRMATION_MISSING');return {id:j.data.id,url:'https://x.com/i/web/status/'+j.data.id};}
 if(platform==='facebook'){const j=(await request('https://graph.facebook.com/'+cfg.graph_version+'/'+encodeURIComponent(c.account_id)+'/feed',{method:'POST',token:t.access_token,body:{message:text,...(content.link?{link:content.link}:{})}})).data;if(!j.id)throw Error('PUBLISH_CONFIRMATION_MISSING');return {id:j.id,url:null};}
 if(platform==='linkedin'){const r=await request('https://api.linkedin.com/rest/posts',{method:'POST',token:t.access_token,headers:{'Linkedin-Version':cfg.api_version,'X-Restli-Protocol-Version':'2.0.0'},body:{author:c.account_id,commentary:text,visibility:'PUBLIC',distribution:{feedDistribution:'MAIN_FEED',targetEntities:[],thirdPartyDistributionChannels:[]},lifecycleState:'PUBLISHED',...(content.link?{content:{article:{source:content.link,title:text.slice(0,100)}}}:{})}});if(r.status!==201||!r.id)throw Error('PUBLISH_CONFIRMATION_MISSING');return {id:r.id,url:null};}
 throw Error('TEXT_OR_LINK_POST_UNSUPPORTED');
}
module.exports={specs,scopes,authorization,exchange,identify,refresh,publishText,request};
