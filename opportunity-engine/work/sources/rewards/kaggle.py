#!/usr/bin/env python3

import csv
import io
import re
import subprocess

from .common import reward_record


def reward_number(value):

    text = str(
        value or ""
    )

    numbers = re.findall(
        r"[\d,]+(?:\.\d+)?",
        text
    )

    if not numbers:
        return 0

    try:
        return float(
            numbers[0].replace(",", "")
        )
    except ValueError:
        return 0


def fetch_kaggle_rewards():

    cmd = [
        "kaggle",
        "competitions",
        "list",
        "--group",
        "general",
        "--sort-by",
        "recentlyCreated",
        "--page-size",
        "100",
        "--csv",
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=60,
    )

    if result.returncode != 0:

        print(
            "Kaggle reward source unavailable:",
            result.stderr.strip()[:400]
        )

        return []

    reader = csv.DictReader(
        io.StringIO(
            result.stdout
        )
    )

    rows = []

    for item in reader:

        ref = str(
            item.get("ref") or ""
        ).strip()

        if not ref:
            continue

        reward_text = str(
            item.get("reward") or ""
        ).strip()

        reward_value = reward_number(
            reward_text
        )

        if reward_value <= 0:
            continue

        deadline = str(
            item.get("deadline") or ""
        ).strip()

        category = str(
            item.get("category") or ""
        ).strip()

        url = (
            "https://www.kaggle.com/"
            "competitions/"
            + ref
        )

        description = (
            f"Kaggle competition. "
            f"Reward: {reward_text}. "
            f"Category: {category}. "
            f"Deadline: {deadline}."
        )

        rows.append(
            reward_record(
                source="reward_kaggle",
                source_id=ref,
                title=ref.replace(
                    "-",
                    " "
                ).title(),
                description=description,
                url=url,
                reward_value=reward_value,
                deadline=deadline or None,
            )
        )

    print(
        "Kaggle explicit cash rewards:",
        len(rows)
    )

    return rows


if __name__ == "__main__":

    rows = fetch_kaggle_rewards()

    for row in rows[:30]:
        print(
            row["reward_value_hint"],
            "|",
            row["title"],
            "|",
            row.get(
                "reward_deadline_hint"
            ),
        )
