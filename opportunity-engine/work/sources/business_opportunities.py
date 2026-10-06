#!/usr/bin/env python3

import hashlib
import html
import re
from datetime import datetime, timezone

import requests


REMOTIVE_API = "https://remotive.com/api/remote-jobs"
ARBEITNOW_API = "https://www.arbeitnow.com/api/job-board-api"


BUSINESS_TERMS = (
    "contract",
    "contractor",
    "consultant",
    "consulting",
    "freelance",
    "freelancer",
    "fractional",
    "project based",
    "project-based",
    "fixed price",
    "fixed-price",
    "statement of work",
    "scope of work",
    "vendor",
    "subcontract",
    "subcontractor",
    "implementation partner",
    "development partner",
    "staff augmentation",
    "agency",
    "services",
    "integration",
)

# Roles we actually want IMALI to deliver directly or through
# a technical contractor/provider.

DELIVERY_TITLE_TERMS = (
    "software engineer",
    "software developer",
    "frontend engineer",
    "front end engineer",
    "front-end engineer",
    "frontend developer",
    "front-end developer",
    "backend engineer",
    "back end engineer",
    "back-end engineer",
    "backend developer",
    "full stack engineer",
    "full-stack engineer",
    "fullstack engineer",
    "full stack developer",
    "full-stack developer",
    "fullstack developer",
    "python developer",
    "python engineer",
    "javascript developer",
    "typescript developer",
    "react developer",
    "react engineer",
    "node developer",
    "node.js developer",
    "api developer",
    "api engineer",
    "devops engineer",
    "platform engineer",
    "cloud engineer",
    "site reliability engineer",
    "sre",
    "data engineer",
    "machine learning engineer",
    "ml engineer",
    "ai engineer",
    "ai/ml engineer",
    "ai architect",
    "technical architect",
    "solution architect",
    "solutions architect",
    "security engineer",
    "blockchain developer",
    "blockchain engineer",
    "web3 developer",
    "web3 engineer",
    "solidity developer",
    "shopify developer",
    "automation engineer",
    "integration engineer",
)

EXCLUDED_TITLE_TERMS = (
    "sales",
    "account executive",
    "business development",
    "marketing",
    "product manager",
    "product designer",
    "ux designer",
    "ui designer",
    "customer success",
    "support",
    "recruiter",
    "talent",
    "hr ",
    "human resources",
    "intern",
    "internship",
    "working student",
    "werkstudent",
    "student",
    "content reviewer",
    "copywriter",
)

TECHNICAL_TERMS = (
    "software",
    "developer",
    "engineer",
    "frontend",
    "backend",
    "full stack",
    "full-stack",
    "python",
    "react",
    "node",
    "javascript",
    "typescript",
    "api",
    "automation",
    "ai",
    "machine learning",
    "devops",
    "cloud",
    "platform",
    "data engineer",
    "blockchain",
    "web3",
    "solidity",
)

STRONG_MANAGED_TERMS = (
    "subcontract",
    "subcontractor",
    "vendor",
    "statement of work",
    "scope of work",
    "implementation partner",
    "development partner",
    "staff augmentation",
    "agency overflow",
)

CONSULTING_TERMS = (
    "consultant",
    "consulting",
    "fractional",
    "advisory",
)

EMPLOYMENT_ONLY_TERMS = (
    "permanent employee",
    "full-time employee",
    "full time employee",
    "employee benefits",
)


def clean_html(value):
    value = html.unescape(str(value or ""))
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def business_intent(text, title=""):
    value = (text or "").lower()
    title_value = (title or "").lower()

    # Require the actual role title to be technical.
    # This prevents sales/marketing listings from passing merely
    # because their descriptions mention software or integrations.
    technical_title = any(
        term in title_value
        for term in DELIVERY_TITLE_TERMS
    )

    excluded_title = any(
        term in title_value
        for term in EXCLUDED_TITLE_TERMS
    )

    business = any(
        term in value
        for term in BUSINESS_TERMS
    )

    strong_business = any(
        term in value
        for term in STRONG_MANAGED_TERMS
    )

    employment_only = any(
        term in value
        for term in EMPLOYMENT_ONLY_TERMS
    )

    return (
        technical_title
        and not excluded_title
        and (business or strong_business)
        and not employment_only
    )


def revenue_hint(text):
    value = (text or "").lower()

    if any(
        term in value
        for term in STRONG_MANAGED_TERMS
    ):
        return "managed_delivery"

    if any(
        term in value
        for term in CONSULTING_TERMS
    ):
        return "consulting_outreach"

    if any(
        term in value
        for term in (
            "contract",
            "contractor",
            "freelance",
            "freelancer",
            "project based",
            "project-based",
            "fixed price",
            "fixed-price",
        )
    ):
        return "direct_contract"

    return None



# ============================================================
# JOB DESTINATION VALIDATION
# ============================================================

BAD_JOB_URL_TERMS = (
    "/blog/",
    "/article/",
    "/articles/",
    "/guide/",
    "/guides/",
    "citizenship",
    "einburgerung",
    "einbuergerung",
    "/visa/",
    "/immigration/",
)


def valid_job_destination(url):
    """
    Reject obvious editorial/informational destinations.
    This is deliberately conservative: uncertain URLs can still
    proceed to later execution/source verification.
    """
    value = str(url or "").strip().lower()

    if not value:
        return False

    if not value.startswith(("http://", "https://")):
        return False

    if any(term in value for term in BAD_JOB_URL_TERMS):
        return False

    return True


def stable_id(prefix, value):
    raw = f"{prefix}:{value}".encode()
    return hashlib.sha256(raw).hexdigest()[:32]


def fetch_remotive():
    response = requests.get(
        REMOTIVE_API,
        timeout=30,
        headers={
            "User-Agent": "IMALI-Work-Agent/1.0"
        },
    )

    response.raise_for_status()

    jobs = response.json().get(
        "jobs",
        []
    )

    results = []

    for job in jobs:
        title = str(
            job.get("title") or ""
        ).strip()

        company = str(
            job.get("company_name") or ""
        ).strip()

        description = clean_html(
            job.get("description")
        )

        job_type = str(
            job.get("job_type") or ""
        ).strip()

        text = (
            f"{title} {description} {job_type}"
        )

        if str(job_type).lower() not in ("contract", "freelance"):
            continue

        if not business_intent(text, title):
            continue

        url = str(
            job.get("url") or ""
        ).strip()

        published = job.get(
            "publication_date"
        )

        results.append({
            "source":
                "business_contract_remotive",

            "source_id":
                str(job.get("id"))
                if job.get("id")
                else stable_id(
                    "remotive",
                    url or text,
                ),

            "source_posted_at":
                published,

            "title":
                title,

            "company":
                company,

            "description":
                text,

            "url":
                url,

            "application_url":
                url,

            "location":
                job.get(
                    "candidate_required_location"
                )
                or "Remote",

            "budget":
                job.get("salary") or "",

            "raw_text":
                text,

            "revenue_path_hint":
                revenue_hint(text),
        })

    return results


def fetch_arbeitnow():
    results = []
    next_url = ARBEITNOW_API
    pages = 0

    while next_url and pages < 5:

        response = requests.get(
            next_url,
            timeout=30,
            headers={
                "User-Agent":
                    "IMALI-Work-Agent/1.0"
            },
        )

        response.raise_for_status()

        payload = response.json()

        for job in payload.get(
            "data",
            []
        ):
            title = str(
                job.get("title") or ""
            ).strip()

            company = str(
                job.get("company_name") or ""
            ).strip()

            description = clean_html(
                job.get("description")
            )

            tags = " ".join(
                str(x)
                for x in (
                    job.get("tags") or []
                )
            )

            text = (
                f"{title} "
                f"{description} "
                f"{tags}"
            )

            if not business_intent(text, title):
                continue

            url = str(
                job.get("url") or ""
            ).strip()

            # Never ingest obvious editorial/non-job destinations.
            if not valid_job_destination(url):
                continue

            slug = str(
                job.get("slug") or ""
            ).strip()

            created_at = job.get(
                "created_at"
            )

            # Arbeitnow may return Unix epoch seconds.
            # PostgreSQL source_posted_at expects a timestamp.
            if isinstance(created_at, (int, float)):
                created_at = datetime.fromtimestamp(
                    created_at,
                    tz=timezone.utc
                ).replace(tzinfo=None)

            elif isinstance(created_at, str):
                value = created_at.strip()

                if value.isdigit():
                    created_at = datetime.fromtimestamp(
                        int(value),
                        tz=timezone.utc
                    ).replace(tzinfo=None)

            source_id = (
                slug
                or stable_id(
                    "arbeitnow",
                    url or text,
                )
            )

            results.append({
                "source":
                    "business_arbeitnow",

                "source_id":
                    source_id,

                "source_posted_at":
                    created_at,

                "title":
                    title,

                "company":
                    company,

                "description":
                    text,

                "url":
                    url,

                "application_url":
                    url,

                "location":
                    job.get("location")
                    or (
                        "Remote"
                        if job.get("remote")
                        else ""
                    ),

                "budget":
                    "",

                "raw_text":
                    text,

                "revenue_path_hint":
                    revenue_hint(text),
            })

        links = payload.get(
            "links",
            {}
        )

        next_url = (
            links.get("next")
            if isinstance(
                links,
                dict
            )
            else None
        )

        pages += 1

    return results


def fetch_business_opportunities():
    all_results = []

    for name, fetcher in (
        ("Remotive", fetch_remotive),
        ("Arbeitnow", fetch_arbeitnow),
    ):
        try:
            rows = fetcher()

            print(
                f"Business source {name}: "
                f"{len(rows)} candidates"
            )

            all_results.extend(rows)

        except Exception as exc:
            print(
                f"Business source {name} "
                f"failed: {exc}"
            )

    # Deduplicate this source before the
    # Work Agent's normal DB dedupe.
    deduped = {}

    for row in all_results:
        key = (
            row.get("source"),
            row.get("source_id"),
        )

        deduped[key] = row

    return list(
        deduped.values()
    )


if __name__ == "__main__":
    rows = fetch_business_opportunities()

    print(
        "BUSINESS OPPORTUNITIES:",
        len(rows),
    )

    for row in rows[:20]:
        print(
            row["source"],
            "|",
            row["revenue_path_hint"],
            "|",
            row["company"],
            "|",
            row["title"],
        )
