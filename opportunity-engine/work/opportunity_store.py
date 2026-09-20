"""Canonical persistence and audit context, kept separate from detailed engine state."""
import os,json
from datetime import datetime,timezone
from collections import defaultdict,Counter
import psycopg2
from psycopg2.extras import RealDictCursor,Json
from dotenv import load_dotenv
from opportunity_state import classify
load_dotenv('/home/opc/imali-work-agent/.env')
def db():return psycopg2.connect(os.getenv('WORK_AGENT_DB_DSN','dbname=imali user=sniperuser host=localhost'))
def snapshot(conn):
    cur=conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('SELECT * FROM developer_opportunities ORDER BY id'); rows=cur.fetchall(); ctx=defaultdict(dict)
    for table,key in [('opportunity_operations','operation'),('contact_discovery_attempts','contact'),('reward_opportunity_analysis','reward'),('reward_prototypes','prototype'),('opportunity_research','research')]:
        cur.execute('SELECT * FROM '+table)
        for r in cur.fetchall():ctx[r['opportunity_id']][key]=dict(r)
    cur.execute('SELECT * FROM opportunity_engine_attempts')
    for r in cur.fetchall():ctx[r['opportunity_id']].setdefault('attempts',{})[r['action']]=dict(r)
    cur.execute('SELECT * FROM opportunity_provider_candidates')
    for r in cur.fetchall():ctx[r['opportunity_id']].setdefault('providers',[]).append(dict(r))
    seen={}
    for d in rows:
        # Exact source identity only; companies with multiple roles are not duplicates.
        key=(d.get('source'),d.get('source_id'))
        if all(key):
            if key in seen:ctx[d['id']]['duplicate_of']=seen[key]
            else:seen[key]=d['id']
    return rows,ctx

def reconcile(conn=None):
    own=conn is None;conn=conn or db();rows,contexts=snapshot(conn);cur=conn.cursor();counts=Counter()
    for d in rows:
        state=classify(d,contexts[d['id']]);old=contexts[d['id']].get('operation') or {};counts[state['operational_state']]+=1
        if d.get('revenue_path')=='managed_delivery' or d.get('fulfillment_path')=='subcontractor':
            ps=contexts[d['id']].get('providers') or []
            state['provider_stage']=state.get('provider_stage') or ('Provider Approved' if any(p.get('decision')=='approved' for p in ps) else 'Candidates Found' if ps else 'Needs Provider' if d.get('fulfillment_path')=='subcontractor' or d.get('delegation_status')=='needs_contractor' else 'Delivery Analysis')
        fields=list(state);values=[Json(v,dumps=lambda x:json.dumps(x,default=str)) if isinstance(v,(dict,list)) else v for v in state.values()]
        extra={}
        if state['operational_state']=='DISPOSED' and old.get('operational_state')!='DISPOSED':
            extra=dict(disposed_at=datetime.now(timezone.utc),disposed_by='canonical_classifier',previous_state=old or {k:d.get(k) for k in ['pursuit_status','application_status','outreach_status','execution_status']})
        for k,v in extra.items():fields.append(k);values.append(Json(v,dumps=lambda x:json.dumps(x,default=str)) if isinstance(v,dict) else v)
        # Retain disposition provenance on restore so unchanged evidence cannot silently redispose.
        if old.get('restored_at') and state['operational_state']!='DISPOSED':
            for k in ('disposition_reason','disposition_evidence'):
                i=fields.index(k);values[i]=Json(old[k],dumps=lambda x:json.dumps(x,default=str)) if isinstance(old.get(k),dict) else old.get(k)
        cur.execute('INSERT INTO opportunity_operations (opportunity_id,'+','.join(fields)+') VALUES (%s,'+','.join(['%s']*len(fields))+') ON CONFLICT(opportunity_id) DO UPDATE SET '+','.join(k+'=EXCLUDED.'+k for k in fields)+',updated_at=now()', [d['id']]+values)
    conn.commit()
    if own:conn.close()
    return dict(counts)
if __name__=='__main__':print(json.dumps(reconcile()))
