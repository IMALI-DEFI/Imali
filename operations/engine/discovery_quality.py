"""Quality gates for new discoveries; existing records and authorizations are untouched."""
from datetime import datetime, timezone
from opportunity_funnel import date, identity, evaluate

def reject_reason(row,processed,seen,now=None):
    now=now or datetime.now(timezone.utc)
    if not row.get('source_id') or not row.get('source') or not row.get('title'):return 'missing_identity'
    if identity(row) in seen:return 'duplicate'
    due=date(row.get('solicitation_due_at') or row.get('procurement_deadline'))
    if due and due<=now:return 'expired'
    if row.get('procurement_stage') in ('award','cancelled','closed'):return 'closed'
    government=str(row.get('source')).startswith(('sam_gov','state_local_')) or processed.get('procurement_opportunity') is True
    if government:return None # Procurement has its own evidence/eligibility gate downstream.
    posted=date(row.get('source_posted_at'));employment=processed.get('opportunity_type')=='employment'
    if employment and posted and (now-posted).days>180:return 'stale'
    if processed.get('eligibility_status') in ('ineligible','failed'):return 'ineligible'
    if processed.get('demand_confidence',0)<50 or max(processed.get('personal_fit',0),processed.get('business_value',0))<60:return 'existing_quality_threshold'
    if not (row.get('url') or row.get('application_url') or row.get('contact_url') or row.get('outreach_contact_email')):return 'missing_action_path'
    return None

def choose_source(cycle,rows,contexts,names):
    # One bounded source per invocation. Every fifth cycle explores deterministically;
    # the other cycles favor evidence of actionable quality and genuine downstream outcomes.
    if cycle%5==0:return names[(cycle//5)%len(names)]
    scores={}
    for name in names:
        samples=[evaluate(d,contexts.get(d['id'])) for d in rows if d.get('source')==name]
        n=len(samples);good=sum(x['actionable'] for x in samples);sent=sum(x['sent'] for x in samples);replies=sum(x['reply'] for x in samples);wins=sum(x['won'] for x in samples)
        scores[name]=(good+2*sent+4*replies+8*wins+2)/(n+10)
    # Deterministic weighted allocation prevents a single unproven source monopolizing discovery.
    total=sum(scores.values());point=((cycle*0.61803398875)%1)*total
    for name in names:
        point-=scores[name]
        if point<=0:return name
    return names[-1]
