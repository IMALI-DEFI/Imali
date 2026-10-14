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

def brokerable(d):
    return (d.get('opportunity_type') in ('brokerage','freight_brokerage','logistics_brokerage') or
            d.get('fulfillment_path') in ('broker','intermediary'))

def freight_broker_candidate(d):
    return brokerable(d) and (d.get('opportunity_type') in ('freight_brokerage','logistics_brokerage') or str(d.get('source') or '')=='direct_freight')

def classify(d, context=None, now=None):
    c=context or {}; now=now or datetime.now(timezone.utc)
    old=c.get('operation') or {}; reward=c.get('reward') or {}; research=c.get('research') or {}
    lane = ('Broker / Intermediary' if brokerable(d) else 'Government' if government(d) else 'Capital' if str(d.get('revenue_path') or '').startswith('capital_') or str(d.get('source') or '') in ('grants_gov','web3_funding') else
            'Rewards' if d.get('revenue_path')=='reward' else 'Recovery' if d.get('revenue_path')=='asset_recovery' else
            'Employment' if d.get('revenue_path')=='employment' else 'Commercial')
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
            target_kind='MISSING_APPLICATION_TARGET' if lane=='Employment' or str(d.get('source') or '')=='business_contract_remotive' else 'CONTACT_UNRESOLVED'
            kinds={'procurement_research':'MISSING_OFFICIAL_DOCUMENT','capital_research':'MISSING_OFFICIAL_DOCUMENT',
                   'capital_eligibility':'CAPITAL_PROFILE_REQUIRED','capital_package':'MISSING_OFFICIAL_DOCUMENT',
                   'capital_package_review':'MISSING_OFFICIAL_DOCUMENT','government_eligibility':'GOVERNMENT_PROFILE_REQUIRED',
                   'target_resolution':target_kind,'provider_research':'OTHER','contact_discovery':'CONTACT_UNRESOLVED'}
            return blocked(kinds.get(action,'EXTERNAL_NETWORK'),a.get('reason') or 'Preparation could not advance; retry scheduled',a.get('next_retry_at'))
        return dict(base,operational_state='AUTO_PROCESSING',next_machine_action=action,next_retry_at=a.get('next_retry_at') or (old.get('next_retry_at') if old.get('next_machine_action')==action else None) or now)
    def dispose(reason,evidence):
        # Restore requests reopen to research; unchanged old evidence cannot immediately re-dispose.
        if old.get('restored_at') and old.get('disposition_reason')==reason:
            return auto('procurement_research' if lane=='Government' else 'capital_research' if lane=='Capital' else 'target_resolution')
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
    target_attempt=(c.get('attempts') or {}).get('target_resolution') or {}
    if str(d.get('source') or '')=='business_contract_remotive' and target_attempt.get('result')=='exhausted':
        evidence=target_attempt.get('evidence') or {}
        reason=str(target_attempt.get('reason') or '')
        if evidence.get('stale_application_targets') or 'no longer available' in reason.lower():
            return dispose('DEAD_APPLICATION_TARGET',{'reason':reason,'evidence':evidence,'source':d.get('url'),'application_url':d.get('application_url')})
        if evidence.get('unverifiable_application_targets') or d.get('target_quality_status')!='verified':
            return dispose('NO_VERIFIED_APPLICATION_PATH',{'reason':reason or 'No role-specific application destination could be verified','evidence':evidence,'source':d.get('url'),'application_url':d.get('application_url')})
    due=date(d.get('solicitation_due_at') or d.get('procurement_deadline'))
    if lane in ('Government','Broker / Intermediary','Capital','Rewards') and due and due<now: return dispose('EXPIRED',{'official_deadline':due.isoformat(),'source':d.get('url')})
    if lane in ('Government','Broker / Intermediary') and d.get('procurement_stage') in ('award','cancelled','closed'):
        return dispose('CANCELLED' if d['procurement_stage']=='cancelled' else 'CLOSED',{'official_stage':d['procurement_stage'],'source':d.get('url')})
    if lane in ('Government','Broker / Intermediary') and d.get('revenue_path')=='ignore':
        return dispose('OUT_OF_SCOPE',{'reason':'Recorded business classification is ignore; procurement research is not justified','personal_fit':d.get('personal_fit'),'business_value':d.get('business_value'),'demand_confidence':d.get('demand_confidence'),'source':d.get('url')})
    if reward.get('participation_status')=='closed_to_new_entrants': return dispose('CLOSED',{'participation_status':reward['participation_status'],'reason':reward.get('participation_reason')})
    # Staleness policy is source-specific and uses the original posting date, not crawler time.
    posted=date(d.get('source_posted_at'))
    # Hacker News Who's Hiring inventory is time-sensitive regardless of an older
    # revenue-path classification. Once the authoritative source timestamp is known,
    # do not keep recycling postings older than six months.
    if d.get('source')=='hackernews' and posted and (now-posted).days>180:
        return dispose('STALE_BEYOND_POLICY',{'source_posted_at':posted.isoformat(),'policy':'Hacker News hiring post older than 180 days'})
    if lane=='Employment' and d.get('pursuit_status')=='excluded_stale' and posted and (now-posted).days>180:
        return dispose('STALE_BEYOND_POLICY',{'source_posted_at':posted.isoformat(),'policy':'employment explicit stale exclusion plus original posting older than 180 days'})
    verified=date(d.get('last_verified_at'))
    if lane=='Rewards' and verified and (now-verified).days>30:
        return dispose('STALE_BEYOND_POLICY',{'last_verified_at':verified.isoformat(),'policy':'reward source not re-verified within 30 days'})
    if lane=='Recovery': return blocked('COMPLIANCE_REVIEW','Lane suspended: no authoritative jurisdiction is approved and no compliant case-acquisition path is active. Do not acquire or contact owners until that path exists.')
    if d.get('automation_status') in ('captcha_required','anti_bot_required'): return blocked('CAPTCHA','Official site requires human verification')
    if d.get('automation_status') in ('auth_required','login_required','2fa_required'): return blocked('AUTHENTICATION_REQUIRED','Authenticate on the official site; no bypass')
    if d.get('automation_status')=='submission_unconfirmed': return human('Verify whether a prior submission completed before any retry','SUBMISSION_RECONCILIATION')

    if lane=='Capital':
        base['workbench_stage']='Researching'
        requirements=research.get('requirements') or {}
        if requirements.get('capital_policy_status')=='rejected':
            return dispose('CAPITAL_POLICY_REJECTED',{'reason':requirements.get('capital_policy_reason'),'official_url':research.get('official_url'),'funding_type':requirements.get('funding_type')})
        if requirements.get('capital_policy_status')=='unverified_terms':
            return dispose('FUNDING_TERMS_UNVERIFIED',{'reason':requirements.get('capital_policy_reason'),'official_url':research.get('official_url'),'funding_type':requirements.get('funding_type')})
        if not research.get('scope_retrieved') or not research.get('official_verified'):
            result=auto('capital_research')
            if result['operational_state']=='BLOCKED_EXTERNAL':
                result['workbench_stage']='Needs Documents'
            return result
        if requirements.get('eligibility_machine_status')=='not_aligned':
            return dispose('TECH_STACK_MISMATCH',{'reason':requirements.get('eligibility_machine_reason'),'official_url':research.get('official_url'),'ecosystem':requirements.get('ecosystem')})
        if requirements.get('eligibility_machine_status')=='closed':
            return dispose('CLOSED',{'reason':requirements.get('eligibility_machine_reason'),'official_url':research.get('official_url')})
        if requirements.get('eligibility_machine_status')=='external_profile_required':
            return blocked('APPLICANT_PROFILE_REQUIRED',requirements.get('eligibility_machine_reason') or 'One-time applicant profile evidence is required before Capital eligibility can be automated.')
        if not research.get('eligibility_verified'):
            base['workbench_stage']='Qualified'
            return auto('capital_eligibility')
        if not research.get('package_path'):
            base['workbench_stage']='Package Building'
            return auto('capital_package')
        if not (research.get('requirements') or {}).get('package_readiness_verified'):
            base['workbench_stage']='Package Building'
            return auto('capital_package_review')
        base['workbench_stage']='Final Bid Approval'
        if old.get('approval_status')=='approved':
            return blocked('OTHER','Capital application approved; separate explicit external submission authorization required')
        return human('Review the completed grant application package and official requirements','CAPITAL_APPLICATION')

    if lane=='Broker / Intermediary' and not government(d):
        base['workbench_stage']='Partner Required'
        p=licensed_broker_partner_step(d,c,base,auto,human,blocked)
        if p:return p
        if old.get('approval_status')=='approved':
            return blocked('OTHER','Broker-partner deal preparation approved; any external shipment arrangement or outreach requires separate explicit authorization through the licensed partner.')
        return human('Review demand, verified licensed broker partner, documented partner economics, and projected net margin before any external action','BROKER_PARTNER_DEAL')

    if lane in ('Government','Broker / Intermediary'):
        base['workbench_stage']='Researching'
        if not research.get('scope_retrieved') or not research.get('official_verified'):
            result=auto('procurement_research')
            if result['operational_state']=='BLOCKED_EXTERNAL':result['workbench_stage']='Needs Documents'
            return result
        # Freight brokerage can be tested through a verified licensed brokerage partner.
        # Do not require the user's own broker authority when the fulfillment path is partner-based.
        if lane=='Broker / Intermediary' and freight_broker_candidate(d):
            base['workbench_stage']='Partner Required'
            p=licensed_broker_partner_step(d,c,base,auto,human,blocked)
            if p:return p
        # Freight brokerage must never be treated as a general subcontracting exemption.
        # Only an explicitly verified licensed partner may handle regulated brokerage.
        if lane=='Broker / Intermediary':
            partners=[p for p in (c.get('providers') or []) if p.get('role')=='licensed_freight_broker' and p.get('verification_status')=='verified' and (p.get('compliance') or {}).get('authority_verified') is True and (p.get('compliance') or {}).get('insurance_verified') is True]
            if not partners:
                return blocked('REGISTRATION_REQUIRED','Licensed freight broker partner required. Verify active FMCSA authority, financial responsibility, agreement and insurance before offering or arranging freight; discovery and research only.')
            base['evidence']['broker_execution_model']='licensed_partner_only'
        # Machine extraction precedes the genuine certification/eligibility decision.
        if not research.get('eligibility_verified'):
            return auto('government_eligibility')
        if d.get('procurement_registration_required'):
            base['workbench_stage']='Needs Registration/Auth'
            return blocked('REGISTRATION_REQUIRED','Confirm the required official registration/account')
        base['workbench_stage']='Qualified'
        if d.get('fulfillment_path') in ('subcontractor','broker','intermediary','referral') or lane=='Broker / Intermediary':
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
        if (c.get('attempts') or {}).get('classification',{}).get('result')=='progress':
            return dispose('NO_LOGICAL_REVENUE_PATH',{'reason':d.get('business_reason') or 'Completed classification produced no actionable revenue path','source':d.get('url')})
        return auto('classification')
    if d.get('pursuit_status')!='queued':return auto('queue_preparation')
    if d.get('eligibility_status')=='unchecked':return auto('verification')
    if str(d.get('source') or '')=='business_contract_remotive':
        target_fresh=date(d.get('last_verified_at'))
        if not target_fresh or now-target_fresh>timedelta(days=1):return auto('target_resolution')
        if not d.get('application_url') or d.get('target_quality_status')!='verified':return auto('target_resolution')
        if d.get('eligibility_status')=='ineligible':return dispose('INELIGIBLE',{'reason':d.get('eligibility_reason'),'source':d.get('url')})
        if d.get('eligibility_status')=='review':return auto('verification')
        if not d.get('execution_verified'):return auto('verification')
        # The first execution guard validates target quality; the final source
        # verifier independently rejects aggregators/generic destinations.
        # Do not build or approve a package until both gates pass.
        if not d.get('execution_source_verified') or d.get('execution_status')!='ready':return auto('target_resolution')
        if not d.get('tailored_resume'):return auto('resume_preparation')
        if not d.get('application_package_path'):return auto('application_package')
        return human('Review the prepared contract application; external submission remains separately controlled','CONTRACT_APPLICATION')
    if lane=='Employment':
        target_checks=[date(d.get('target_quality_checked_at')),date(d.get('last_verified_at'))]
        target_checks=[x for x in target_checks if x]
        target_fresh=max(target_checks) if target_checks else None
        if not target_fresh or now-target_fresh>timedelta(days=14):return auto('target_resolution')
        if not d.get('application_url') or d.get('target_quality_status')!='verified':return auto('target_resolution')
        if d.get('eligibility_status')=='ineligible':return dispose('INELIGIBLE',{'reason':d.get('eligibility_reason'),'source':d.get('url')})
        if d.get('eligibility_status')=='review':return auto('verification')
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
    if d.get('eligibility_status')=='ineligible':return dispose('INELIGIBLE',{'reason':d.get('eligibility_reason'),'source':d.get('url')})
    if d.get('eligibility_status')=='review':return auto('verification')
    if not d.get('execution_verified') or d.get('target_quality_status')!='verified':return auto('verification')
    if d.get('outreach_status')!='ready_email' or not d.get('outreach_body') or not d.get('outreach_subject'):return auto('outreach_preparation')
    # A commercial introductory message does not promise delivery; provider work is independently visible.
    if old.get('approval_status')=='approved':return blocked('OTHER','Commercial preparation approved; sending requires explicit separate per-item authorization')
    return human('Review verified contact, fit, and prepared commercial message','COMMERCIAL_OUTREACH')


def licensed_broker_partner_step(d,c,base,auto,human,blocked):
    base['provider_stage']='Needs Licensed Broker Partner'
    candidates=c.get('providers') or []
    brokers=[p for p in candidates if str((p.get('evidence') or {}).get('provider_role') or '').lower() in ('licensed_broker','broker_partner')]
    if not brokers:
        return auto('licensed_broker_partner_research')
    base['provider_stage']='Broker Partners Found'
    verified=[p for p in brokers if p.get('verification_status')=='verified' and bool((p.get('evidence') or {}).get('broker_authority_verified'))]
    if not verified:
        return auto('licensed_broker_partner_verification')
    if not any((p.get('economics') or {}).get('margin_verified') for p in verified):
        return blocked('OTHER','Licensed broker partner economics are not verified. Partner fee/revenue share and projected net margin must be documented before approval.')
    approved=[p for p in verified if p.get('decision')=='approved']
    if not approved:
        base['provider_stage']='Needs Broker Partner Approval'
        return human('Select a verified licensed broker partner after reviewing authority evidence and economics','BROKER_PARTNER_SELECTION')
    base['provider_stage']='Licensed Broker Partner Approved'
    base['workbench_stage']='Partner Ready'
    return None


def provider_step(d,c,base,auto,human,blocked):
    base['provider_stage']='Needs Provider'; base['workbench_stage']='Needs Provider'
    candidates=c.get('providers') or []
    if not candidates:return auto('provider_research')
    base['provider_stage']='Candidates Found'
    if not any(p.get('verification_status')=='verified' for p in candidates):return auto('provider_verification')
    if not any((p.get('economics') or {}).get('margin_verified') for p in candidates):return blocked('OTHER','Provider quote and margin evidence required; external provider contact needs explicit authorization')
    if not any(p.get('decision')=='approved' for p in candidates):
        if base.get('lane')!='Broker / Intermediary': base['lane']='Subcontractor'
        base['provider_stage']='Needs Provider Approval'
        return human('Select a verified provider candidate after reviewing evidence and economics','PROVIDER_SELECTION')
    base['provider_stage']='Provider Approved'
    return None
