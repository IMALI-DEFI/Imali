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
        parsed=urlparse(u)
        if parsed.scheme not in ("http","https"): continue
        host=(parsed.hostname or "").lower()
        direct=(label.startswith("apply") or label.startswith("application") or "grant-application" in u.lower() or "application-form" in u.lower())
        form_host=host in ("tally.so","airtable.com","www.airtable.com","typeform.com","www.typeform.com","forms.gle")
        official_apply=(host.endswith("solana.org") or host.endswith("ethereum.foundation") or host.endswith("polygon.technology") or host.endswith("arbitrum.foundation"))
        if direct and (form_host or official_apply) and not re.search(r"audit-program|stylus-sprint",u,re.I): out.append(u)

    return list(dict.fromkeys(out))

def _fetch(url):
    r=requests.get(url,headers=UA,timeout=10,allow_redirects=True)
    r.raise_for_status()
    if len(r.content)>2_000_000: raise ValueError("funding page too large")
    return r.url,BeautifulSoup(r.text,"html.parser")

def _application_open(url):
    try:
        final,soup=_fetch(url)
        text=_text(soup).strip()
    except Exception:
        return False
    if len(text)<80:
        return False
    low=text.lower()
    if re.search(r'applications? (?:are )?closed|not accepting applications|program complete|submissions? closed|form (?:is )?closed|no longer accepting',low,re.I):
        return False
    return True

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
                for i,u in enumerate([u for u in links if _application_open(u)][:5],1): rows.append(_row(f"ethereum-rfp-{i}",f"Ethereum Foundation ESP RFP {i}",eco,text,final,u))
            elif eco=="Arbitrum":
                seen=set()
                for a in soup.find_all("a",href=True):
                    label=" ".join(a.stripped_strings).strip().lower()
                    href=urljoin(final,str(a.get("href") or "").strip())
                    direct=(label.startswith("apply") or label.startswith("application") or "grant-application" in href.lower() or "application-form" in href.lower())
                    if not direct or re.search(r"audit-program|stylus-sprint",href,re.I):
                        continue
                    card=None; node=a
                    for _ in range(6):
                        node=node.parent if node else None
                        if not node: break
                        card_text=" ".join(node.stripped_strings)
                        if len(card_text)<=1200 and re.search(r"\b(?:Active|Inactive)\b",card_text):
                            card=node; break
                    if not card:
                        continue
                    card_text=" ".join(card.stripped_strings)
                    if not card_text.startswith("Active ") or card_text.startswith("Inactive "):
                        continue
                    if not _application_open(href):
                        continue
                    heads=[h.get_text(" ",strip=True) for h in card.find_all(["h1","h2","h3","h4","h5","h6"]) if h.get_text(" ",strip=True)]
                    title=heads[0] if heads else re.sub(r"^Active\s+","",card_text).split(" Managed by ")[0][:120]
                    key=re.sub(r"[^a-z0-9]+","-",title.lower()).strip("-")
                    if not key or key in seen: continue
                    seen.add(key)
                    rows.append(_row("arbitrum-"+key,title,eco,card_text,final,href))

            elif eco=="Polygon":
                year=str(datetime.now(timezone.utc).year)
                if year not in text or not re.search(r"\b(live|applications? open|apply now)\b",text,re.I): continue
                for i,u in enumerate([u for u in links if _application_open(u)][:6],1): rows.append(_row(f"polygon-funding-{i}",f"Polygon ecosystem grant program {i}",eco,text,final,u))
            elif eco=="Solana":
                if "applications are reviewed on a rolling basis" not in low and "all funding applicants" not in low: continue
                candidates=[u for u in links if "grant" in u.lower() or "apply" in u.lower() or "application" in u.lower()]
                candidates=[u for u in candidates if _application_open(u)]
                if candidates: rows.append(_row("solana-standard-grant","Solana Foundation standard grant",eco,text,final,candidates[0],"grant"))
        except Exception:
            continue
    return rows

if __name__=="__main__":
    for row in fetch_web3_funding(): print(row["source_id"],"|",row["title"],"|",row["application_url"])

