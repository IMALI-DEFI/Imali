"""Run allowlisted existing preparation code against a bounded updatable temporary view.
The view excludes externally completed/disposed records even if a caller passes their IDs.
No sender/executor/submission code is allowed.
"""
import os,sys,runpy,json
import psycopg2
from dotenv import load_dotenv
load_dotenv('/home/opc/imali-work-agent/.env')
ALLOWED={
 'contact_discovery':('contact_discovery_engine.py',[]),
 'verification':('eligibility_execution_guard.py',[]),
 'final_verification':('final_execution_guard.py',[]),
 'outreach_preparation':('outreach_engine.py',['--prepare']),
 'resume_preparation':('resume_engine.py',[]),
 'application_package':('application_engine.py',['--prepare']),
 'queue_preparation':('pursuit_engine.py',['--build']),
 'reward_enrichment':('kaggle_reward_enrichment.py',[]),
 'reward_fit':('reward_fit_engine.py',[]),
 'reward_research':('reward_research_gate.py',[]),
 'reward_participation':('kaggle_participation_sync.py',[]),
 'reward_prototype_plan':('reward_prototype_planner.py',[]),
 'reward_local_prototype':('reward_prototype_runner.py',[]),
 'reward_quality':('reward_quality_guard.py',[]),
}
def main():
    action=sys.argv[1]; ids=json.loads(sys.argv[2]); assert action in ALLOWED and 0<len(ids)<=25
    os.environ.update(OUTREACH_SEND_ENABLED='false',RFQ_SEND_LIVE='0',APPLICATION_AUTO_SUBMIT='false',CONTACT_MAX_ATTEMPTS='3',CONTACT_FETCH_TIMEOUT_SECONDS='6',CONTACT_MAX_LINKED_PAGES='3',CONTACT_MAX_CONVENTIONAL_PAGES='3')
    if action=='reward_local_prototype':
        import resource,subprocess
        resource.setrlimit(resource.RLIMIT_FSIZE,(25*1024*1024,25*1024*1024))
        original_run=subprocess.run
        def bounded_run(*args,**kwargs):
            kwargs['timeout']=min(kwargs.get('timeout',45),45)
            return original_run(*args,**kwargs)
        subprocess.run=bounded_run
    original=psycopg2.connect
    def connect(*args,**kwargs):
        conn=original(*args,**kwargs)
        with conn.cursor() as cur:
            cur.execute("SELECT set_config('imali.engine',%s,false)",('scoped:'+action,))
            cur.execute("CREATE TEMP VIEW developer_opportunities AS SELECT d.* FROM public.developer_opportunities d WHERE d.id=ANY(%s) AND d.outreach_sent_at IS NULL AND COALESCE(d.outreach_status,'')<>'sent' AND d.application_submitted_at IS NULL AND d.procurement_submission_at IS NULL AND COALESCE(d.actual_revenue,0)=0 AND NOT EXISTS (SELECT 1 FROM public.opportunity_operations o WHERE o.opportunity_id=d.id AND o.operational_state IN ('DISPOSED','COMPLETED')) WITH CASCADED CHECK OPTION",(ids,))
        # Scope supporting reward tables too, since some existing guards do not join opportunities.
            for table in ('reward_opportunity_analysis','reward_execution_artifacts'):
                cur.execute('CREATE TEMP VIEW '+table+' AS SELECT * FROM public.'+table+' WHERE opportunity_id=ANY(%s) WITH CASCADED CHECK OPTION',(ids,))
        conn.commit();return conn
    psycopg2.connect=connect
    file,args=ALLOWED[action]; sys.argv=[file]+args
    if action=='verification':
        with original(os.getenv('WORK_AGENT_DB_DSN')) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT d.id,d.eligibility_reason FROM public.developer_opportunities d WHERE d.id=ANY(%s) AND d.eligibility_reason LIKE 'Human-verified eligibility:%%' AND EXISTS(SELECT 1 FROM human_attention_actions h WHERE h.opportunity_id=d.id AND h.issue_type='canonical_decision' AND h.action='eligibility_confirm')",(ids,))
                confirmed=dict(cur.fetchall())
        from pathlib import Path
        source=Path(file).read_text().replace('def determine_eligibility(row):','def determine_eligibility(row):\n    if row.get(\"id\") in CONFIRMED: return \"eligible\", CONFIRMED[row[\"id\"]]')
        exec(compile(source,file,'exec'),{'__name__':'__main__','__file__':file,'CONFIRMED':confirmed})
    elif action=='reward_participation':
        from pathlib import Path
        source=Path(file).read_text().replace('            \"list\",','            \"list\", \"--csv\",')
        start=source.index('    lines = ['); end=source.index('\n\nconn = get_db()',start)
        parser='''    import csv,io
    for row in csv.DictReader(io.StringIO(proc.stdout or '')):
        ref=row.get('ref','').rstrip('/')
        if ref.split('/')[-1] != slug: continue
        value=str(row.get('userHasEntered','')).lower()
        if value=='true': return 'entered','Authoritative userHasEntered column is true'
        if value=='false': return 'available_not_entered','Authoritative userHasEntered column is false; human entry required'
    return 'unknown','No exact competition participation field returned; fail closed'
'''
        exec(compile(source[:start]+parser+source[end:],file,'exec'),{'__name__':'__main__','__file__':file})
    elif action=='reward_research':
        # Dispatcher has already bounded and selected the research candidate. The old admission
        # thresholds must not silently leave lower-score records permanently unresearched.
        from pathlib import Path
        source=Path(file).read_text().replace('    AND r.technical_fit_score >= 70\n','').replace('    AND r.automation_potential >= 60\n','')
        exec(compile(source,file,'exec'),{'__name__':'__main__','__file__':file})
    else:
        runpy.run_path(file,run_name='__main__')
if __name__=='__main__':main()
