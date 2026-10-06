#!/usr/bin/env python3

import json
import os
import sys
import psycopg2
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DB_DSN = os.getenv(
    "WORK_AGENT_DB_DSN",
    "dbname=imali user=sniperuser host=localhost"
)

with open(os.path.join(BASE_DIR, "profile.json")) as f:
    PROFILE = json.load(f)


def db():
    return psycopg2.connect(DB_DSN)


def build_summary(job):
    skills = job.get("matched_skills") or []

    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except Exception:
            skills = []

    skills_text = ", ".join(skills[:8])

    return (
        f"Full-Stack / AI Automation Engineer with production "
        f"experience relevant to {job['title']}. "
        f"Key matching skills include {skills_text}. "
        f"Designed and built IMALI, a production fintech and AI "
        f"automation platform integrating frontend systems, backend "
        f"APIs, databases, cloud infrastructure, automated workflows, "
        f"and external financial services."
    )


def build_resume(job):

    skills = job.get("matched_skills") or []

    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except Exception:
            skills = []

    summary = build_summary(job)

    proof = job.get("imali_proof") or ""

    return f"""
WAYNE GRIFFIN
Full-Stack / AI Automation Engineer

TARGET ROLE
{job['title']} — {job.get('company') or ''}

PROFESSIONAL SUMMARY
{summary}

CORE SKILLS
{", ".join(skills)}

FEATURED PRODUCTION PROJECT — IMALI
https://imali-defi.com

IMALI is a production fintech and AI automation platform designed,
built, deployed, and operated by Wayne Griffin.

Relevant experience:
{proof}

Additional production experience includes:
- React frontend development
- Node.js and Python backend services
- PostgreSQL databases
- REST API development
- OAuth and third-party integrations
- AI scoring and automation workflows
- Cloud deployment and service operation
- Trading and fintech integrations
- Email, Telegram, and scheduled automation
- Production monitoring and reliability

PORTFOLIO
https://imali-defi.com
""".strip()


def run():

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            id,
            title,
            company,
            matched_skills,
            imali_proof
        FROM developer_opportunities
        WHERE
            (revenue_path = 'employment' OR source = 'business_contract_remotive')
            AND demand_confidence >= 50
            AND pursuit_status = 'queued'
        ORDER BY pursuit_priority DESC;
    """)

    cols = [d[0] for d in cur.description]

    count = 0

    for row in cur.fetchall():

        job = dict(zip(cols, row))

        summary = build_summary(job)
        resume = build_resume(job)

        cur.execute("""
            UPDATE developer_opportunities
            SET
                tailored_summary = %s,
                tailored_resume = %s,
                application_status = CASE
                    WHEN application_status = 'not_prepared'
                    THEN 'resume_ready'
                    ELSE application_status
                END
            WHERE id = %s;
        """, (
            summary,
            resume,
            job["id"]
        ))

        count += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"Tailored resumes prepared: {count}")


if __name__ == "__main__":
    run()
