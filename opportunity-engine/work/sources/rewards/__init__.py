#!/usr/bin/env python3


def fetch_reward_opportunities():

    rows = []

    sources = []

    try:
        from .devpost import fetch_devpost_rewards

        sources.append(
            (
                "Devpost",
                fetch_devpost_rewards,
            )
        )

    except Exception as exc:
        print(
            "Devpost import failed:",
            exc
        )

    try:
        from .kaggle import fetch_kaggle_rewards

        sources.append(
            (
                "Kaggle",
                fetch_kaggle_rewards,
            )
        )

    except Exception as exc:
        print(
            "Kaggle import failed:",
            exc
        )

    for name, fetcher in sources:

        try:

            found = fetcher()

            print(
                f"{name}:",
                len(found)
            )

            rows.extend(found)

        except Exception as exc:

            print(
                f"{name} failed:",
                exc
            )

    print(
        "Total reward opportunities:",
        len(rows)
    )

    return rows
