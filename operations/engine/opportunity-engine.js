'use strict';
const express = require('express');
const {execFile} = require('child_process');
const router = express.Router();
const BASE = `SELECT d.*, COALESCE(o.operational_state,'AUTO_PROCESSING') AS operational_state,
 COALESCE(o.lane,CASE WHEN d.source LIKE 'sam_gov%' OR d.source LIKE 'state_local_%' THEN 'Government' WHEN d.revenue_path='employment' THEN 'Employment' WHEN d.revenue_path='reward' THEN 'Rewards' WHEN d.revenue_path='asset_recovery' THEN 'Recovery' ELSE 'Commercial' END) AS lane,
 COALESCE(o.next_machine_action,CASE WHEN o.opportunity_id IS NULL THEN 'classification' END) AS next_machine_action,
 o.next_human_action,o.blocker_type,o.blocker_reason,o.next_retry_at,o.final_approval_type,o.workbench_stage,o.provider_stage,
 o.completion_type,o.disposition_reason,o.disposition_evidence,o.disposed_at,o.disposed_by,o.previous_state,o.approval_status,
 o.evidence,o.updated_at AS operational_updated_at,
 (SELECT count(*)::int FROM opportunity_provider_candidates pc WHERE pc.opportunity_id=d.id) AS provider_candidates
 FROM developer_opportunities d LEFT JOIN opportunity_operations o ON o.opportunity_id=d.id`;
const metrics = {
 retry_backoff:"operational_state='AUTO_PROCESSING' AND next_retry_at>now()",total:'TRUE', AUTO_PROCESSING:"operational_state='AUTO_PROCESSING'", ACTION_REQUIRED:"operational_state='ACTION_REQUIRED'",
 BLOCKED_EXTERNAL:"operational_state='BLOCKED_EXTERNAL'", DISPOSED:"operational_state='DISPOSED'", COMPLETED:"operational_state='COMPLETED'",
 commercial_sent:"(outreach_sent_at IS NOT NULL OR outreach_status='sent')",
 applications_submitted:"(application_submitted_at IS NOT NULL OR automation_status='submitted')",
 bids_submitted:"procurement_submission_at IS NOT NULL",
 reward_submissions:"EXISTS(SELECT 1 FROM reward_opportunity_analysis r WHERE r.opportunity_id=e.id AND r.submitted_at IS NOT NULL)",
 won:"(pipeline_stage='won' OR pursuit_status='won' OR response_status='won')",
 actual_revenue:'actual_revenue>0',estimated_pipeline:"operational_state NOT IN ('DISPOSED','COMPLETED') AND estimated_revenue>0",
 managed_delivery:"revenue_path='managed_delivery'",needs_provider:"provider_stage='Needs Provider' AND operational_state NOT IN ('DISPOSED','COMPLETED')",
 provider_candidates_found:'provider_candidates>0',commercial_final_approvals:"operational_state='ACTION_REQUIRED' AND final_approval_type='COMMERCIAL_OUTREACH'",
 government_final_bid_approvals:"operational_state='ACTION_REQUIRED' AND final_approval_type='GOVERNMENT_BID'",
 procurement_qualified:"EXISTS(SELECT 1 FROM opportunity_research r WHERE r.opportunity_id=e.id AND r.scope_retrieved AND r.eligibility_verified) AND operational_state<>'DISPOSED'",
 procurement_package_ready:"EXISTS(SELECT 1 FROM opportunity_research r WHERE r.opportunity_id=e.id AND r.package_path IS NOT NULL AND r.eligibility_verified AND r.requirements->>'package_readiness_verified'='true') AND operational_state<>'DISPOSED'",
 procurement_blocked_documents:"lane='Government' AND operational_state='BLOCKED_EXTERNAL' AND blocker_type='MISSING_OFFICIAL_DOCUMENT'",
 subcontractor_final_approvals:"operational_state='ACTION_REQUIRED' AND final_approval_type='PROVIDER_SELECTION'",
 reward_approvals:"operational_state='ACTION_REQUIRED' AND lane='Rewards'"
};
function filter(q){
 const clauses=[];const args=[];
 if(q.government_only==='1')clauses.push("(source LIKE 'sam_gov%' OR source LIKE 'state_local_%' OR opportunity_type='procurement')");
 if(q.exclude_employment==='1')clauses.push("lane<>'Employment'");
 if(q.exclude_terminal==='1')clauses.push("operational_state NOT IN ('DISPOSED','COMPLETED')");
 if(q.metric){if(!metrics[q.metric])throw Error('Unknown metric');clauses.push(metrics[q.metric]);}
 for(const key of ['operational_state','lane','blocker_type','disposition_reason','next_machine_action','workbench_stage','provider_stage']){
  if(q[key]){args.push(q[key]);clauses.push(`${key}=$${args.length}`);}
 }
 if(q.search){args.push('%'+String(q.search).slice(0,200)+'%');clauses.push(`(company ILIKE $${args.length} OR title ILIKE $${args.length} OR id::text ILIKE $${args.length})`);}
 return {where:clauses.length?clauses.join(' AND '):'TRUE',args};
}
module.exports=function(pool){
 router.get('/funnel',async(req,res)=>{
  execFile('/home/opc/imali-work-agent/venv/bin/python',['/home/opc/imali-work-agent/opportunity_funnel.py'],{timeout:20000,maxBuffer:4*1024*1024},(error,out)=>{
   if(error)return res.status(503).json({error:'FUNNEL_EVIDENCE_UNAVAILABLE'});
   try{res.set('Cache-Control','no-store');res.json(JSON.parse(out));}catch{return res.status(503).json({error:'FUNNEL_RESPONSE_INVALID'});}
  });
 });
 router.get('/health',async(req,res)=>{
  const call=(file,args)=>new Promise(resolve=>execFile(file,args,{timeout:5000,maxBuffer:64000},(err,out)=>resolve(String(out||'').trim())));
  const unit=async name=>{const schedule=name.endsWith('.timer')?await call('/usr/bin/systemctl',['list-timers','--all','--no-legend','--no-pager',name]):'';const raw=await call('/usr/bin/systemctl',['show',name,'--property=ActiveState,SubState,UnitFileState,NextElapseUSecRealtime,Result']);return {unit:name,next_scheduled:schedule.match(/^\w+ \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \w+/)?.[0]||null,...Object.fromEntries(raw.split('\n').filter(x=>x.includes('=')).map(x=>[x.slice(0,x.indexOf('=')),x.slice(x.indexOf('=')+1)]))};};
  try{
   const [timers,services,disk]=await Promise.all([
    Promise.all(['imali-opportunity-autopilot.timer','imali-opportunity-slow.timer'].map(unit)),
    Promise.all(['trading-executor.service','imali-telegram.service','okx-spot-bot.service','imali-work-agent.timer','imali-work-pipeline.timer','imali-work-email.service','imali-work-followup.service'].map(unit)),
    call('/usr/bin/df',['-h','/'])]);
   const fs=require('fs');const env=fs.readFileSync('/home/opc/imali-work-agent/.env','utf8');const outbound={};
   for(const key of ['OUTREACH_SEND_ENABLED','RFQ_SEND_LIVE','APPLICATION_AUTO_SUBMIT'])outbound[key]=env.match(new RegExp('^'+key+'=(.*)$','m'))?.[1]||'UNAVAILABLE';
   const diskRaw=await call('/usr/bin/df',['-Pk','/']);const parts=diskRaw.split('\n').pop().trim().split(/\s+/);const usedPercent=Number(String(parts[4]).replace('%',''));const freeBytes=Number(parts[3])*1024;res.json({timers,services,disk,outbound,resource_guard:{status:usedPercent<89&&freeBytes>=3221225472?'passed':'blocked',used_percent:usedPercent,free_bytes:freeBytes,max_disk_percent:89,min_free_bytes:3221225472}});
  }catch(e){res.status(500).json({error:'Health inspection unavailable'});}
 });
 router.get('/summary',async(req,res)=>{
  const c=await pool.connect();
  try{
   await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   const counts=(await c.query(`WITH e AS (${BASE}) SELECT ${Object.entries(metrics).map(([key,condition])=>`count(*) FILTER(WHERE ${condition})::int AS "${key}"`).join(',')},
   COALESCE(sum(actual_revenue),0) AS actual_revenue_amount,
   COALESCE(sum(estimated_revenue) FILTER(WHERE ${metrics.estimated_pipeline}),0) AS estimated_pipeline_amount FROM e`)).rows[0];
   const groups={};
   for(const [name,column,condition] of [
    ['action_required','lane',"operational_state='ACTION_REQUIRED'"],['blocked','blocker_type',"operational_state='BLOCKED_EXTERNAL'"],
    ['disposed','disposition_reason',"operational_state='DISPOSED'"],['autopilot','next_machine_action',"operational_state='AUTO_PROCESSING'"],
    ['government','workbench_stage',"(source LIKE 'sam_gov%' OR source LIKE 'state_local_%' OR opportunity_type='procurement')"],['subcontractor','provider_stage',"provider_stage IS NOT NULL AND operational_state NOT IN ('DISPOSED','COMPLETED')"]]){
    groups[name]=(await c.query(`WITH e AS (${BASE}) SELECT ${column} AS label,count(*)::int AS count FROM e WHERE ${condition} GROUP BY ${column} ORDER BY count(*) DESC`)).rows;
   }
   const recovery=(await c.query(`SELECT (SELECT count(*)::int FROM recovery_opportunities) AS cases, count(*)::int AS jurisdictions,
   count(*) FILTER(WHERE verified AND reviewer_status='APPROVED')::int AS verified,
   count(*) FILTER(WHERE NOT verified OR reviewer_status<>'APPROVED')::int AS compliance_locked FROM recovery_jurisdiction_research`)).rows[0];
   const cycles=(await c.query('SELECT DISTINCT ON(lane) * FROM opportunity_cycle_runs ORDER BY lane,started_at DESC')).rows;
   const candidates=(await c.query('SELECT count(*)::int AS total,count(*) FILTER(WHERE verification_status=\'verified\')::int AS verified FROM opportunity_provider_candidates')).rows[0];
   await c.query('COMMIT');res.json({success:true,counts,groups,recovery,cycles,candidates,as_of:new Date().toISOString(),estimated_pipeline_label:'POTENTIAL — NOT EARNED (existing model estimates)'});
  }catch(e){await c.query('ROLLBACK');res.status(500).json({error:e.message});}finally{c.release();}
 });
 router.get('/records',async(req,res)=>{
  try{const {where,args}=filter(req.query);const limit=Math.min(100,Math.max(1,Number(req.query.limit)||30));const offset=Math.max(0,Number(req.query.offset)||0);
   const total=(await pool.query(`WITH e AS (${BASE}) SELECT count(*)::int AS total FROM e WHERE ${where}`,args)).rows[0].total;
   const items=(await pool.query(`WITH e AS (${BASE}) SELECT * FROM e WHERE ${where}
   ORDER BY COALESCE(solicitation_due_at,procurement_deadline) ASC NULLS LAST,estimated_revenue DESC NULLS LAST,
   (final_approval_type IS NOT NULL) DESC,execution_verified DESC,discovered_at ASC,id ASC LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,limit,offset])).rows;
   res.json({success:true,total,displayed:items.length,offset,items});
  }catch(e){res.status(400).json({error:e.message});}
 });
 router.get('/recovery',async(req,res)=>{
  try{const condition=req.query.state==='verified'?"verified AND reviewer_status='APPROVED'":req.query.state==='compliance_locked'?"NOT verified OR reviewer_status<>'APPROVED'":'TRUE';
   res.json({success:true,items:(await pool.query('SELECT * FROM recovery_jurisdiction_research WHERE '+condition+' ORDER BY jurisdiction')).rows});
  }catch(e){res.status(500).json({error:e.message});}
 });
 router.get('/records/:id',async(req,res)=>{
  try{const id=Number(req.params.id);const row=(await pool.query(`WITH e AS (${BASE}) SELECT * FROM e WHERE id=$1`,[id])).rows[0];if(!row)return res.status(404).json({error:'Not found'});
   const extra={};for(const [key,table] of [['providers','opportunity_provider_candidates'],['research','opportunity_research'],['attempts','opportunity_engine_attempts'],['history','opportunity_transitions'],['reward','reward_opportunity_analysis']])extra[key]=(await pool.query(`SELECT * FROM ${table} WHERE opportunity_id=$1 ${key==='history'?'ORDER BY id DESC LIMIT 30':''}`,[id])).rows;
   res.json({success:true,item:row,...extra});
  }catch(e){res.status(500).json({error:e.message});}
 });
 router.post('/records/:id/decision',async(req,res)=>{
  const c=await pool.connect();
  try{
   const id=Number(req.params.id);const {action,note,subject,message,provider_id}=req.body||{};
   const actor=String(req.user?.id||req.userId||req.user?.email||'authenticated-admin');
   if(!['approve','edit','dispose','restore','provider_approve','eligibility_confirm','registration_confirm','dependency_resolved','package_confirm'].includes(action))return res.status(400).json({error:'Unsupported action'});
   await c.query('BEGIN');await c.query("SELECT set_config('imali.actor',$1,true),set_config('imali.engine','admin_decision',true),set_config('imali.reason',$2,true)",[actor,String(note||action).slice(0,4000)]);
   const o=(await c.query('SELECT * FROM opportunity_operations WHERE opportunity_id=$1 FOR UPDATE',[id])).rows[0];if(!o)throw Error('Classify opportunity before taking action');
   if(o.operational_state==='COMPLETED')throw Error('Historical completion cannot be overwritten');
   if(action==='dispose'){
    if(!String(note||'').trim())throw Error('A disposition reason is required');
    await c.query(`UPDATE opportunity_operations SET previous_state=to_jsonb(opportunity_operations),operational_state='DISPOSED',disposition_reason='HUMAN_REJECTED',disposition_evidence=$2,disposed_at=now(),disposed_by=$3,next_machine_action=NULL,next_human_action=NULL,next_retry_at=NULL,updated_at=now() WHERE opportunity_id=$1`,[id,{reason:note},actor]);
   }else if(action==='restore'){
    if(o.operational_state!=='DISPOSED'&&o.operational_state!=='BLOCKED_EXTERNAL')throw Error('Only disposed or blocked records can be reopened');
    await c.query(`UPDATE opportunity_operations SET operational_state='AUTO_PROCESSING',next_machine_action=CASE WHEN lane='Government' THEN 'procurement_research' ELSE 'target_resolution' END,next_human_action=NULL,blocker_type=NULL,blocker_reason=NULL,next_retry_at=now(),restored_at=now(),approval_status=NULL,updated_at=now() WHERE opportunity_id=$1`,[id]);
    await c.query("UPDATE opportunity_engine_attempts SET result='retry',attempts=0,next_retry_at=now() WHERE opportunity_id=$1",[id]);
   }else if(action==='edit'){
    if(o.final_approval_type!=='COMMERCIAL_OUTREACH'||o.operational_state!=='ACTION_REQUIRED')throw Error('Only prepared commercial decisions can be edited');
    if(!String(subject||'').trim()||!String(message||'').trim())throw Error('Subject and message are required');
    await c.query('UPDATE developer_opportunities SET outreach_subject=$2,outreach_body=$3 WHERE id=$1 AND outreach_sent_at IS NULL',[id,String(subject).slice(0,1000),String(message).slice(0,30000)]);
    await c.query("UPDATE opportunity_operations SET approval_status=NULL,evidence=evidence || jsonb_build_object('edited_by',$2::text,'edited_at',now()),updated_at=now() WHERE opportunity_id=$1",[id,actor]);
   }else if(action==='dependency_resolved'){
    if(o.operational_state!=='BLOCKED_EXTERNAL'||!String(note||'').trim())throw Error('Describe the externally resolved dependency');
    await c.query("UPDATE developer_opportunities SET automation_status=CASE WHEN automation_status IN ('captcha_required','anti_bot_required','auth_required','login_required','2fa_required') THEN 'pending' ELSE automation_status END WHERE id=$1",[id]);
    await c.query("UPDATE opportunity_engine_attempts SET attempts=0,result='retry',next_retry_at=now() WHERE opportunity_id=$1",[id]);
    if(o.lane==='Rewards')await c.query("UPDATE reward_opportunity_analysis SET participation_status='unknown',participation_reason='Human reported resolved dependency; authoritative recheck required' WHERE opportunity_id=$1 AND submitted_at IS NULL",[id]);
    await c.query("UPDATE opportunity_operations SET operational_state='AUTO_PROCESSING',next_machine_action=CASE WHEN lane='Government' THEN 'procurement_research' ELSE 'target_resolution' END,next_human_action=NULL,next_retry_at=now(),blocker_type=NULL,blocker_reason=NULL,updated_at=now() WHERE opportunity_id=$1",[id]);
   }else if(action==='registration_confirm'){
    if(o.blocker_type!=='REGISTRATION_REQUIRED'||!String(note||'').trim())throw Error('Official registration evidence required');
    await c.query("UPDATE developer_opportunities SET procurement_registration_required=false,procurement_reason=concat_ws(E'\n',procurement_reason,$2) WHERE id=$1",[id,'Human-verified registration: '+note]);
    await c.query("UPDATE opportunity_operations SET operational_state='AUTO_PROCESSING',next_machine_action='procurement_package',next_human_action=NULL,next_retry_at=now(),blocker_type=NULL,blocker_reason=NULL,updated_at=now() WHERE opportunity_id=$1",[id]);
   }else if(action==='package_confirm'){
    if(o.final_approval_type!=='GOVERNMENT_PACKAGE_DOCUMENTS'||!String(note||'').trim())throw Error('Review actual required documents and provide their evidence');
    await c.query("UPDATE opportunity_research SET requirements=requirements || jsonb_build_object('package_readiness_verified',true,'package_document_evidence',$2::text,'package_reviewer',$3::text),updated_at=now() WHERE opportunity_id=$1 AND package_path IS NOT NULL AND eligibility_verified AND scope_retrieved",[id,note,actor]);
    await c.query("UPDATE opportunity_operations SET operational_state='AUTO_PROCESSING',next_machine_action='procurement_package',next_human_action=NULL,next_retry_at=now(),final_approval_type=NULL,updated_at=now() WHERE opportunity_id=$1",[id]);
   }else if(action==='eligibility_confirm'){
    if(o.final_approval_type==='ELIGIBILITY'){
     if(!String(note||'').trim())throw Error('Eligibility evidence required');
     await c.query("UPDATE developer_opportunities SET eligibility_status='eligible',eligibility_reason=$2,eligibility_checked_at=now() WHERE id=$1",[id,'Human-verified eligibility: '+note]);
     await c.query("UPDATE opportunity_operations SET operational_state='AUTO_PROCESSING',next_machine_action='verification',next_human_action=NULL,final_approval_type=NULL,next_retry_at=now(),updated_at=now() WHERE opportunity_id=$1",[id]);
    }else{
    if(o.final_approval_type!=='GOVERNMENT_ELIGIBILITY'||!String(note||'').trim())throw Error('Official eligibility review and evidence are required');
    await c.query("UPDATE opportunity_research SET eligibility_verified=true,eligibility_evidence=jsonb_build_object('reviewer',$2::text,'evidence',$3::text,'at',now()) WHERE opportunity_id=$1 AND scope_retrieved AND official_verified",[id,actor,note]);
    await c.query("UPDATE opportunity_operations SET operational_state='AUTO_PROCESSING',next_machine_action='procurement_package',next_human_action=NULL,final_approval_type=NULL,next_retry_at=now(),updated_at=now() WHERE opportunity_id=$1",[id]);
    }
   }else if(action==='provider_approve'){
    if(o.final_approval_type!=='PROVIDER_SELECTION')throw Error('Provider verification must finish first');
    const p=await c.query("UPDATE opportunity_provider_candidates SET decision='approved',decided_by=$3,decided_at=now() WHERE opportunity_id=$1 AND id=$2 AND verification_status='verified' RETURNING id",[id,Number(provider_id),actor]);if(!p.rowCount)throw Error('Verified candidate required');
    await c.query("UPDATE opportunity_operations SET operational_state='AUTO_PROCESSING',next_machine_action='procurement_package',next_human_action=NULL,provider_stage='Provider Approved',final_approval_type=NULL,next_retry_at=now(),updated_at=now() WHERE opportunity_id=$1",[id]);
   }else{
    if(o.operational_state!=='ACTION_REQUIRED'||!['COMMERCIAL_OUTREACH','GOVERNMENT_BID','EMPLOYMENT_APPLICATION','REWARD_ENTRY','REWARD_SUBMISSION'].includes(o.final_approval_type))throw Error('This item is not at final approval');
    await c.query("UPDATE opportunity_operations SET approval_status='approved',approved_by=$2,approved_at=now(),operational_state='BLOCKED_EXTERNAL',next_machine_action=NULL,next_human_action=NULL,blocker_type='OTHER',blocker_reason='Preparation approved. Separate explicit external execution authorization required.',updated_at=now() WHERE opportunity_id=$1",[id,actor]);
   }
   await c.query('INSERT INTO human_attention_actions(opportunity_id,issue_type,action,note) VALUES($1,$2,$3,$4)',[id,'canonical_decision',action,String(note||action)]);
   await c.query('COMMIT');res.json({success:true,message:'Decision recorded. No external action was performed.'});
  }catch(e){await c.query('ROLLBACK');res.status(409).json({error:e.message});}finally{c.release();}
 });
 return router;
};
module.exports.metrics=metrics;
