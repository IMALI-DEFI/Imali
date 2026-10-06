"""Discovery only: existing sources, durable cooldowns, insert-only deduplication."""
import json, io, contextlib, sys
from collections import Counter
from datetime import datetime, timezone
from psycopg2.extras import Json
from opportunity_store import db, snapshot
from opportunity_funnel import identity, evaluate
from discovery_quality import reject_reason
from replenishment_policy import plan

FIELDS = ('source source_id source_thread_id source_posted_at source_age_days title company '
          'description url application_url application_email budget location score personal_fit '
          'business_value demand_confidence opportunity_type revenue_path fulfillment_path '
          'business_reason matched_skills imali_proof generated_pitch solicitation_due_at').split()

def insert_new(conn, row):
    values = [Json(row.get(k, [])) if k=='matched_skills' else row.get(k, 0) if k in
              ('score','personal_fit','business_value','demand_confidence') else row.get(k) for k in FIELDS]
    with conn.cursor() as cur:
        cur.execute('INSERT INTO developer_opportunities ('+','.join(FIELDS)+') VALUES ('+
                    ','.join(['%s']*len(FIELDS))+') ON CONFLICT (source,source_id) DO NOTHING RETURNING id', values)
        result = cur.fetchone()
        return result[0] if result else None

def run(dry_run=False):
    conn=db()
    try:
        cur=conn.cursor()
        cur.execute('SELECT pg_try_advisory_lock(716204983)')
        if not cur.fetchone()[0]:
            return {'result':'locked','external_actions':0}
        rows, contexts=snapshot(conn)
        disposed=sum((contexts[d['id']].get('operation') or {}).get('operational_state')=='DISPOSED' for d in rows)
        workable=sum(evaluate(d,contexts[d['id']])['actionable'] and
                     (contexts[d['id']].get('operation') or {}).get('operational_state')!='BLOCKED_EXTERNAL' for d in rows)
        cur.execute('SELECT source,max(started_at) FROM opportunity_replenishment_runs GROUP BY source')
        history=dict(cur.fetchall())
        # Reuse existing discovery history so deployment does not reset rate limits.
        cur.execute("SELECT finished_at,stages FROM opportunity_cycle_runs WHERE finished_at>now()-interval '7 days' ORDER BY id DESC LIMIT 1000")
        for when,stages in cur.fetchall():
            for stage in stages or []:
                if stage.get('action')!='discovery': continue
                for line in str(stage.get('output') or '').splitlines():
                    try: prior=json.loads(line)
                    except ValueError: continue
                    source=prior.get('source') if isinstance(prior,dict) else None
                    if source and when>history.get(source,datetime.min.replace(tzinfo=timezone.utc)):
                        history[source]=when
        cur.execute('SELECT COALESCE(sum(cardinality(new_ids)),0) FROM opportunity_replenishment_runs')
        decision=plan(disposed,cur.fetchone()[0],workable,history)
        if dry_run or not decision['source']:
            return dict(decision,result='dry_run' if dry_run else 'skipped',external_actions=0)
        source_name=decision['source']
        cur.execute('INSERT INTO opportunity_replenishment_runs(source,evidence) VALUES(%s,%s) RETURNING id',
                    (source_name,Json(decision)))
        run_id=cur.fetchone()[0]
        conn.commit()  # Persist attempted source before network I/O, including killed/failed runs.
        import requests
        from opportunity_research_engine import public_url
        original=requests.get
        calls=0
        def bounded(url,**kwargs):
            nonlocal calls
            public_url(url)
            calls+=1
            if calls>6: raise RuntimeError('Discovery request budget exceeded')
            kwargs.update(timeout=8,stream=True,allow_redirects=False)
            with original(url,**kwargs) as response:
                if 300<=response.status_code<400: raise RuntimeError('Redirect requires source review')
                chunks=[];size=0
                for part in response.iter_content(65536):
                    size+=len(part)
                    if size>5_000_000: raise RuntimeError('Discovery byte budget exceeded')
                    chunks.append(part)
                response._content=b''.join(chunks);response._content_consumed=True
                return response
        requests.get=bounded
        skipped=Counter();new_ids=[]
        try:
            from sources.business_opportunities import fetch_remotive
            from sources.remoteok import fetch_remoteok_jobs
            from sources.sam_gov import fetch_sam_gov
            from work_agent import process_opportunity
            sources={'business_contract_remotive':fetch_remotive,'remoteok':fetch_remoteok_jobs,'sam_gov':fetch_sam_gov}
            seen={identity(d) for d in rows}
            existing={(d.get('source'),str(d.get('source_id'))) for d in rows}
            candidates=[]
            # Existing source libraries can include credential-bearing URLs in errors.
            with contextlib.redirect_stdout(io.StringIO()):
                fetched=sources[source_name]()
            for row in fetched:
                if (row.get('source'),str(row.get('source_id'))) in existing:
                    skipped['duplicate']+=1;continue
                processed=process_opportunity(row)
                reason=reject_reason(row,processed,seen)
                if reason: skipped[reason]+=1;continue
                seen.add(identity(row));candidates.append(processed)
            candidates.sort(key=lambda d:evaluate(d)['rank'],reverse=True)
            for candidate in candidates[:decision['limit']]:
                oid=insert_new(conn,candidate)
                if oid is not None: new_ids.append(oid)
            evidence=dict(decision,requests=calls,skipped=dict(skipped),qualified_candidates=len(candidates),external_actions=0)
            cur.execute("UPDATE opportunity_replenishment_runs SET finished_at=now(),result='completed',new_ids=%s,evidence=%s WHERE id=%s",
                        (new_ids,Json(evidence),run_id))
            conn.commit()  # Inserts and replacement credits commit together.
            return dict(evidence,run_id=run_id,new_records=len(new_ids),new_ids=new_ids,result='completed')
        except Exception as exc:
            conn.rollback()
            cur.execute("UPDATE opportunity_replenishment_runs SET finished_at=now(),result='failed',evidence=evidence || %s WHERE id=%s",
                        (Json({'error_type':type(exc).__name__,'external_actions':0}),run_id))
            conn.commit()
            return {'run_id':run_id,'result':'failed','error_type':type(exc).__name__,'external_actions':0}
        finally:
            requests.get=original
    finally:
        conn.close()

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser()
    parser.add_argument('--dry-run',action='store_true')
    result=run(parser.parse_args().dry_run)
    print(json.dumps(result,default=str))
    sys.exit(1 if result.get("result")=="failed" else 0)
