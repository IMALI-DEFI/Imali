"""Read-only funnel evidence and ranking. Never authorizes an external action."""
from collections import Counter, defaultdict
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import json, re

def date(v):
    if not v:return None
    try:
        d=v if isinstance(v,datetime) else datetime.fromisoformat(str(v).replace('Z','+00:00'))
        return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d
    except (ValueError,TypeError):return None

def canonical_url(value):
    try:
        u=urlsplit(str(value or '').strip())
        if u.scheme not in ('https','http') or not u.hostname or u.username or u.password:return ''
        q=[(k,v) for k,v in parse_qsl(u.query,keep_blank_values=True) if not k.lower().startswith('utm_') and k.lower() not in ('fbclid','gclid')]
        return urlunsplit((u.scheme,u.netloc.lower(),u.path.rstrip('/') or '/',urlencode(sorted(q)),''))
    except ValueError:return ''

def identity(d):
    u=canonical_url(d.get('application_url') or d.get('url'))
    # Homepages are not unique opportunity identities; different roles remain separate.
    if u and urlsplit(u).path not in ('','/') and not any(x in u for x in ('/search','/jobs?','/opportunities?')):return ('url',u,re.sub(r'\s+',' ',str(d.get('title') or '').strip().lower()),str(d.get('company') or '').strip().lower())
    return ('source',d.get('source'),str(d.get('source_id'))) if d.get('source_id') else ('id',d.get('id'))

def evaluate(d,c=None,now=None):
    c=c or {};now=now or datetime.now(timezone.utc);o=c.get('operation') or {};r=c.get('research') or {};reward=c.get('reward') or {}
    lane=o.get('lane') or ('Government' if str(d.get('source','')).startswith(('sam_gov','state_local_')) else 'Employment' if d.get('revenue_path')=='employment' else 'Rewards' if d.get('revenue_path')=='reward' else 'Recovery' if d.get('revenue_path')=='asset_recovery' else 'Commercial')
    deadline=date(d.get('solicitation_due_at') or d.get('procurement_deadline'));posted=date(d.get('source_posted_at'))
    expired=bool(deadline and deadline<now) or d.get('procurement_stage') in ('closed','cancelled','award')
    stale=expired or d.get('freshness_status') in ('stale','expired','closed') or bool(lane=='Employment' and posted and (now-posted).days>180)
    eligible=d.get('eligibility_status') not in ('ineligible','failed','disqualified')
    threshold=(d.get('demand_confidence') or 0)>=50 and max(d.get('personal_fit') or 0,d.get('business_value') or 0)>=60
    qualified=bool(r.get('scope_retrieved') and r.get('eligibility_verified')) if lane=='Government' else bool(reward.get('execution_ready')) if lane=='Rewards' else threshold and eligible and d.get('revenue_path') not in (None,'ignore','asset_recovery')
    path=bool(canonical_url(d.get('application_url')) or canonical_url(d.get('contact_url')) or d.get('outreach_contact_email'))
    verified=bool(d.get('execution_verified') and d.get('target_quality_status')=='verified')
    sent=bool(d.get('outreach_sent_at') or d.get('application_submitted_at') or d.get('procurement_submission_at') or reward.get('submitted_at'))
    reply=bool(d.get('response_received_at'));interview=bool(d.get('interview_at'));proposal=d.get('proposal_status') in ('sent','submitted','accepted')
    won=any(d.get(k)=='won' for k in ('pipeline_stage','pursuit_status','response_status'));lost=any(d.get(k)=='lost' for k in ('pipeline_stage','pursuit_status','response_status'))
    human=o.get('operational_state')=='ACTION_REQUIRED';ready=human and o.get('final_approval_type') in ('COMMERCIAL_OUTREACH','EMPLOYMENT_APPLICATION','GOVERNMENT_BID','PROVIDER_SELECTION','REWARD_SUBMISSION')
    approved=o.get('approval_status')=='approved' or bool(d.get('application_approved_at'))
    actionable=qualified and path and not stale and eligible and o.get('operational_state') not in ('DISPOSED','COMPLETED')
    reasons=[]
    if not qualified:reasons.append('Qualification evidence incomplete or below existing threshold')
    if not eligible:reasons.append('Documented eligibility failure')
    if stale:reasons.append('Expired or stale source evidence')
    if not path:reasons.append('Application/contact destination missing')
    if not verified:reasons.append('Execution destination needs verification')
    # Value is displayed separately, never used to turn speculative budgets into priority/revenue.
    rank=round(min(d.get('personal_fit') or 0,100)*.25+min(d.get('demand_confidence') or 0,100)*.25+(20 if path else 0)+(15 if verified else 0)+(10 if ready else 0)+(5 if posted and (now-posted).days<=30 else 0))
    if stale or not eligible or o.get('operational_state')=='DISPOSED':rank=0
    if not qualified:rank=min(rank,30)
    due=date(d.get('next_followup_at'));followup=bool(sent and due and due<now and not reply and not lost and not won)
    next_action=o.get('next_human_action') or o.get('next_machine_action') or o.get('blocker_reason') or ('Review source and qualification evidence' if not qualified else 'Verify destination and prepare a human-reviewed response')
    return dict(id=d.get('id'),source=d.get('source') or 'unknown',category=lane,title=d.get('title'),qualified=qualified,actionable=actionable,stale=stale,expired=expired,missing_contact=not path,eligibility_failure=not eligible,pursuit=d.get('pursuit_status')=='queued',needs_review=human,ready=ready,approved=approved,sent=sent,reply=reply,interview=interview,proposal=proposal,won=won,lost=lost,followup_overdue=followup,ready_unsent=ready and not sent,rank=rank,reasons=reasons or ['Meets recorded qualification; external action still requires its existing approval workflow'],next_action=next_action,estimated_value=float(d.get('estimated_revenue') or 0),realized_revenue=float(d.get('actual_revenue') or 0),verification_required=not verified)

STAGES=('qualified','pursuit','needs_review','ready','approved','sent','reply','interview','proposal','won','lost')
def aggregate(rows):
    n=len(rows);r={'discovered':n,**{k:sum(bool(x.get(k)) for x in rows) for k in STAGES+('actionable','duplicate','stale','expired','missing_contact','eligibility_failure','followup_overdue','ready_unsent')}}
    r.update(realized_revenue=round(sum(x['realized_revenue'] for x in rows),2),estimated_pipeline=round(sum(x['estimated_value'] for x in rows if x['qualified'] and not x['stale'] and not x['lost'] and not x['won']),2))
    r['rates']={k:round(100*r[k]/n,2) if n else 0 for k in ('qualified','actionable','duplicate','stale','missing_contact')}
    # Observed overlaps, not invented chronological transitions from mutable statuses.
    r['conversions']={f'{a}_to_{b}':round(100*sum(bool(x[a] and x[b]) for x in rows)/r[a],2) if r[a] else None for a,b in [('qualified','ready'),('ready','sent'),('approved','sent'),('sent','reply'),('reply','interview'),('reply','proposal'),('proposal','won')]}
    return r

def report(rows,contexts):
    result=[];seen={}
    for d in sorted(rows,key=lambda x:x['id']):
        x=evaluate(d,contexts.get(d['id']));key=identity(d);x['duplicate']=key in seen;x['duplicate_of']=seen.get(key);seen.setdefault(key,d['id'])
        if x['duplicate']:x['rank']=0;x['actionable']=False;x['reasons'].append('Repeated canonical opportunity URL or source identity')
        result.append(x)
    groups={}
    for field in ('source','category'):
        group=defaultdict(list)
        for x in result:group[x[field]].append(x)
        groups[field]=[dict(name=k,**aggregate(v)) for k,v in sorted(group.items())]
    return dict(as_of=datetime.now(timezone.utc).isoformat(),definitions={'qualified':'Existing fit/demand thresholds for commercial/employment; verified scope and eligibility for government; execution-ready evidence for rewards. Not authorization to submit.','sent':'Requires recorded submission/outreach timestamp; preparation status alone is not counted.','conversion':'Observed overlap among current records, not a historical cohort conversion rate.','estimated_pipeline':'Unverified estimates for qualified non-stale open records, not revenue.','stale':'Recorded closed/expired status or deadline; employment source posting older than 180 days. Missing posting dates are not invented.'},totals=aggregate(result),sources=groups['source'],categories=groups['category'],priorities=sorted(result,key=lambda x:(-x['rank'],x['id']))[:100],bottlenecks=Counter(reason for x in result for reason in x['reasons']),followups=[x for x in result if x['followup_overdue']][:100])

if __name__=='__main__':
    from opportunity_store import db,snapshot
    conn=db()
    try:
        conn.set_session(readonly=True);rows,contexts=snapshot(conn);print(json.dumps(report(rows,contexts),default=str))
    finally:conn.close()
