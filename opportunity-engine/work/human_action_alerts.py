#!/usr/bin/env python3
import argparse, hashlib, os, re, smtplib, sqlite3, ssl
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from urllib.parse import urljoin
import psycopg2, requests
from bs4 import BeautifulSoup
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

ROOT=Path(__file__).resolve().parent
load_dotenv(ROOT/".env")
STATE=ROOT/"human_alert_state.sqlite3"
DEST=os.getenv("HUMAN_ALERT_RECIPIENT","g2mediagraphics@gmail.com")
DB=os.getenv("WORK_AGENT_DB_DSN","dbname=imali user=sniperuser host=localhost")
DASH=os.getenv("HUMAN_ALERT_DASHBOARD_URL","https://imali-defi.com/admin/work-agent")
NS="canonical-v3"
FINAL_APPROVALS={"COMMERCIAL_OUTREACH","CONTRACT_APPLICATION","GOVERNMENT_BID","CAPITAL_APPLICATION","EMPLOYMENT_APPLICATION","REWARD_ENTRY","REWARD_SUBMISSION"}
EXTERNAL_TYPES={"CAPTCHA","AUTHENTICATION_REQUIRED","REGISTRATION_REQUIRED"}
EXTERNAL_WORDS=("captcha","login","2fa","two-factor","registration","credential","account access","submission reconciliation","ambiguous submission")

def money(v):
    try:
        n=float(v); return ("$"+f"{n:,.0f}") if n>0 else None
    except (TypeError,ValueError): return None

def _norm(text):
    return re.sub(r"[^a-z0-9]+"," ",str(text or "").lower()).strip()

def validate_contract_destination(row):
    listing=str(row.get("url") or "").strip(); title=str(row.get("title") or "").strip()
    if not listing or not title: return None
    try:
        r=requests.get(listing,timeout=10,allow_redirects=True,headers={"User-Agent":"IMALI-Opportunity-Alert/1.0"})
        if r.status_code!=200 or len(r.content)<500: return None
        soup=BeautifulSoup(r.text,"html.parser"); text=" ".join(soup.stripped_strings)
        if _norm(title) not in _norm(text): return None
        apply_url=None
        if "remotive.com/" in r.url:
            for a in soup.find_all("a",href=True):
                if "apply for this position" in " ".join(a.stripped_strings).lower():
                    apply_url=urljoin(r.url,a.get("href")); break
        if not apply_url: apply_url=str(row.get("application_url") or "").strip()
        if not apply_url: return None
        ar=requests.get(apply_url,timeout=10,allow_redirects=True,headers={"User-Agent":"IMALI-Opportunity-Alert/1.0"})
        if ar.status_code!=200 or len(ar.content)<500: return None
        app_text=" ".join(BeautifulSoup(ar.text,"html.parser").stripped_strings)
        if len(app_text)<180 or app_text.strip().lower()=="you need to enable javascript to run this app.": return None
        return {"listing_url":r.url,"apply_url":ar.url}
    except Exception:
        return None

def collect():
    sql="""SELECT d.id,d.title,d.company,d.source,o.lane,o.operational_state,o.next_human_action,
           o.blocker_type,o.blocker_reason,o.final_approval_type,o.approval_status,
           d.estimated_revenue,d.estimated_margin,d.margin_percent,d.business_value,
           d.personal_fit,d.demand_confidence,d.pursuit_priority,
           COALESCE(d.solicitation_due_at,d.procurement_deadline) AS deadline,
           d.url,d.application_url,d.contact_url,d.outreach_contact_email,d.business_reason
           FROM developer_opportunities d JOIN opportunity_operations o ON o.opportunity_id=d.id
           WHERE (o.operational_state='ACTION_REQUIRED' AND o.final_approval_type IS NOT NULL)
              OR o.operational_state='BLOCKED_EXTERNAL'
           ORDER BY CASE WHEN o.lane='Employment' THEN 1 ELSE 0 END,
                    CASE WHEN o.operational_state='ACTION_REQUIRED' THEN 0 ELSE 1 END,
                    COALESCE(d.estimated_margin,d.estimated_revenue,0) DESC,
                    COALESCE(d.solicitation_due_at,d.procurement_deadline) ASC NULLS LAST,d.id"""
    with psycopg2.connect(DB) as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(sql); rows=cur.fetchall()
    items=[]
    for r in rows:
        if r["operational_state"]=="ACTION_REQUIRED":
            if r["final_approval_type"] in FINAL_APPROVALS:
                category="FINAL APPROVAL"; why=r["next_human_action"] or ("Review "+str(r["final_approval_type"] or "final decision"))
            elif r["final_approval_type"]=="SUBMISSION_RECONCILIATION":
                category="EXTERNAL ISSUE"; why=r["next_human_action"] or "Confirm whether the prior submission actually completed before the engine retries."
            else: continue
        else:
            reason=(r["blocker_reason"] or ""); low=reason.lower()
            if r["blocker_type"] not in EXTERNAL_TYPES and not any(w in low for w in EXTERNAL_WORDS): continue
            category="EXTERNAL ISSUE"; why=reason or ("Resolve "+str(r["blocker_type"] or "external dependency"))
        listing_url=r["url"]; action_url=r["application_url"] or r["contact_url"] or r["url"]
        if category=="FINAL APPROVAL" and r["final_approval_type"]=="CONTRACT_APPLICATION" and r["lane"]!="Employment":
            live=validate_contract_destination(r)
            if not live: continue
            listing_url=live["listing_url"]; action_url=live["apply_url"]
        upside=[]
        contract_rate=(r.get("source")=="business_contract_remotive")
        if money(r["estimated_revenue"]):
            upside.append(("listed rate ceiling "+money(r["estimated_revenue"])+" / hour (not total contract value)") if contract_rate else "potential value "+money(r["estimated_revenue"]))
        if money(r["estimated_margin"]):
            upside.append(("modeled hourly gross margin "+money(r["estimated_margin"])) if contract_rate else "modeled margin "+money(r["estimated_margin"]))
        elif r["margin_percent"] is not None:
            try:
                if float(r["margin_percent"])>0: upside.append(f"modeled margin {float(r['margin_percent']):.0f}%")
            except (TypeError,ValueError): pass
        if r["business_value"] is not None: upside.append(f"business-value score {r['business_value']}/100")
        if r["pursuit_priority"] is not None: upside.append(f"priority {r['pursuit_priority']}")
        lucrative="; ".join(upside) if upside else "No reliable dollar estimate yet; value must be confirmed before final approval."
        reason_for_value=(r["business_reason"] or "").strip()
        signature="|".join(str(x or "") for x in (r["id"],category,r["final_approval_type"],r["blocker_type"],why,listing_url,action_url))
        key=f"{NS}:{r['id']}:"+hashlib.sha256(signature.encode()).hexdigest()[:16]
        items.append(dict(r,key=key,category=category,why=why,lucrative=lucrative,value_reason=reason_for_value,listing_url=listing_url,action_url=action_url))
    return items

def format_item(i):
    lines=[f"[{i['category']}] {i['company'] or 'Unknown organization'} — {i['title'] or 'Untitled'}",
           f"Opportunity ID: {i['id']} | Lane: {i['lane']}",
           f"What you need to do: {i['why']}",
           f"Why it may be lucrative: {i['lucrative']}"]
    if i["value_reason"]: lines.append("Why the engine likes it: "+i["value_reason"][:700])
    if i["deadline"]: lines.append("Deadline: "+str(i["deadline"]))
    lines.append("Review in Opportunity Control Center: "+DASH)
    if i.get("listing_url"): lines.append("Verified live listing: "+str(i["listing_url"]))
    if i.get("action_url"): lines.append("Current apply/action link: "+str(i["action_url"]))
    if i["outreach_contact_email"]: lines.append("Verified contact: "+str(i["outreach_contact_email"]))
    return "\n".join(lines)

def send(subject,body):
    host=os.getenv("SMTP_HOST"); user=os.getenv("SMTP_USER"); password=os.getenv("SMTP_PASSWORD") or os.getenv("SMTP_PASS"); sender=os.getenv("SMTP_FROM") or user
    if not (host and sender and password): raise RuntimeError("Email SMTP setup incomplete")
    port=int(os.getenv("SMTP_PORT","587")); msg=EmailMessage(); msg["Subject"]=subject; msg["From"]=sender; msg["To"]=DEST; msg.set_content(body)
    if port==465:
        with smtplib.SMTP_SSL(host,port,timeout=20,context=ssl.create_default_context()) as client:
            if user: client.login(user,password)
            client.send_message(msg)
    else:
        with smtplib.SMTP(host,port,timeout=20) as client:
            client.starttls(context=ssl.create_default_context())
            if user: client.login(user,password)
            client.send_message(msg)

def main():
    p=argparse.ArgumentParser(); p.add_argument("--mode",choices=("urgent","digest"),required=True); p.add_argument("--dry-run",action="store_true")
    a=p.parse_args(); items=collect(); now=datetime.now(timezone.utc)
    with sqlite3.connect(STATE) as conn:
        conn.execute("CREATE TABLE IF NOT EXISTS seen (action_key TEXT PRIMARY KEY, first_seen TEXT NOT NULL, notified_at TEXT)")
        canonical_seen={r[0] for r in conn.execute("SELECT action_key FROM seen WHERE action_key LIKE ?",(NS+":%",))}
        business=[i for i in items if i["lane"]!="Employment"]; employment=[i for i in items if i["lane"]=="Employment"]
        if a.mode=="urgent":
            eligible=[i for i in items if i["lane"]!="Employment" or i["category"]=="EXTERNAL ISSUE"]; chosen=[i for i in eligible if i["key"] not in canonical_seen]; detailed=chosen[:60]
        else:
            chosen=items; detailed=business[:50]+employment[:5]
        sections=[]
        if detailed: sections.append("\n\n".join(format_item(i) for i in detailed))
        if employment:
            sections.append("EMPLOYMENT LEGACY SUMMARY\n"+f"Open employment final approvals/external issues: {len(employment)}\n"+"Only the top 5 are shown in the daily digest so employment does not bury business opportunities.\n"+"Review lane: "+DASH)
        body=("Opportunity Engine — only tasks that truly need you\n"+f"Generated UTC: {now.isoformat()}\n"+f"Business approvals/external issues: {len(business)}\n"+f"Employment legacy approvals/external issues: {len(employment)}\n"+f"Items selected for this alert: {len(chosen)}\n\n"+"\n\n".join(sections)+"\n\nEverything else remains with Autopilot. This alert never approves, submits, sends, or changes a record.")
        if a.dry_run:
            print(f"DRY RUN {a.mode}: total={len(items)} selected={len(chosen)}"); print(body[:8000]); return
        if a.mode=="urgent" and not canonical_seen:
            for i in items: conn.execute("INSERT OR IGNORE INTO seen VALUES (?,?,NULL)",(i["key"],now.isoformat()))
            conn.commit(); print(f"Canonical urgent baseline established: {len(items)} tasks; no email."); return
        if a.mode=="urgent" and not chosen:
            print("No new human/external tasks; no email."); return
        subject="[Action required] Opportunity Engine needs you" if a.mode=="urgent" else "[Daily] Opportunity Engine — approvals & external issues only"
        send(subject,body)
        for i in items: conn.execute("INSERT OR IGNORE INTO seen VALUES (?,?,NULL)",(i["key"],now.isoformat()))
        for i in chosen: conn.execute("UPDATE seen SET notified_at=? WHERE action_key=?",(now.isoformat(),i["key"]))
        conn.commit(); print(f"Sent {a.mode}: {len(chosen)} items to configured recipient.")

if __name__=="__main__": main()
