import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'work'))
from sources.business_opportunities import source_explicit_application_url

class BusinessSourceTests(unittest.TestCase):
    def test_preserves_explicit_original_job_posting_link(self):
        raw = '<p>Original Job posting link <a href="https://company.example/jobs/123">here</a></p>'
        # Label-only 'here' is intentionally not enough.
        self.assertIsNone(source_explicit_application_url(raw))
        raw = '<p><a href="https://company.example/jobs/123">Original Job posting link here</a></p>'
        self.assertEqual(source_explicit_application_url(raw), 'https://company.example/jobs/123')

    def test_ignores_unlabeled_links(self):
        raw = '<a href="https://company.example/">Company site</a>'
        self.assertIsNone(source_explicit_application_url(raw))

if __name__ == '__main__':
    unittest.main()
