#!/usr/bin/env python3

import re


def extract_money(text):

    values = []

    for raw in re.findall(
        r"\$\s*([\d,]+(?:\.\d+)?)",
        str(text or "")
    ):

        try:
            values.append(
                float(
                    raw.replace(",", "")
                )
            )

        except ValueError:
            pass

    return max(values) if values else 0


def reward_record(
    source,
    source_id,
    title,
    description,
    url,
    reward_value=0,
    deadline=None,
):

    return {
        "source":
            source,

        "source_id":
            str(source_id),

        "title":
            str(title or "").strip(),

        "company":
            source.replace(
                "reward_",
                ""
            ).replace(
                "_",
                " "
            ).title(),

        "description":
            str(description or "").strip(),

        "url":
            url,

        "application_url":
            url,

        "location":
            "Online",

        "revenue_path_hint":
            "reward",

        "reward_opportunity":
            True,

        "reward_value_hint":
            float(reward_value or 0),

        "reward_deadline_hint":
            deadline,

        "solicitation_due_at":
            deadline,
    }
