'use strict';
const {execFile}=require('node:child_process');
const Q=require('./automation-queue');
function mount(router,{db,wrap}){
 router.post('/automation/generate',wrap(async(req,res)=>{
  const {brand,platform,content_type,window}=req.body;
  const s=(await db.query('SELECT * FROM social_automation_settings WHERE brand=$1 AND platform=$2 AND content_type=$3',[brand,platform,content_type])).rows[0];
  if(!s||!s.posting_windows.includes(window))throw Error('CONFIGURED_SLOT_REQUIRED');
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  const day=`${parts.year}-${parts.month}-${parts.day}`,key=[brand,platform,content_type,day,window.replace(':','')].join('_');
  await new Promise((resolve,reject)=>execFile('/usr/bin/node',['/home/opc/imali-sniper/social/automation-scheduler.js'],{env:{...process.env,SOCIAL_AUTOMATION_LIVE:'1',SOCIAL_AUTOMATION_FORCE_SLOT:key,SOCIAL_AUTOMATION_PREVIEW:'1'},timeout:150000,maxBuffer:1024*1024},e=>e?reject(Error('GENERATION_FAILED_CHECK_SLOT_RESULT')):resolve()));
  const run=(await db.query('SELECT status,details,queue_id FROM social_automation_runs WHERE slot_key=$1',[key])).rows[0];res.json({success:true,run});
 }));
 router.post('/automation/posts/:id/publish',wrap(async(req,res)=>{
  if(req.body.confirm!==true)throw Error('EXTERNAL_PUBLISH_CONFIRMATION_REQUIRED');
  const client=await db.connect();let locked=false;
  try{locked=(await client.query('SELECT pg_try_advisory_lock(hashtext($1)) ok',['publish-preview:'+req.params.id])).rows[0].ok;if(!locked)throw Error('POST_BUSY');
   const j=(await client.query('SELECT * FROM social_queue_v1 WHERE id=$1',[req.params.id])).rows[0];
   if(!j||!j.provider_state?.automation_preview)throw Error('AUTOMATION_PREVIEW_REQUIRED');
   if(j.provider_state.live_queue_id)return res.json({success:true,id:j.provider_state.live_queue_id,duplicate:true});
   if(j.provider_state.review_center?.decision!=='APPROVED')throw Error('APPROVE_CONTENT_FIRST');
   if(j.provider_state.review_center?.draft)throw Error('EDITED_SIGNAL_REQUIRES_REGENERATION');
   if(!j.provider_state.qualified||Date.now()-Date.parse(j.provider_state.generated_at)>30*60000)throw Error('QUALIFIED_SIGNAL_EXPIRED_REGENERATE_NEXT_SLOT');
   const enqueue={instagram:Q.enqueueInstagram,facebook:Q.enqueueFacebook,threads:Q.enqueueThreads}[j.platform];if(!enqueue)throw Error('PUBLISHER_UNAVAILABLE');
   if(j.platform!=='facebook')await client.query('BEGIN');
   const result=await enqueue(client,{brand:j.brand==='sports_jedi'?'sportsjedi':j.brand,contentType:j.content.content_type,slotKey:j.content.slot_key,scheduledFor:new Date(),mediaUrl:j.content.media_url,caption:j.content.caption});
   const id=result.id||result.job?.id;if(!id)throw Error('PUBLISH_QUEUE_ID_MISSING');
   await client.query("UPDATE social_queue_v1 SET provider_state=jsonb_set(provider_state,'{live_queue_id}',to_jsonb($2::text)),updated_at=now() WHERE id=$1",[j.id,id]);
   await client.query('UPDATE social_automation_runs SET queue_id=$2,status=$3,updated_at=now() WHERE queue_id=$1',[j.id,id,'QUEUED']);
   if(j.platform!=='facebook')await client.query('COMMIT');
   res.json({success:true,id,state:result.state||'APPROVED'});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{if(locked)await client.query('SELECT pg_advisory_unlock(hashtext($1))',['publish-preview:'+req.params.id]).catch(()=>{});client.release()}
 }));
}
module.exports={mount};
