#!/usr/bin/env python3

import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

from .common import reward_record


URL = "https://devpost.com/hackathons"

HEADERS = {
    "User-Agent":
        "Mozilla/5.0 IMALI-Rewards-Agent/1.0"
}


def money(text):

    values = []

    for raw in re.findall(
        r"\$\s*([\d,]+(?:\.\d+)?)",
        str(text or "")
    ):
        try:
            values.append(
                float(raw.replace(",", ""))
            )
        except ValueError:
            pass

    return max(values) if values else 0


def fetch_devpost_rewards():

    r = requests.get(
        URL,
        headers=HEADERS,
        timeout=30,
    )

    r.raise_for_status()

    soup = BeautifulSoup(
        r.text,
        "html.parser"
    )

    results = []
    seen = set()

    for link in soup.find_all(
        "a",
        href=True
    ):

        href = str(
            link.get("href") or ""
        )

        text = " ".join(
            link.stripped_strings
        )

        if not href:
            continue

        combined = (
            text + " " + href
        ).lower()

        if not any(
            term in combined
            for term in (
                "hackathon",
                "challenge",
                "prize",
            )
        ):
            continue

        prize = money(text)

        # We only want explicit monetary rewards.
        if prize <= 0:
            continue

        url = urljoin(
            "https://devpost.com",
            href
        )

        key = url.lower()

        if key in seen:
            continue

        seen.add(key)

        title = (
            text[:180]
            or "Devpost Hackathon"
        )

        results.append(
            reward_record(
                source="reward_devpost",
                source_id=url,
                title=title,
                description=text,
                url=url,
                reward_value=prize,
            )
        )

    print(
        "Devpost explicit cash rewards:",
        len(results)
    )

    return results


if __name__ == "__main__":

    rows = fetch_devpost_rewards()

    for row in rows[:25]:
        print(
            row["reward_value_hint"],
            "|",
            row["title"],
            "|",
            row["url"],
        )
