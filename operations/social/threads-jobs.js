'use strict';
const crypto=require('node:crypto'),S=require('./security'),M=require('./threads-media');
function mount(router,{db,wrap,loadConfig}){
 router.post('/:brand/threads/media-tests',wrap(async(req,res)=>{
  const brand=req.params.brand;S.validate(brand,'threads');const {c}=loadConfig();if(c.threads_manual_test_enabled!==true)throw Error('THREADS_CONTROLLED_TEST_DISABLED');
  if(req.body.approve!==true||req.body.brand!==brand)throw Error('EXPLICIT_TEST_APPROVAL_REQUIRED');
  const content=await M.checkMedia(brand,req.body);const key=String(req.body.idempotency_key||'');if(!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw Error('IDEMPOTENCY_KEY_REQUIRED');
  const client=await db.connect();try{await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['threads-test:'+brand+key]);
   const prior=(await client.query("SELECT id,state,content FROM social_queue_v1 WHERE brand=$1 AND platform='threads' AND idempotency_key=$2",[brand,key])).rows[0];
   if(prior){if(JSON.stringify(prior.content)!==JSON.stringify(content)&&S.hash(JSON.stringify(Object.entries(prior.content).sort()))!==S.hash(JSON.stringify(Object.entries(content).sort())))throw Error('IDEMPOTENCY_CONTENT_MISMATCH');await client.query('COMMIT');return res.json({success:true,data:{id:prior.id,state:prior.state}})}
   const x=(await client.query("SELECT * FROM social_connections_v1 WHERE brand=$1 AND platform='threads' FOR SHARE",[brand])).rows[0];S.assertDestination(x,brand,'threads',String(req.body.account_id));if(x.connection_status!=='CONNECTED')throw Error('CONNECTION_NOT_CONFIRMED');
   const id=crypto.randomUUID();await client.query("INSERT INTO social_queue_v1(id,brand,platform,account_id,generation,state,content,approved_by,idempotency_key,provider_state) VALUES($1,$2,'threads',$3,$4,'APPROVED',$5,$6,$7,$8)",[id,brand,x.account_id,x.generation,content,String(req.user.id),key,{step:'NEW',controlled_test:true}]);await client.query('COMMIT');res.json({success:true,data:{id,state:'APPROVED'}});
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 }));
 router.post('/:brand/threads/media-tests/:id/advance',wrap(async(req,res)=>{
  if(req.body.approve!==true)throw Error('EXPLICIT_TEST_APPROVAL_REQUIRED');const j=(await db.query("SELECT account_id FROM social_queue_v1 WHERE id=$1 AND brand=$2 AND platform='threads'",[req.params.id,req.params.brand])).rows[0];if(!j||j.account_id!==req.body.account_id)throw Error('DESTINATION_MISMATCH');
  res.json({success:true,data:await require('../marketing/threads-worker').advance(db,req.params.id)});
 }));
}
module.exports={mount};
