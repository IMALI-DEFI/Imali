import re
from urllib.parse import urlparse

from work_agent import get_db


# ============================================================
# ELIGIBILITY
# ============================================================

NON_US_REGION_PATTERNS = [
    (
        "LATAM restricted",
        r"""
        (?:
            \(\s*latam\s*\)
            |
            remote\s*\([^)]*\blatam\b[^)]*\)
            |
            \blatam\s+only\b
            |
            \bonly\s+(?:in|from)\s+latam\b
            |
            \bcandidates?\s+(?:in|from)\s+latam\b
            |
            \bbased\s+in\s+latam\b
            |
            \blatin\s+america\s+only\b
        )
        """,
    ),
    (
        "India restricted",
        r"""
        (?:
            \(\s*india\s*\)
            |
            \bindia\s+only\b
            |
            \bonly\s+(?:in|from)\s+india\b
            |
            \bcandidates?\s+(?:in|from)\s+india\b
        )
        """,
    ),
    (
        "Europe restricted",
        r"""
        (?:
            \beurope\s+only\b
            |
            \beu\s+only\b
            |
            \bonly\s+(?:in|from)\s+(?:europe|eu)\b
            |
            \bcandidates?\s+(?:in|from)\s+(?:europe|eu)\b
        )
        """,
    ),
]


REVIEW_PATTERNS = [
    (
        "Citizenship requirement needs review",
        r"\b(?:us|u\.s\.)\s+citizenship\s+required\b"
    ),
    (
        "Citizenship requirement needs review",
        r"\bmust\s+be\s+(?:a\s+)?(?:us|u\.s\.)\s+citizen\b"
    ),
    (
        "Security clearance requirement needs review",
        r"\b(?:security\s+clearance|secret\s+clearance|top\s+secret|ts\/sci)\b"
    ),
    (
        "Onsite requirement needs review",
        r"\b(?:onsite|on-site)\b"
    ),
]


def combined_text(row):
    return " ".join(
        str(row.get(field) or "")
        for field in (
            "title",
            "description",
            "location",
        )
    )


def determine_eligibility(row):
    text = combined_text(row)

    for reason, pattern in NON_US_REGION_PATTERNS:
        if re.search(
            pattern,
            text,
            flags=re.I | re.X,
        ):
            return "ineligible", reason

    for reason, pattern in REVIEW_PATTERNS:
        if re.search(pattern, text, flags=re.I):
            return "review", reason

    return "eligible", "No explicit eligibility restriction detected."


# ============================================================
# EXECUTION TARGET QUALITY
# ============================================================

GENERIC_TARGET_PATTERNS = [
    (
        "Generic Y Combinator application page",
        r"^https?://(?:www\.)?ycombinator\.com/apply/?(?:\?.*)?$",
    ),
    (
        "LinkedIn feed post is not a verified job application",
        r"^https?://(?:www\.)?linkedin\.com/feed/update/",
    ),
]


GOOD_ATS_DOMAINS = (
    "greenhouse.io",
    "boards.greenhouse.io",
    "job-boards.greenhouse.io",
    "lever.co",
    "jobs.lever.co",
    "ashbyhq.com",
    "jobs.ashbyhq.com",
    "workable.com",
    "apply.workable.com",
    "smartrecruiters.com",
)


def is_root_homepage(url):
    try:
        parsed = urlparse(url)
    except Exception:
        return False

    path = (parsed.path or "/").strip()

    return path in ("", "/")


def determine_target_quality(row):
    revenue_path = str(
        row.get("revenue_path") or ""
    )

    application_url = str(
        row.get("application_url") or ""
    ).strip()

    application_email = str(
        row.get("application_email") or ""
    ).strip()

    outreach_email = str(
        row.get("outreach_contact_email") or ""
    ).strip()

    # --------------------------------------------------------
    # Government procurement
    #
    # Procurement uses the official solicitation/package as its
    # execution target. It must not require a commercial outreach
    # email merely to pass target-quality verification.
    #
    # Final source verification remains independent and submission
    # still requires human authorization.
    # --------------------------------------------------------
    source = str(row.get("source") or "").strip().lower()
    procurement_status = str(
        row.get("procurement_status") or ""
    ).strip().lower()
    procurement_package_path = str(
        row.get("procurement_package_path") or ""
    ).strip()

    procurement_qualified = (
        row.get("procurement_qualified") is True
    )

    procurement_source = (
        source == "sam_gov"
        or source.startswith("sam_gov_")
    )

    procurement_ready = (
        procurement_qualified
        and procurement_source
        and (
            procurement_status in (
                "qualified",
                "package_ready",
            )
            or bool(procurement_package_path)
        )
    )

    if procurement_ready:
        return (
            "verified",
            "Qualified government procurement target/package available; "
            "final source verification and human authorization still required.",
        )

    if procurement_source:
        return (
            "review",
            "Government procurement opportunity has not completed "
            "qualification/package preparation.",
        )

    # --------------------------------------------------------
    # Business outreach
    # --------------------------------------------------------

    if revenue_path in (
        "direct_contract",
        "consulting_outreach",
        "managed_delivery",
        "partnership",
    ) and source != "business_contract_remotive":
        if outreach_email or application_email:
            return (
                "verified",
                "Explicit contact email available.",
            )

        return (
            "review",
            "Business opportunity requires a verified contact.",
        )

    # --------------------------------------------------------
    # Employment/application
    # --------------------------------------------------------

    if application_email:
        return (
            "verified",
            "Explicit application email available.",
        )

    if not application_url:
        return (
            "blocked",
            "No application URL or application email.",
        )

    for reason, pattern in GENERIC_TARGET_PATTERNS:
        if re.search(pattern, application_url, re.I):
            return "blocked", reason

    parsed = urlparse(application_url)
    domain = (parsed.netloc or "").lower()

    if any(
        domain == d or domain.endswith("." + d)
        for d in GOOD_ATS_DOMAINS
    ):
        return (
            "verified",
            "Recognized job/ATS application target.",
        )

    # A root homepage is not enough evidence of an application.
    if is_root_homepage(application_url):
        return (
            "review",
            "URL points to a site homepage rather than a job-specific application.",
        )

    # Telegram channel post alone is not an application target.
    if re.search(
        r"^https?://t\.me/[^/]+/\d+/?$",
        application_url,
        re.I,
    ):
        return (
            "review",
            "Telegram post is not itself a verified application target.",
        )

    return (
        "verified",
        "Specific application target available.",
    )


# ============================================================
# DATABASE
# ============================================================


def main():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            id,
            title,
            company,
            description,
            location,
            revenue_path,
            application_url,
            application_email,
            outreach_contact_email,
            source,
            procurement_qualified,
            procurement_status,
            procurement_package_path,
            execution_verified,
            execution_source_verified,
            execution_status

        FROM developer_opportunities

        WHERE
            source != 'test'
            AND pursuit_status = 'queued'

        ORDER BY
            pursuit_priority DESC NULLS LAST,
            id;
    """)

    columns = [
        desc[0]
        for desc in cur.description
    ]

    rows = [
        dict(zip(columns, row))
        for row in cur.fetchall()
    ]

    eligible = 0
    review = 0
    ineligible = 0

    target_verified = 0
    target_review = 0
    target_blocked = 0

    print()
    print("=" * 86)
    print("IMALI ELIGIBILITY + EXECUTION TARGET GUARD")
    print("=" * 86)

    for row in rows:
        eligibility_status, eligibility_reason = (
            determine_eligibility(row)
        )

        target_status, target_reason = (
            determine_target_quality(row)
        )

        if eligibility_status == "eligible":
            eligible += 1
        elif eligibility_status == "review":
            review += 1
        else:
            ineligible += 1

        if target_status == "verified":
            target_verified += 1
        elif target_status == "review":
            target_review += 1
        else:
            target_blocked += 1

        block_execution = (
            eligibility_status != "eligible"
            or target_status != "verified"
        )

        execution_reason = None

        if eligibility_status != "eligible":
            execution_reason = (
                "Eligibility guard: "
                + eligibility_reason
            )

        elif target_status != "verified":
            execution_reason = (
                "Execution target guard: "
                + target_reason
            )

        cur.execute(
            """
            UPDATE developer_opportunities

            SET
                eligibility_status = %s,
                eligibility_reason = %s,
                eligibility_checked_at = NOW(),

                target_quality_status = %s,
                target_quality_reason = %s,
                target_quality_checked_at = NOW(),

                execution_verified =
                    CASE
                        WHEN %s
                        THEN FALSE
                        ELSE TRUE
                    END,

                execution_source_verified =
                    CASE
                        WHEN %s
                        THEN FALSE
                        ELSE execution_source_verified
                    END,

                execution_status =
                    CASE
                        WHEN %s
                        THEN 'blocked'
                        ELSE 'pending_verification'
                    END,

                execution_reason =
                    CASE
                        WHEN %s
                        THEN %s
                        ELSE 'Eligibility and execution target guards passed.'
                    END

            WHERE id = %s;
            """,
            (
                eligibility_status,
                eligibility_reason,
                target_status,
                target_reason,
                block_execution,
                block_execution,
                block_execution,
                block_execution,
                execution_reason,
                row["id"],
            ),
        )

        state = (
            "BLOCKED"
            if block_execution
            else "PASS"
        )

        print(
            f"{state:7} | "
            f"{row['id']:5} | "
            f"{eligibility_status:10} | "
            f"{target_status:8} | "
            f"{row.get('company') or '[NO COMPANY]'} | "
            f"{row.get('title') or ''}"
        )

        if block_execution:
            print(
                f"        -> "
                f"{execution_reason}"
            )

    conn.commit()

    print()
    print("-" * 86)
    print("ELIGIBILITY")
    print(f"eligible:    {eligible}")
    print(f"review:      {review}")
    print(f"ineligible:  {ineligible}")
    print()
    print("TARGET QUALITY")
    print(f"verified:    {target_verified}")
    print(f"review:      {target_review}")
    print(f"blocked:     {target_blocked}")
    print("-" * 86)

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
