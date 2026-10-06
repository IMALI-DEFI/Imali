#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

DB_DSN = os.getenv(
    "WORK_AGENT_DB_DSN",
    "dbname=imali user=sniperuser host=localhost"
)

PACKAGES = BASE_DIR / "application_packages"
PACKAGES.mkdir(exist_ok=True)


def db():
    return psycopg2.connect(DB_DSN)


def platform(url):

    url = (url or "").lower()

    if "greenhouse.io" in url:
        return "greenhouse"

    if "lever.co" in url:
        return "lever"

    if "ashbyhq.com" in url:
        return "ashby"

    if "workable.com" in url:
        return "workable"

    if "applytojob.com" in url:
        return "applytojob"

    if "kula.ai" in url:
        return "kula"

    if "workorai.com" in url:
        return "workorai"

    if "myworkdayjobs.com" in url:
        return "workday"

    if "linkedin.com" in url:
        return "linkedin"

    return "direct"


def prepare():

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            id,
            company,
            title,
            url,
            application_url,
            pursuit_pitch,
            tailored_resume
        FROM developer_opportunities
        WHERE
            (revenue_path = 'employment' OR source = 'business_contract_remotive')
            AND pursuit_status = 'queued'
            AND tailored_resume IS NOT NULL
            AND demand_confidence >= 50
            AND execution_verified IS TRUE
            AND eligibility_status = 'eligible'
            AND target_quality_status = 'verified'
        ORDER BY pursuit_priority DESC;
    """)

    cols = [d[0] for d in cur.description]

    count = 0

    for row in cur.fetchall():

        job = dict(zip(cols, row))

        target_url = (
            job.get("application_url")
            or job.get("url")
            or ""
        )

        ats = platform(target_url)

        folder = PACKAGES / str(job["id"])
        folder.mkdir(exist_ok=True)

        (folder / "resume.txt").write_text(
            job.get("tailored_resume") or ""
        )

        (folder / "message.txt").write_text(
            job.get("pursuit_pitch") or ""
        )

        (folder / "application_url.txt").write_text(
            target_url
        )

        (folder / "README.txt").write_text(
            f"""Company: {job.get('company')}
Role: {job.get('title')}
Platform: {ats}
Application URL: {target_url}

STATUS:
Prepared for review.

Files:
resume.txt
message.txt
application_url.txt
"""
        )

        cur.execute("""
            UPDATE developer_opportunities
            SET
                application_platform = %s,
                application_package_path = %s,
                application_status = 'ready_for_review',
                application_prepared_at = NOW()
            WHERE id = %s;
        """, (
            ats,
            str(folder),
            job["id"]
        ))

        count += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"Application packages prepared: {count}")


def approve(opportunity_id):

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        UPDATE developer_opportunities
        SET
            application_status = 'approved',
            application_approved_at = NOW()
        WHERE id = %s
        AND application_status = 'ready_for_review';
    """, (opportunity_id,))

    conn.commit()

    print(
        f"Approved application {opportunity_id}: "
        f"{cur.rowcount}"
    )

    cur.close()
    conn.close()


if __name__ == "__main__":

    if len(sys.argv) == 1 or sys.argv[1] == "--prepare":
        prepare()

    elif sys.argv[1] == "--approve":
        approve(int(sys.argv[2]))
