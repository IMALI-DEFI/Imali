#!/usr/bin/env python3
"""Official startup-capital pathways.

Discovery is intentionally network-free: it registers a bounded set of official
financing pathways. The Capital research stage must live-verify the official
page, current application route, open status, and financing terms before a
record can advance.
"""
from datetime import datetime, timezone

PROGRAMS=(
    {
        "source_id":"kickstarter-crowdfunding",
        "title":"Kickstarter reward crowdfunding",
        "company":"Kickstarter",
        "url":"https://launch.kickstarter.com/content-creators",
        "application_url":"https://www.kickstarter.com/start",
        "revenue_path":"capital_crowdfunding",
        "opportunity_type":"crowdfunding",
        "business_value":84,
        "reason":"Non-equity crowdfunding can finance a defined product/project through customer pledges while preserving ownership and IP.",
    },
    {
        "source_id":"indiegogo-crowdfunding",
        "title":"Indiegogo crowdfunding for creators",
        "company":"Indiegogo",
        "url":"https://www.indiegogo.com/en/creators/becomeacreator",
        "application_url":"https://www.indiegogo.com/en/creators/becomeacreator",
        "revenue_path":"capital_crowdfunding",
        "opportunity_type":"crowdfunding",
        "business_value":84,
        "reason":"Reward/preorder crowdfunding can provide non-equity launch capital and validate customer demand before larger ad spending.",
    },
    {
        "source_id":"aws-activate-founders",
        "title":"AWS Activate startup credits",
        "company":"Amazon Web Services",
        "url":"https://aws.amazon.com/startups/credits/",
        "application_url":"https://aws.amazon.com/startups/join?destination=/credits/apply",
        "revenue_path":"capital_credits",
        "opportunity_type":"startup_credits",
        "business_value":72,
        "reason":"Startup cloud credits are non-dilutive, non-cash runway that can reduce infrastructure spend and free cash for customer acquisition.",
    },
    {
        "source_id":"microsoft-founders-hub",
        "title":"Microsoft for Startups Founders Hub",
        "company":"Microsoft",
        "url":"https://www.microsoft.com/en-us/startups",
        "application_url":"https://www.microsoft.com/en-us/startups",
        "revenue_path":"capital_credits",
        "opportunity_type":"startup_credits",
        "business_value":72,
        "reason":"Startup cloud/software credits are non-dilutive, non-cash runway that can reduce operating costs and preserve cash for advertising.",
    },
    {
        "source_id":"tedco-seed-funds",
        "title":"TEDCO Seed Funds",
        "company":"TEDCO",
        "url":"https://www.tedcomd.com/seed-funds",
        "application_url":"https://www.tedcomd.com/seed-funds",
        "revenue_path":"capital_equity",
        "opportunity_type":"seed_investment",
        "business_value":92,
        "reason":"Maryland seed capital for early-stage technology companies. Exact dilution must be verified against the 10% total-equity ceiling before it can advance.",
    },
)

def fetch_capital_pathways():
    now=datetime.now(timezone.utc)
    rows=[]
    for p in PROGRAMS:
        rows.append({
            "source":"capital_pathway",
            "source_id":p["source_id"],
            "source_posted_at":now,
            "title":p["title"],
            "company":p["company"],
            "description":p["reason"],
            "url":p["url"],
            "application_url":p["application_url"],
            "location":"United States",
            "budget":"",
            "score":82 if p["revenue_path"]=="capital_crowdfunding" else 76 if p["revenue_path"]=="capital_credits" else 88,
            "personal_fit":70,
            "business_value":p["business_value"],
            "demand_confidence":90,
            "opportunity_type":p["opportunity_type"],
            "revenue_path":p["revenue_path"],
            "fulfillment_path":"direct",
            "business_reason":p["reason"],
            "matched_skills":["startup","technology","software"],
            "solicitation_due_at":None,
        })
    return rows

if __name__=="__main__":
    for row in fetch_capital_pathways():
        print(row["source_id"],"|",row["revenue_path"],"|",row["application_url"])
