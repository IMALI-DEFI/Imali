'use strict';
// Actual PostgreSQL-backed integration checks. All writes roll back. No publisher is called.
const fs=require('fs'),assert=require('assert/strict');
const root='/home/opc/imali-sniper';
const {Pool}=require(root+'/node_modules/pg');
const db=new Pool(process.env.TEST_DB_PEER==='1'?{host:'/var/run/postgresql',user:'postgres',database:'imali'}:{connectionString:require(root+'/node_modules/dotenv').parse(fs.readFileSync('/etc/imali-marketing.env')).DATABASE_URL});
(async()=>{const c=await db.connect();try{await c.query('BEGIN');
const sql=fs.readFileSync(__dirname+'/../deployment/destinations.sql','utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');await c.query(sql);
const founder=(await c.query("SELECT brand,platform,connection_status FROM social_connections_v1 WHERE brand='founder'")).rows;assert.equal(founder.length,2);assert(founder.every(x=>x.connection_status==='DISCONNECTED'));
const Q=require('../social/automation-queue');await assert.rejects(()=>Q.enqueueThreads(c,{brand:'imali',contentType:'stock',slotKey:'integration-not-published',mediaUrl:'https://api.imali-defi.com/api/blog/images/x.png',caption:'No publish'}),/THREADS_OAUTH_REQUIRED|THREADS_CONTROLLED_TEST_REQUIRED/);
const table=(await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='social_queue_v1'")).rows;assert(!table.some(x=>x.column_name==='approved_at'));
assert(!fs.readFileSync(__dirname+'/../social/automation-queue.js','utf8').includes('approved_at'));
const preview=require('../social/automation-preview');const input={brand:'imali',platform:'instagram',contentType:'stock',slotKey:'integration-not-published',mediaUrl:'https://api.imali-defi.com/api/blog/images/x.png',caption:'No publish'};const a=await preview.enqueue(c,input),b=await preview.enqueue(c,input);assert.equal(a.id,b.id);const row=(await c.query('SELECT * FROM social_queue_v1 WHERE id=$1',[a.id])).rows[0];assert.equal(row.state,'DRAFT');assert.equal(row.approved_by,null);assert.equal(row.provider_state.preparation_only,true);
const normal=require('../social/center').normalize;const auto=normal({id:'x',brand:'imali',state:'POSTING',content:{caption:'x'},provider_state:{step:'PROCESSING'},approved_by:'admin'});assert.equal(auto.status,'SCHEDULED');assert.equal(auto.editable,false);assert.equal(auto.manual_allowed,false);assert.equal(auto.error,null);
console.log(JSON.stringify({success:true,database:'actual PostgreSQL',transaction:'rolled back',founder_destinations:2,threads_gated:true,idempotent_preview:true,external_publish_calls:0}));
}finally{await c.query('ROLLBACK');c.release();await db.end()}})().catch(e=>{console.error(e.code||e.message);process.exitCode=1});
