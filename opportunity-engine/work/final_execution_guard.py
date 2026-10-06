#!/usr/bin/env python3

import os
from urllib.parse import urlparse

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_DSN = os.getenv(
    "WORK_AGENT_DB_DSN",
    "dbname=imali user=sniperuser host=localhost"
)


def db():
    return psycopg2.connect(DB_DSN)


def domain(value):

    if not value:
        return ""

    try:
        parsed = urlparse(value)

        host = (
            parsed.netloc
            or parsed.path.split("/")[0]
        )

        return host.lower().replace(
            "www.",
            ""
        )

    except Exception:
        return ""


def email_domain(email):

    if not email or "@" not in email:
        return ""

    return email.lower().split("@", 1)[1]


KNOWN_ATS = (
    "greenhouse.io",
    "lever.co",
    "ashbyhq.com",
    "workable.com",
    "myworkdayjobs.com",
    "applytojob.com",
    "kula.ai",
)



NON_EXECUTABLE_AGGREGATOR_DOMAINS = (
    "arbeitnow.co.uk",
    "arbeitnow.com",
    "remotive.com",
)


GENERIC_BAD_TARGET_FRAGMENTS = (
    "arbeitnow.com/blog/applying-for-german-citizenship",
    "ycombinator.com/apply",
    "jobgether.com/how-it-works",
    "jobgether.com/how_it_works",
)

GENERIC_PATHS = {
    "",
    "/",
    "/jobs",
    "/jobs/",
    "/careers",
    "/careers/",
    "/openings",
    "/openings/",
    "/positions",
    "/positions/",
}


def is_generic_bad_target(value):
    if not value:
        return True

    low = value.lower()

    return any(
        fragment in low
        for fragment in GENERIC_BAD_TARGET_FRAGMENTS
    )


def is_job_specific_application_url(value):
    """
    Conservative execution gate.

    A domain being an ATS is not enough. The URL must look like a
    specific job/application destination rather than a generic board.
    """
    if not value:
        return False

    if is_generic_bad_target(value):
        return False

    try:
        parsed = urlparse(value)
        host = parsed.netloc.lower()

        # Aggregators may discover opportunities but may never
        # serve as the autonomous execution destination.
        if any(
            host == d or host.endswith("." + d)
            for d in NON_EXECUTABLE_AGGREGATOR_DOMAINS
        ):
            return False
        path = (parsed.path or "/").lower()
        query = (parsed.query or "").lower()
    except Exception:
        return False

    if path in GENERIC_PATHS and not query:
        return False

    # Greenhouse
    if "greenhouse.io" in host:
        return (
            "/jobs/" in path
            or "/job/" in path
            or "gh_jid=" in query
        )

    # Lever
    if "lever.co" in host:
        parts = [
            x for x in path.split("/")
            if x
        ]
        return len(parts) >= 2

    # Ashby
    if "ashbyhq.com" in host:
        return (
            "/job/" in path
            or "/application/" in path
        )

    # Workable
    if "workable.com" in host:
        return (
            "/j/" in path
            or path.endswith("/apply/")
        )

    # JazzHR / ApplyToJob
    if "applytojob.com" in host:
        return (
            "/apply/" in path
            or path.count("/") >= 2
        )

    # Workday
    if "myworkdayjobs.com" in host:
        return "/job/" in path

    # Kula
    if "kula.ai" in host:
        return len([
            x for x in path.split("/")
            if x
        ]) >= 2

    # Direct company-hosted application pages.
    direct_hints = (
        "/apply",
        "/application",
        "/jobs/",
        "/job/",
        "/opening/",
        "/openings/",
        "/position/",
        "/positions/",
    )

    return any(
        hint in path
        for hint in direct_hints
    )


def is_contract_application_url(value):
    # Strict contract-application gate for first-party join/register flows.
    if is_job_specific_application_url(value):
        return True
    if not value or is_generic_bad_target(value):
        return False
    try:
        parsed=urlparse(value)
        host=parsed.netloc.lower()
        path=(parsed.path or '/').lower()
    except Exception:
        return False
    if any(host == d or host.endswith('.'+d) for d in NON_EXECUTABLE_AGGREGATOR_DOMAINS):
        return False
    return any(
        path == hint or path.startswith(hint + '/')
        for hint in ('/join','/register','/registration','/signup')
    )


def same_or_known_application_source(
    source_url,
    application_url
):

    if not application_url:
        return False

    if not is_job_specific_application_url(
        application_url
    ):
        return False

    app_domain = domain(
        application_url
    )

    source_domain = domain(
        source_url
    )

    if any(
        known in app_domain
        for known in KNOWN_ATS
    ):
        return True

    if (
        source_domain
        and app_domain
        and (
            source_domain == app_domain
            or source_domain.endswith(
                "." + app_domain
            )
            or app_domain.endswith(
                "." + source_domain
            )
        )
    ):
        return True

    return False


def run():

    conn = db()
    cur = conn.cursor()

    cur.execute("""
        SELECT
            id,
            source,
            company,
            title,
            url,
            revenue_path,
            execution_verified,
            application_url,
            application_email,
            outreach_contact_email,
            contact_type,
            source_age_days,
            automation_status,
            procurement_stage,
            procurement_status,
            procurement_qualified,
            procurement_package_path

        FROM developer_opportunities

        WHERE
            pursuit_status = 'queued'
            AND eligibility_status = 'eligible'
            AND (
                (
                    execution_verified IS TRUE
                    AND target_quality_status = 'verified'
                )
                OR
                (
                    (
                        source IN ('sam_gov', 'sam_gov_service')
                        OR source LIKE 'state_local_%'
                    )
                    AND procurement_qualified IS TRUE
                    AND (
                        (
                            procurement_status = 'package_ready'
                            AND procurement_package_path IS NOT NULL
                        )
                        OR procurement_status = 'qualified'
                    )
                )
            )

        ORDER BY pursuit_priority DESC;
    """)

    rows = cur.fetchall()

    passed = 0
    blocked = 0

    for row in rows:

        (
            oid,
            source,
            company,
            title,
            source_url,
            revenue_path,
            execution_verified,
            application_url,
            application_email,
            outreach_email,
            contact_type,
            source_age_days,
            automation_status,
            procurement_stage,
            procurement_status,
            procurement_qualified,
            procurement_package_path
        ) = row

        ok = False
        reason = ""

        # ----------------------------------------------------
        # Existing executor / human-handoff state
        # ----------------------------------------------------

        blocked_automation_states = {
            "captcha_required",
            "auth_required",
            "reference_required",
            "anti_bot_required",
            "question_required",
            "phone_required",
            "adapter_required",
            "target_required",
            "blocked",
            "submission_unconfirmed",
            "submitted",
        }

        if automation_status in blocked_automation_states:
            reason = (
                "Current automation state requires handoff, "
                "resolution, or is already terminal."
            )

        # ----------------------------------------------------
        # Freshness
        # ----------------------------------------------------

        elif (
            source == "hackernews"
            and (
                source_age_days is None
                or source_age_days > 45
            )
        ):
            reason = "Hacker News lead exceeds freshness limit."

        # ----------------------------------------------------
        # Strict contract application source
        # ----------------------------------------------------

        elif source == "business_contract_remotive":
            if application_url and is_contract_application_url(application_url):
                ok = True
                reason = "Verified contract application target passed final verifier."
            elif application_email:
                ok = True
                reason = "Explicit contract application email passed final verifier."
            else:
                reason = "No verified contract application destination."

        # ----------------------------------------------------
        # Employment
        # ----------------------------------------------------

        elif revenue_path == "employment":

            if application_url:

                if same_or_known_application_source(
                    source_url,
                    application_url
                ):
                    ok = True
                    reason = (
                        "Application URL passed source/ATS validation."
                    )

                else:
                    reason = (
                        "Application URL exists but source relationship "
                        "could not be confirmed."
                    )

            elif application_email:

                ok = True

                reason = (
                    "Explicit application email passed final verifier."
                )

            else:

                reason = (
                    "No verified application destination."
                )

        # ----------------------------------------------------
        # Business
        # ----------------------------------------------------

        elif (
            source in (
                "sam_gov",
                "sam_gov_service"
            )
            or source.startswith("state_local_")
        ):

            # Government procurement is not ordinary commercial
            # outreach. A business-development email is therefore
            # not required to advance a qualified solicitation to
            # final human review.

            if not procurement_qualified:

                reason = (
                    "Procurement opportunity has not passed "
                    "procurement qualification."
                )

            elif source == "sam_gov" and (
                procurement_status == "package_ready"
                and procurement_package_path
            ):

                ok = True
                reason = (
                    "Qualified SAM.gov procurement package passed "
                    "final source verification; human authorization "
                    "is still required before submission."
                )

            elif source == "sam_gov_service" and (
                procurement_stage == "solicitation"
                and procurement_status in (
                    "qualified",
                    "package_ready"
                )
            ):

                ok = True
                reason = (
                    "Qualified federal solicitation passed final "
                    "source verification; human authorization is "
                    "still required before submission."
                )

            else:

                reason = (
                    "Procurement opportunity requires additional "
                    "qualification or package preparation."
                )

        elif revenue_path in (
            "direct_contract",
            "managed_delivery",
            "consulting_outreach",
            "partnership",
            "direct_outreach"
        ):

            if (
                outreach_email
                and contact_type == "business_contact"
            ):

                ok = True
                reason = (
                    "Business contact passed final verifier."
                )

            else:

                reason = (
                    "No approved business-development contact."
                )

        else:

            reason = (
                "Revenue path requires manual handling."
            )

        cur.execute("""
            UPDATE developer_opportunities
            SET
                execution_source_verified = %s,

                execution_source_reason = %s,

                execution_status =
                    CASE
                        WHEN %s
                        THEN 'ready'
                        ELSE 'blocked'
                    END

            WHERE id = %s;
        """, (
            ok,
            reason,
            ok,
            oid
        ))

        # Re-read the result written by this verification pass.
        # A failed current verification must be able to revoke
        # stale execution authorization.
        cur.execute("""
            SELECT
                execution_source_verified,
                execution_source_reason,
                execution_status
            FROM developer_opportunities
            WHERE id = %s;
        """, (oid,))

        persisted = cur.fetchone()

        effective_ok = bool(
            persisted
            and persisted[0] is True
        )

        effective_reason = (
            persisted[1]
            if persisted and persisted[1]
            else reason
        )

        if effective_ok:
            passed += 1
            label = "READY"
        else:
            blocked += 1
            label = "BLOCKED"

        print(
            f"{label:8} | "
            f"{oid:5} | "
            f"{revenue_path:18} | "
            f"{company or '[NO COMPANY]'} | "
            f"{effective_reason}"
        )

    conn.commit()

    print()
    print("=" * 78)
    print(f"FINAL READY:   {passed}")
    print(f"FINAL BLOCKED: {blocked}")
    print("=" * 78)

    cur.close()
    conn.close()


if __name__ == "__main__":
    run()
