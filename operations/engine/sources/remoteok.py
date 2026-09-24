import requests
from datetime import datetime, timezone
from urllib.parse import urlsplit


REMOTEOK_API = "https://remoteok.com/api"


def fetch_remoteok_jobs():
    headers = {
        "User-Agent": "IMALI-Work-Agent/1.0"
    }

    response = requests.get(
        REMOTEOK_API,
        headers=headers,
        timeout=30
    )

    response.raise_for_status()

    data = response.json()

    opportunities = []

    for job in data:

        if not isinstance(job, dict):
            continue

        job_id = job.get("id")

        if not job_id:
            continue

        position = job.get("position") or ""
        description = job.get("description") or ""

        tags = job.get("tags") or []

        if isinstance(tags, list):
            tag_text = " ".join(str(tag) for tag in tags)
        else:
            tag_text = str(tags)

        full_description = f"""
{description}

Skills / Tags:
{tag_text}
""".strip()

        url = job.get("url")

        if url and url.startswith("/"):
            url = "https://remoteok.com" + url

        opportunity = {
            "source": "remoteok",
            "source_id": str(job_id),

            "title": position,

            "company": (
                job.get("company")
                or job.get("company_name")
                or ""
            ),

            "description": full_description,

            "url": url or "",
            # Source-provided candidate only; target/execution verification stays separate.
            "application_url": candidate_url(job.get("apply_url") or url),
            "source_posted_at": posted_at(job),

            "budget": _salary(job),

            "location": (
                job.get("location")
                or "Remote"
            )
        }

        opportunities.append(opportunity)

    return opportunities


def _salary(job):

    minimum = job.get("salary_min")
    maximum = job.get("salary_max")

    if minimum and maximum:
        return f"${minimum:,} - ${maximum:,}"

    if minimum:
        return f"${minimum:,}+"

    if maximum:
        return f"Up to ${maximum:,}"

    return ""


def candidate_url(value):
    try:
        u=urlsplit(str(value or ""))
        return str(value) if u.scheme in ("https","http") and u.hostname and not u.username and not u.password else None
    except ValueError:return None

def posted_at(job):
    try:
        if job.get("date"):return datetime.fromisoformat(str(job["date"]).replace("Z","+00:00")).isoformat()
        if job.get("epoch"):return datetime.fromtimestamp(float(job["epoch"]),timezone.utc).isoformat()
    except (ValueError,TypeError,OverflowError):pass
    return None
