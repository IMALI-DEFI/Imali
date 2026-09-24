import sys,unittest
from pathlib import Path
from datetime import datetime,timezone,timedelta
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'engine'))
from opportunity_funnel import evaluate,identity,report
from discovery_quality import reject_reason,choose_source
class Quality(unittest.TestCase):
 def test_timestamp_receipts_only(self):
  self.assertFalse(evaluate({'outreach_status':'sent','pipeline_stage':'sent'})['sent'])
  self.assertTrue(evaluate({'outreach_sent_at':'2026-09-01'})['sent'])
 def test_do_not_lower_threshold(self):
  row={'source':'remoteok','source_id':'1','title':'Engineer','url':'https://example.com/job/1'}
  self.assertEqual(reject_reason(row,{'demand_confidence':49,'personal_fit':100},set()),'existing_quality_threshold')
 def test_distinct_roles_and_tracking_dedup(self):
  a={'url':'https://example.com/jobs/1?utm_source=x'};b={'url':'https://example.com/jobs/1'};c={'url':'https://example.com/jobs/2'}
  self.assertEqual(identity(a),identity(b));self.assertNotEqual(identity(a),identity(c))
 def test_expired_government_suppressed_without_faking_eligibility(self):
  row={'source':'sam_gov','source_id':'1','title':'RFQ','solicitation_due_at':'2020-01-01'}
  self.assertEqual(reject_reason(row,{},set()),'expired');self.assertFalse(evaluate(row)['qualified'])
 def test_estimates_never_become_revenue_or_priority(self):
  x={'id':1,'source':'a','estimated_revenue':99999999}
  self.assertEqual(evaluate(x)['rank'],evaluate({**x,'estimated_revenue':0})['rank']);self.assertEqual(report([x],{})['totals']['realized_revenue'],0)
 def test_exploration_retained(self):
  self.assertEqual({choose_source(i,[],{},['a','b','c']) for i in (0,5,10)},{'a','b','c'})
if __name__=='__main__':unittest.main()
