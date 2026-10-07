#!/usr/bin/env python3
"""Fresh federal grant discovery from the public Grants.gov search2 API."""
from datetime import datetime, timezone
import requests

SEARCH_URL = "https://api.grants.gov/v1/api/search2"
KEYWORDS = (
    "artificial intelligence",
    "small business",
    "cybersecurity",
    "technology",
    "entrepreneurship",
    "minority",
)

def parse_date(value):
    value=str(value or "").strip()
    if not value:
        return None
    for fmt in ("%m/%d/%Y","%Y-%m-%d"):
        try:
            return datetime.strptime(value,fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None

def fetch_grants_gov():
    found={}
    now=datetime.now(timezone.utc)
    for keyword in KEYWORDS:
        response=requests.post(
            SEARCH_URL,
            json={
                "rows": 50,
                "keyword": keyword,
                "oppStatuses": "forecasted|posted",
                "fundingInstruments": "G|CA",
            },
            timeout=12,
            headers={"User-Agent":"IMALI-Opportunity-Engine/1.0","Content-Type":"application/json"},
        )
        response.raise_for_status()
        payload=response.json()
        if payload.get("errorcode") not in (0,"0",None):
            continue
        for hit in ((payload.get("data") or {}).get("oppHits") or []):
            oid=str(hit.get("id") or "").strip()
            title=str(hit.get("title") or "").strip()
            if not oid or not title:
                continue
            close=parse_date(hit.get("closeDate"))
            if close and close <= now:
                continue
            opened=parse_date(hit.get("openDate"))
            agency=str(hit.get("agencyName") or hit.get("agencyCode") or "Grants.gov").strip()
            number=str(hit.get("number") or oid).strip()
            alns=", ".join(str(x) for x in (hit.get("alnist") or []))
            status=str(hit.get("oppStatus") or "").strip()
            url=f"https://www.grants.gov/search-results-detail/{oid}"
            row={
                "source":"grants_gov",
                "source_id":oid,
                "source_posted_at":opened,
                "title":title,
                "company":agency,
                "description":f"Federal funding opportunity {number}. Status: {status}. ALN: {alns}. Discovery keyword: {keyword}.",
                "url":url,
                "application_url":url,
                "location":"United States",
                "budget":"",
                "opportunity_type":"grant",
                "revenue_path":"capital_grant",
                "fulfillment_path":"direct",
                "score":70,
                "personal_fit":60,
                "business_value":80,
                "demand_confidence":90,
                "business_reason":"Fresh official Grants.gov funding opportunity; eligibility and application requirements require evidence review.",
                "solicitation_due_at":close,
            }
            found[oid]=row
    return list(found.values())

if __name__=="__main__":
    rows=fetch_grants_gov()
    print("GRANTS.GOV FRESH OPPORTUNITIES:",len(rows))
    for r in rows[:25]:
        print(r["source_id"],"|",r["title"],"|",r["solicitation_due_at"])
