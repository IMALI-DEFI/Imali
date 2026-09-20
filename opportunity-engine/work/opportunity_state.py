"""Pure canonical classification. No networking, writes, or inferred external success."""
from datetime import datetime, timezone, timedelta

STATES = ('AUTO_PROCESSING','ACTION_REQUIRED','BLOCKED_EXTERNAL','DISPOSED','COMPLETED')

def date(value):
    if not value: return None
    if isinstance(value, str):
        try: value = datetime.fromisoformat(value.replace('Z','+00:00'))
        except ValueError: return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value

def government(d):
    return str(d.get('source','')).startswith(('sam_gov','state_local_')) or d.get('opportunity_type') == 'procurement'

def classify(d, context=None, now=None):
    c=context or {}; now=now or datetime.now(timezone.utc)
    old=c.get('operation') or {}; reward=c.get('reward') or {}; research=c.get('research') or {}
    lane = ('Government' if government(d) else 'Rewards' if d.get('revenue_path')=='reward' else
            'Recovery' if d.get('revenue_path')=='asset_recovery' else 'Employment' if d.get('revenue_path')=='employment' else 'Commercial')
    base=dict(operational_state=None,lane=lane,next_machine_action=None,next_human_action=None,
              blocker_type=None,blocker_reason=None,next_retry_at=None,final_approval_type=None,
              workbench_stage='Discovered' if lane=='Government' else None,provider_stage=None,
              completion_type=None,disposition_reason=None,disposition_evidence=None,
              evidence={})
    def done(kind):
        return dict(base,operational_state='COMPLETED',completion_type=kind,workbench_stage={'SUBMITTED':'Submitted','WON':'Won','LOST':'Lost'}.get(kind),next_human_action='Track outcome; external follow-up requires separate authorization')
    def blocked(kind,reason,retry=None):
        return dict(base,operational_state='BLOCKED_EXTERNAL',blocker_type=kind,blocker_reason=reason,next_retry_at=retry)
    def human(action,kind=None):
        return dict(base,operational_state='ACTION_REQUIRED',next_human_action=action,final_approval_type=kind)
    def auto(action):
        a=(c.get('attempts') or {}).get(action,{})
        if a.get('result')=='credentials_required': return blocked('AUTHENTICATION_REQUIRED',a.get('reason','Credentials required'))
        if a.get('result')=='exhausted':
            kinds={'procurement_research':'MISSING_OFFICIAL_DOCUMENT','target_resolution':'MISSING_APPLICATION_TARGET' if lane=='Employment' else 'CONTACT_UNRESOLVED','provider_research':'OTHER','contact_discovery':'CONTACT_UNRESOLVED'}
            return blocked(kinds.get(action,'EXTERNAL_NETWORK'),a.get('reason') or 'Preparation could not advance; retry scheduled',a.get('next_retry_at'))
        return dict(base,operational_state='AUTO_PROCESSING',next_machine_action=action,next_retry_at=a.get('next_retry_at') or (old.get('next_retry_at') if old.get('next_machine_action')==action else None) or now)
    def dispose(reason,evidence):
        # Restore requests reopen to research; unchanged old evidence cannot immediately re-dispose.
        if old.get('restored_at') and old.get('disposition_reason')==reason:
            return auto('procurement_research' if lane=='Government' else 'target_resolution')
        return dict(base,operational_state='DISPOSED',disposition_reason=reason,disposition_evidence=evidence,workbench_stage='Disposed' if lane=='Government' else None)

    # Preserve outcomes irrespective of inconsistent preparation columns.
    if float(d.get('actual_revenue') or 0)>0 or reward.get('payout_received_at'): return done('REVENUE_RECORDED')
    if d.get('pipeline_stage')=='won' or d.get('pursuit_status')=='won' or d.get('response_status')=='won': return done('WON')
    if d.get('pipeline_stage')=='lost' or d.get('pursuit_status')=='lost' or d.get('response_status')=='lost': return done('LOST')
    if d.get('outreach_sent_at') or d.get('outreach_status')=='sent': return done('SENT')
    if d.get('application_submitted_at') or d.get('automation_status')=='submitted' or d.get('procurement_submission_at') or reward.get('submitted_at'): return done('SUBMITTED')
    if old.get('operational_state')=='DISPOSED':
        return dict(base,**{k:old.get(k) for k in base if k in old})
    if d.get('source')=='test': return dispose('UNSUPPORTED_SOURCE',{'source':'test','reason':'Explicit test source, not an external opportunity'})
    if c.get('duplicate_of'): return dispose('DUPLICATE',{'duplicate_of':c['duplicate_of'],'source':d.get('source'),'source_id':d.get('source_id')})
    due=date(d.get('solicitation_due_at') or d.get('procurement_deadline'))
    if lane=='Government' and due and due<now: return dispose('EXPIRED',{'official_deadline':due.isoformat(),'source':d.get('url')})
    if lane=='Government' and d.get('procurement_stage') in ('award','cancelled','closed'):
        return dispose('CANCELLED' if d['procurement_stage']=='cancelled' else 'CLOSED',{'official_stage':d['procurement_stage'],'source':d.get('url')})
    if reward.get('participation_status')=='closed_to_new_entrants': return dispose('CLOSED',{'participation_status':reward['participation_status'],'reason':reward.get('participation_reason')})
    # Staleness policy is source-specific and uses the original posting date, not crawler time.
    posted=date(d.get('source_posted_at'))
    if lane=='Employment' and d.get('pursuit_status')=='excluded_stale' and posted and (now-posted).days>180:
        return dispose('STALE_BEYOND_POLICY',{'source_posted_at':posted.isoformat(),'policy':'employment explicit stale exclusion plus original posting older than 180 days'})
    if lane=='Recovery': return blocked('COMPLIANCE_REVIEW','Authoritative jurisdiction compliance approval required; no outreach or claims permitted')
    if d.get('automation_status') in ('captcha_required','anti_bot_required'): return blocked('CAPTCHA','Official site requires human verification')
    if d.get('automation_status') in ('auth_required','login_required','2fa_required'): return blocked('AUTHENTICATION_REQUIRED','Authenticate on the official site; no bypass')
    if d.get('automation_status')=='submission_unconfirmed': return human('Verify whether a prior submission completed before any retry','SUBMISSION_RECONCILIATION')

    if lane=='Government':
        base['workbench_stage']='Researching'
        if not research.get('scope_retrieved') or not research.get('official_verified'):
            result=auto('procurement_research')
            if result['operational_state']=='BLOCKED_EXTERNAL':result['workbench_stage']='Needs Documents'
            return result
        # Machine extraction precedes the genuine certification/eligibility decision.
        if not research.get('eligibility_verified'):
            return human('Review extracted official eligibility requirements and confirm business registrations/certifications','GOVERNMENT_ELIGIBILITY')
        if d.get('procurement_registration_required'):
            base['workbench_stage']='Needs Registration/Auth'
            return blocked('REGISTRATION_REQUIRED','Confirm the required official registration/account')
        base['workbench_stage']='Qualified'
        if d.get('fulfillment_path')=='subcontractor':
            p=provider_step(d,c,base,auto,human,blocked)
            if p:return p
        if not research.get('package_path'):
            base['workbench_stage']='Package Building'; return auto('procurement_package')
        if not (research.get('requirements') or {}).get('package_readiness_verified'):
            base['workbench_stage']='Package Building'
            return human('Supply or verify the required business documents and solicitation-specific response in the prepared draft package','GOVERNMENT_PACKAGE_DOCUMENTS')
        base['workbench_stage']='Final Bid Approval'
        if old.get('approval_status')=='approved':return blocked('OTHER','Bid approved; explicit separate per-item submission authorization required')
        return human('Review official requirements, evidence, and completed bid package','GOVERNMENT_BID')

    if old.get('approval_status')=='approved' and lane in ('Rewards','Employment'):return blocked('OTHER','Preparation approved; separate explicit external execution authorization required')
    if lane=='Rewards':
        if reward.get('detail_status')!='sufficient':return auto('reward_enrichment')
        if not reward.get('fit_analyzed_at'):return auto('reward_fit')
        if reward.get('research_status')!='researched':return auto('reward_research')
        if reward.get('participation_status')=='prerequisite_failed':return blocked('AUTHENTICATION_REQUIRED',reward.get('participation_reason') or 'Competition prerequisite is unmet')
        if reward.get('participation_status')=='available_not_entered':return human('Review researched competition economics and rules before entering','REWARD_ENTRY')
        if reward.get('participation_status') not in ('entered','verified','participating','entered_verified'):
            return auto('reward_participation')
        prototype=c.get('prototype') or {}
        if not prototype:return auto('reward_prototype_plan')
        if prototype.get('prototype_status')=='planned':return auto('reward_local_prototype')
        if prototype.get('prototype_status') in ('blocked','failed'):return blocked('OTHER','Local prototype stopped; review recorded prerequisite evidence')
        if not reward.get('execution_ready'):return auto('reward_quality')
        return human('Review local prototype quality and authorize final submission separately','REWARD_SUBMISSION')

    if not d.get('revenue_path') or d.get('revenue_path')=='ignore':
        if (c.get('attempts') or {}).get('classification',{}).get('result')=='progress':return human('Choose a business pursuit path after completed relevance analysis: '+str(d.get('business_reason') or ''),'BUSINESS_FIT')
        return auto('classification')
    if d.get('pursuit_status')!='queued':return auto('queue_preparation')
    if d.get('eligibility_status')=='unchecked':return auto('verification')
    if lane=='Employment':
        if not d.get('application_url') or d.get('target_quality_status')!='verified':return auto('target_resolution')
        if d.get('eligibility_status') in ('review','ineligible'):return human('Resolve documented eligibility: '+str(d.get('eligibility_reason')),'ELIGIBILITY')
        if not d.get('tailored_resume'):return auto('resume_preparation')
        if not d.get('application_package_path'):return auto('application_package')
        if not d.get('execution_verified'):return auto('verification')
        return human('Review the prepared application; submission requires separate authorization','EMPLOYMENT_APPLICATION')
    if not d.get('contact_url'):return auto('target_resolution')
    if not d.get('outreach_contact_email'):
        ca=c.get('contact') or {}
        if ca.get('exhausted'):
            # Alternative legitimate public contact/form research is attempted once before external block.
            alt=(c.get('attempts') or {}).get('contact_alternative',{})
            if not alt or alt.get('result')=='retry':return auto('contact_alternative')
            return blocked('CONTACT_UNRESOLVED',alt.get('reason') or 'Bounded contact discovery exhausted; no verified alternative destination',alt.get('next_retry_at'))
        result=auto('contact_discovery'); result['next_retry_at']=ca.get('next_retry_at') or result['next_retry_at']; return result
    if d.get('eligibility_status') in ('review','ineligible'):return human('Resolve documented eligibility: '+str(d.get('eligibility_reason')),'ELIGIBILITY')
    if not d.get('execution_verified') or d.get('target_quality_status')!='verified':return auto('verification')
    if d.get('outreach_status')!='ready_email' or not d.get('outreach_body') or not d.get('outreach_subject'):return auto('outreach_preparation')
    # A commercial introductory message does not promise delivery; provider work is independently visible.
    if old.get('approval_status')=='approved':return blocked('OTHER','Commercial preparation approved; sending requires explicit separate per-item authorization')
    return human('Review verified contact, fit, and prepared commercial message','COMMERCIAL_OUTREACH')


def provider_step(d,c,base,auto,human,blocked):
    base['provider_stage']='Needs Provider'; base['workbench_stage']='Needs Provider'
    candidates=c.get('providers') or []
    if not candidates:return auto('provider_research')
    base['provider_stage']='Candidates Found'
    if not any(p.get('verification_status')=='verified' for p in candidates):return auto('provider_verification')
    if not any((p.get('economics') or {}).get('margin_verified') for p in candidates):return blocked('OTHER','Provider quote and margin evidence required; external provider contact needs explicit authorization')
    if not any(p.get('decision')=='approved' for p in candidates):
        base['lane']='Subcontractor';base['provider_stage']='Needs Provider Approval'
        return human('Select a verified provider candidate after reviewing evidence and economics','PROVIDER_SELECTION')
    base['provider_stage']='Provider Approved'
    return None
