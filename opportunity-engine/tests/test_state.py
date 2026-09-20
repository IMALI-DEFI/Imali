import sys,unittest,json
from pathlib import Path
from datetime import datetime,timezone,timedelta
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'work'))
from opportunity_state import classify
NOW=datetime(2026,9,19,tzinfo=timezone.utc)
class States(unittest.TestCase):
 def row(self,**kw):
  return dict(id=1,source='business_arbeitnow',revenue_path='direct_contract',pursuit_status='queued',eligibility_status='eligible',**kw)
 def test_historical_send_always_completed(self):
  for r in [self.row(outreach_sent_at='2026-01-01',execution_status='blocked'),self.row(outreach_status='sent')]:self.assertEqual(classify(r,now=NOW)['operational_state'],'COMPLETED')
 def test_remaining_research_never_human(self):
  r=self.row(outreach_status='needs_contact')
  s=classify(r,now=NOW);self.assertEqual((s['operational_state'],s['next_machine_action']),('AUTO_PROCESSING','target_resolution'))
 def test_contact_backoff(self):
  r=self.row(contact_url='https://official.gov');retry=NOW+timedelta(days=1)
  s=classify(r,{'contact':{'next_retry_at':retry}},NOW);self.assertEqual(s['next_retry_at'],retry);self.assertEqual(s['operational_state'],'AUTO_PROCESSING')
 def test_contact_exhaustion_attempts_alternative_first(self):
  r=self.row(contact_url='https://official.gov');c={'contact':{'exhausted':True}}
  self.assertEqual(classify(r,c,NOW)['next_machine_action'],'contact_alternative')
  c['attempts']={'contact_alternative':{'reason':'No alternative'}}
  self.assertEqual(classify(r,c,NOW)['operational_state'],'BLOCKED_EXTERNAL')
 def test_metadata_not_qualified(self):
  r=self.row();r.update(source='sam_gov',procurement_qualified=True,procurement_bid_ready=True)
  s=classify(r,now=NOW);self.assertEqual(s['next_machine_action'],'procurement_research');self.assertIsNone(s['final_approval_type'])
 def test_expired_procurement_and_restore(self):
  r=self.row();r.update(source='sam_gov',solicitation_due_at='2025-01-01')
  s=classify(r,now=NOW);self.assertEqual(s['disposition_reason'],'EXPIRED')
  s=classify(r,{'operation':{'restored_at':NOW,'disposition_reason':'EXPIRED'}},NOW);self.assertEqual(s['operational_state'],'AUTO_PROCESSING')
 def test_captcha_external(self):self.assertEqual(classify(self.row(automation_status='captcha_required'),now=NOW)['blocker_type'],'CAPTCHA')
 def test_recovery_fail_closed(self):
  r=self.row();r['revenue_path']='asset_recovery';self.assertEqual(classify(r,now=NOW)['blocker_type'],'COMPLIANCE_REVIEW')
 def test_commercial_final(self):
  r=self.row(contact_url='https://company.com',outreach_contact_email='real@company.com',execution_verified=True,target_quality_status='verified',outreach_status='ready_email',outreach_subject='Subject',outreach_body='Prepared message')
  self.assertEqual(classify(r,now=NOW)['final_approval_type'],'COMMERCIAL_OUTREACH')
  self.assertEqual(classify(r,{'operation':{'approval_status':'approved'}},NOW)['operational_state'],'BLOCKED_EXTERNAL')
 def test_unverified_provider_not_human_selection(self):
  r=self.row();r.update(source='sam_gov',fulfillment_path='subcontractor')
  s=classify(r,{'research':{'scope_retrieved':True,'official_verified':True,'eligibility_verified':True},'providers':[{'verification_status':'unverified'}]},NOW)
  self.assertEqual(s['next_machine_action'],'provider_verification')
 def test_all_real_records_have_next_action(self):
  snapshot=Path(__file__).resolve().parents[1]/'audit/opportunities.jsonl'
  if not snapshot.exists():self.skipTest('Private production snapshot is not included in source distribution')
  rows=[json.loads(x) for x in snapshot.read_text().splitlines()]
  for r in rows:
   s=classify(r,now=NOW)
   if s['operational_state']=='AUTO_PROCESSING':self.assertTrue(s['next_machine_action'],r['id'])
   if s['operational_state']=='ACTION_REQUIRED':self.assertTrue(s['next_human_action'],r['id'])
   if s['operational_state']=='BLOCKED_EXTERNAL':self.assertTrue(s['blocker_type'],r['id'])
if __name__=='__main__':unittest.main()
