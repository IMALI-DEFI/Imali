'use strict';
const crypto=require('node:crypto');
async function enqueue(client,{brand,platform,contentType,slotKey,mediaUrl,caption}){
 const b=require('./automation-queue').queueBrand(brand);
 const x=(await client.query('SELECT account_id,generation FROM social_connections_v1 WHERE brand=$1 AND platform=$2',[b,platform])).rows[0];
 if(!x)throw Error('DESTINATION_MISSING');
 const id=crypto.randomUUID(),key='preview_'+crypto.createHash('sha256').update(slotKey).digest('hex');
 const result=await client.query("INSERT INTO social_queue_v1(id,brand,platform,account_id,generation,state,content,idempotency_key,provider_state) VALUES($1,$2,$3,$4,$5,'DRAFT',$6,$7,$8) ON CONFLICT(brand,platform,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING id",[id,b,platform,x.account_id||'UNCONFIGURED',x.generation,{type:'image',caption,media_url:mediaUrl,content_type:contentType,slot_key:slotKey},key,{preparation_only:true,automation_preview:true,qualified:true,generated_at:new Date().toISOString()}]);
 return {id:result.rows[0].id,state:'DRAFT'};
}
module.exports={enqueue};
