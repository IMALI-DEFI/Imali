#!/usr/bin/env python3
"""Resource-bounded orchestration of existing preparation engines. No execution engine."""
import os,sys,json,time,subprocess
from datetime import datetime,timezone,timedelta
from psycopg2.extras import RealDictCursor,Json
from opportunity_store import db,reconcile,snapshot
from opportunity_scoped_engine import ALLOWED
from opportunity_research_engine import procurement,target,providers,package

SLOW={'procurement_research','provider_research','provider_verification','reward_enrichment','reward_fit','reward_research','reward_participation','reward_prototype_plan','reward_local_prototype','reward_quality'}

def save_attempt(conn,oid,action,result,reason,evidence):
    with conn.cursor() as cur:
        cur.execute('SELECT attempts FROM opportunity_engine_attempts WHERE opportunity_id=%s AND action=%s',(oid,action));r=cur.fetchone();count=(r[0] if r else 0)+1
        if result=='retry' and count>=3:result='exhausted'
        delay=timedelta(days=7) if result=='exhausted' else timedelta(minutes=min(1440,15*2**min(count-1,7)))
        cur.execute('''INSERT INTO opportunity_engine_attempts(opportunity_id,action,attempts,result,reason,evidence,last_attempt_at,next_retry_at)
        VALUES(%s,%s,%s,%s,%s,%s,now(),%s) ON CONFLICT(opportunity_id,action) DO UPDATE SET attempts=EXCLUDED.attempts,result=EXCLUDED.result,reason=EXCLUDED.reason,evidence=EXCLUDED.evidence,last_attempt_at=now(),next_retry_at=EXCLUDED.next_retry_at''',(oid,action,count,result,reason,Json(evidence),datetime.now(timezone.utc)+delay))
    conn.commit()

def native(conn,d,action):
    if action=='procurement_research':return procurement(conn,d)
    if action in ('target_resolution','contact_alternative'):return target(conn,d,action=='contact_alternative')
    if action in ('provider_research','provider_verification'):return providers(conn,d,action=='provider_verification')
    if action=='procurement_package':return package(conn,d)
    if action=='queue_preparation':
        from pursuit_engine import build_pursuit,calculate_priority
        plan=build_pursuit(d)
        if not plan:return 'retry','Revenue-path classification must finish before queue preparation',{}
        priority=calculate_priority(d.get('personal_fit'),d.get('business_value'),d.get('demand_confidence'),d.get('revenue_path'))
        with conn.cursor() as cur:cur.execute("UPDATE developer_opportunities SET pursuit_status='queued',pursuit_priority=%s,pursuit_action=%s,pursuit_pitch=%s,queued_at=COALESCE(queued_at,now()) WHERE id=%s",(priority,plan['action'],plan['pitch'],d['id']))
        conn.commit();return 'progress','Existing pursuit preparation reused; no external action',{}
    if action=='classification':
        from work_agent import process_opportunity
        p=process_opportunity(dict(d));fields=['revenue_path','fulfillment_path','personal_fit','business_value','demand_confidence','opportunity_type','business_reason','matched_skills','imali_proof','generated_pitch']
        with conn.cursor() as cur:cur.execute('UPDATE developer_opportunities SET '+','.join(k+'=%s' for k in fields)+' WHERE id=%s',[Json(p[k]) if isinstance(p[k],list) else p[k] for k in fields]+[d['id']])
        conn.commit();return 'progress','Existing scoring and classification reused',{'revenue_path':p['revenue_path']}
    raise ValueError('No safe adapter for '+action)

def run(lane):
    conn=db();cur=conn.cursor(cursor_factory=RealDictCursor)
    # Transaction-independent advisory lock supplements the shared shell flock.
    cur.execute('SELECT pg_try_advisory_lock(716204981) AS acquired')
    if not cur.fetchone()['acquired']:print('skip: dispatcher already running');return
    cur.execute('INSERT INTO opportunity_cycle_runs(lane) VALUES(%s) RETURNING id',(lane,));cycle=cur.fetchone()['id'];conn.commit()
    start=time.monotonic();stages=[]
    try:
        reconcile(conn)
        # External dependencies are retried only at their recorded slow deadline.
        cur.execute("UPDATE opportunity_engine_attempts SET result='retry' WHERE result='exhausted' AND next_retry_at<=now()")
        conn.commit();reconcile(conn)
        cur.execute('''SELECT d.*,o.next_machine_action FROM developer_opportunities d JOIN opportunity_operations o ON o.opportunity_id=d.id
        WHERE o.operational_state='AUTO_PROCESSING' AND (o.next_retry_at IS NULL OR o.next_retry_at<=now())
        AND (o.next_machine_action=ANY(%s))=%s
        ORDER BY COALESCE(o.next_retry_at,d.discovered_at::timestamptz),d.pursuit_priority DESC,d.id LIMIT %s''',(list(SLOW),lane=='slow',20 if lane=='fast' else 10))
        rows=cur.fetchall()
        if os.getenv('OPPORTUNITY_CONTROLLED')=='1':
            cur.execute('''SELECT DISTINCT ON(o.lane) d.*,o.next_machine_action FROM developer_opportunities d JOIN opportunity_operations o ON o.opportunity_id=d.id
             WHERE o.operational_state='AUTO_PROCESSING' AND (o.next_retry_at IS NULL OR o.next_retry_at<=now())
             ORDER BY o.lane, CASE WHEN d.solicitation_due_at>now() THEN 0 ELSE 1 END, d.pursuit_priority DESC,d.id''')
            rows=cur.fetchall()
        # Provider preparation is a separate workstream; commercial introductory approval need not promise fulfillment.
        if lane=='slow' or os.getenv('OPPORTUNITY_CONTROLLED')=='1':
            cur.execute("""SELECT d.*,CASE WHEN EXISTS(SELECT 1 FROM opportunity_provider_candidates p WHERE p.opportunity_id=d.id) THEN 'provider_verification' ELSE 'provider_research' END AS next_machine_action
             FROM developer_opportunities d JOIN opportunity_operations o ON o.opportunity_id=d.id
             LEFT JOIN opportunity_engine_attempts a ON a.opportunity_id=d.id AND a.action=CASE WHEN EXISTS(SELECT 1 FROM opportunity_provider_candidates p WHERE p.opportunity_id=d.id) THEN 'provider_verification' ELSE 'provider_research' END
             WHERE (d.revenue_path='managed_delivery' OR d.fulfillment_path='subcontractor') AND o.operational_state NOT IN ('DISPOSED','COMPLETED')
             AND NOT EXISTS(SELECT 1 FROM opportunity_provider_candidates p WHERE p.opportunity_id=d.id AND p.verification_status='verified')
             AND (a.next_retry_at IS NULL OR a.next_retry_at<=now()) ORDER BY d.pursuit_priority DESC LIMIT 5""")
            rows+=cur.fetchall()
        for d in rows:
            if time.monotonic()-start>330:break
            action=d['next_machine_action'];oid=d['id']
            try:
                if action in ALLOWED and action!='queue_preparation':
                    before={k:str(v) for k,v in d.items() if k!='next_machine_action'}
                    cur.execute('SELECT row_to_json(r)::text AS snapshot FROM reward_opportunity_analysis r WHERE opportunity_id=%s',(oid,));reward_before=cur.fetchone()
                    cur.execute('SELECT row_to_json(p)::text AS snapshot FROM reward_prototypes p WHERE opportunity_id=%s',(oid,));prototype_before=cur.fetchone()
                    proc=subprocess.run([sys.executable,'opportunity_scoped_engine.py',action,json.dumps([oid])],capture_output=True,text=True,timeout=55,env=dict(os.environ,OUTREACH_SEND_ENABLED='false',RFQ_SEND_LIVE='0',APPLICATION_AUTO_SUBMIT='false'))
                    if action=='verification' and proc.returncode==0:
                        subprocess.run([sys.executable,'opportunity_scoped_engine.py','final_verification',json.dumps([oid])],capture_output=True,text=True,timeout=30)
                    cur.execute('SELECT * FROM developer_opportunities WHERE id=%s',(oid,));after=cur.fetchone()
                    changed=any(str(after[k])!=v for k,v in before.items())
                    cur.execute('SELECT row_to_json(r)::text AS snapshot FROM reward_opportunity_analysis r WHERE opportunity_id=%s',(oid,));reward_after=cur.fetchone()
                    cur.execute('SELECT row_to_json(p)::text AS snapshot FROM reward_prototypes p WHERE opportunity_id=%s',(oid,));prototype_after=cur.fetchone()
                    changed=changed or reward_before!=reward_after or prototype_before!=prototype_after
                    result='progress' if proc.returncode==0 and changed else 'retry'
                    reason='Existing preparation engine completed' if result=='progress' else 'Existing preparation engine did not advance this record'
                    if 'not configured' in proc.stderr or 'authentication' in proc.stderr.lower():result='credentials_required';reason='Required research credential is unavailable'
                    evidence={'engine':ALLOWED[action][0],'exit_code':proc.returncode,'output':proc.stdout[-1500:],'error_type':'engine_error' if proc.returncode else None}
                else:result,reason,evidence=native(conn,d,action)
            except Exception as exc:
                conn.rollback();result='retry';reason='Research failed: '+type(exc).__name__;evidence={'error_type':type(exc).__name__}
            save_attempt(conn,oid,action,result,reason,evidence);stages.append({'id':oid,'action':action,'result':result})
        if lane=='slow' and os.getenv('OPPORTUNITY_CONTROLLED')!='1' and time.monotonic()-start<280:
            discovery=subprocess.run([sys.executable,'opportunity_discovery.py',str(cycle)],capture_output=True,text=True,timeout=55)
            stages.append({'action':'discovery','result':'completed' if discovery.returncode==0 else 'retry','output':discovery.stdout[-1000:]})
        reconcile(conn)
        cur.execute("UPDATE opportunity_cycle_runs SET finished_at=now(),runtime_seconds=%s,result=%s,stages=%s WHERE id=%s",(round(time.monotonic()-start,2),'completed_with_retries' if any(s['result'] in ('retry','exhausted','credentials_required') for s in stages) else 'completed',Json(stages),cycle));conn.commit()
        print(json.dumps({'cycle':cycle,'lane':lane,'stages':stages}))
    except BaseException:
        conn.rollback();cur.execute("UPDATE opportunity_cycle_runs SET finished_at=now(),result='failed',runtime_seconds=%s WHERE id=%s",(round(time.monotonic()-start,2),cycle));conn.commit();raise
    finally:conn.close()
if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description='Bounded preparation-only opportunity dispatcher')
    parser.add_argument('lane',choices=('fast','slow'),nargs='?',default='fast')
    run(parser.parse_args().lane)
