#!/usr/bin/env python3
"""Official Web3 ecosystem funding watcher. Discovery only."""
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse
import re, requests
from bs4 import BeautifulSoup

UA={"User-Agent":"IMALI-Opportunity-Engine/1.0"}
ECOSYSTEMS=(
    {"ecosystem":"Solana","url":"https://solana.org/grants-funding"},
    {"ecosystem":"Ethereum","url":"https://esp.ethereum.foundation/applicants/rfp"},
    {"ecosystem":"Polygon","url":"https://polygon.technology/village"},
    {"ecosystem":"Arbitrum","url":"https://arbitrum.foundation/grants"},
)

def _text(soup): return " ".join(soup.stripped_strings)

def _apply_links(base,soup):
    out=[]
    for a in soup.find_all("a",href=True):
        href=str(a.get("href") or "").strip()
        label=" ".join(a.stripped_strings).lower()
        if not href or href.startswith(("#","javascript:","mailto:")): continue
        u=urljoin(base,href)
        if urlparse(u).scheme not in ("http","https"): continue
        if re.search(r"\bapply\b|application",label+" "+u,re.I): out.append(u)
    return list(dict.fromkeys(out))

def _fetch(url):
    r=requests.get(url,headers=UA,timeout=10,allow_redirects=True)
    r.raise_for_status()
    if len(r.content)>2_000_000: raise ValueError("funding page too large")
    return r.url,BeautifulSoup(r.text,"html.parser")

def _row(source_id,title,ecosystem,description,url,application_url,funding_type="grant",equity_percent=None):
    revenue_path="capital_grant" if funding_type in ("grant","prize","stipend") else "capital_equity" if funding_type=="equity" else "capital_revenue_share"
    terms="non-dilutive" if revenue_path=="capital_grant" else (f"equity {equity_percent}%" if equity_percent is not None else funding_type)
    return {
        "source":"web3_funding","source_id":source_id,"source_posted_at":datetime.now(timezone.utc),
        "title":title,"company":ecosystem+" ecosystem","description":description[:12000],
        "url":url,"application_url":application_url,"location":"Global","budget":"",
        "opportunity_type":"web3_seed_funding","revenue_path":revenue_path,"fulfillment_path":"direct",
        "score":78,"personal_fit":78,"business_value":88,"demand_confidence":88,
        "business_reason":f"Official {ecosystem} ecosystem funding source; {terms}. Prioritize growth/advertising capital without exceeding the 10% total equity ceiling.",
        "matched_skills":["web3","blockchain","decentralized technology"],"solicitation_due_at":None,
    }

def fetch_web3_funding():
    rows=[]
    for cfg in ECOSYSTEMS:
        try:
            final,soup=_fetch(cfg["url"]); text=_text(soup); low=text.lower(); links=_apply_links(final,soup); eco=cfg["ecosystem"]
            if eco=="Ethereum":
                if "no rfp items available" in low: continue
                for i,u in enumerate(links[:5],1): rows.append(_row(f"ethereum-rfp-{i}",f"Ethereum Foundation ESP RFP {i}",eco,text,final,u))
            elif eco=="Arbitrum":
                if "inactive" in low and "active" not in re.sub(r"inactive","",low): continue
                for i,u in enumerate(links[:5],1): rows.append(_row(f"arbitrum-funding-{i}",f"Arbitrum ecosystem funding program {i}",eco,text,final,u))
            elif eco=="Polygon":
                year=str(datetime.now(timezone.utc).year)
                if year not in text or not re.search(r"\b(live|applications? open|apply now)\b",text,re.I): continue
                for i,u in enumerate(links[:6],1): rows.append(_row(f"polygon-funding-{i}",f"Polygon ecosystem grant program {i}",eco,text,final,u))
            elif eco=="Solana":
                if "applications are reviewed on a rolling basis" not in low and "all funding applicants" not in low: continue
                candidates=[u for u in links if "grant" in u.lower() or "apply" in u.lower() or "application" in u.lower()]
                if candidates: rows.append(_row("solana-standard-grant","Solana Foundation standard grant",eco,text,final,candidates[0],"grant"))
        except Exception:
            continue
    return rows

if __name__=="__main__":
    for row in fetch_web3_funding(): print(row["source_id"],"|",row["title"],"|",row["application_url"])

