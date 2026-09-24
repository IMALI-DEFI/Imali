'use strict';
async function assertReady(db,brand){
 const x=(await db.query("SELECT account_id,generation,connection_status,token_expiration FROM social_connections_v1 WHERE brand=$1 AND platform='threads'",[brand])).rows[0];
 if(!x||x.connection_status!=='CONNECTED')throw Error('THREADS_OAUTH_REQUIRED');
 if(x.token_expiration&&new Date(x.token_expiration)<=new Date())throw Error('THREADS_TOKEN_EXPIRED');
 const test=(await db.query("SELECT id FROM social_queue_v1 WHERE brand=$1 AND platform='threads' AND account_id=$2 AND generation=$3 AND state='POSTED' AND platform_post_id IS NOT NULL AND public_url IS NOT NULL AND provider_state->>'controlled_test'='true' LIMIT 1",[brand,x.account_id,x.generation])).rows[0];
 if(!test)throw Error('THREADS_CONTROLLED_TEST_REQUIRED');return x;
}
module.exports={assertReady};
