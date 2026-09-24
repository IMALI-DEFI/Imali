#!/usr/bin/env python3

import json
import math
import textwrap
import uuid
from datetime import datetime, timezone
from pathlib import Path
from io import BytesIO

import requests
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/home/opc/sports-jedi/marketing")
OUTPUT_DIR = ROOT / "output"
IMAGE_DIR = ROOT / "images"
SOCIAL_DIR = ROOT / "social"

PROP_URL = "http://127.0.0.1:4100/api/picks/props"
SITE_URL = "https://sportsjedi.com/picks"
DISCLAIMER = "Sports analysis only. No outcome or profit is guaranteed."

LEAGUE = "NFL"
LEGS = 5
MIN_PRICE = -300
MAX_PRICE = 350
MIN_EFFECTIVE = 50


def font(size, bold=False):
    paths = [
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"
        if bold else "/usr/share/fonts/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/google-noto/NotoSans-Bold.ttf"
        if bold else "/usr/share/fonts/google-noto/NotoSans-Regular.ttf",
    ]

    for path in paths:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass

    return ImageFont.load_default()


def implied_probability(price):
    price = float(price)

    if price == 0:
        return None

    if price > 0:
        return 100 / (price + 100)

    return abs(price) / (abs(price) + 100)


def decimal_odds(price):
    price = float(price)

    if price > 0:
        return 1 + price / 100

    return 1 + 100 / abs(price)


def american_from_decimal(decimal):
    if decimal >= 2:
        return round((decimal - 1) * 100)

    return round(-100 / (decimal - 1))


def market_name(value):
    names = {
        "player_pass_yds": "Passing Yards",
        "player_rush_yds": "Rushing Yards",
        "player_reception_yds": "Receiving Yards",
        "player_receptions": "Receptions",
        "player_pass_tds": "Passing TDs",
        "player_anytime_td": "Anytime TD",
    }

    return names.get(
        str(value),
        str(value).replace("player_", "").replace("_", " ").title(),
    )


def get_player_parlay():
    response = requests.get(
        PROP_URL,
        params={"league": LEAGUE},
        timeout=30,
    )
    response.raise_for_status()

    payload = response.json()
    props = payload.get("data") or []

    candidates = []

    for prop in props:
        if prop.get('market') not in ['player_pass_yds','player_rush_yds','player_reception_yds','player_receptions','player_pass_tds','player_anytime_td']:
            continue
        try:
            price = float(prop.get("price"))

            if price < MIN_PRICE or price > MAX_PRICE:
                continue

            raw_confidence = prop.get("confidence")

            if raw_confidence is None:
                probability = implied_probability(price)
                effective = (
                    round(probability * 100)
                    if probability is not None
                    else None
                )
                confidence_source = "sportsbook_implied_probability"
            else:
                effective = float(raw_confidence)
                confidence_source = "sports_jedi_confidence"

            if effective is None or effective < MIN_EFFECTIVE:
                continue

            candidates.append({
                **prop,
                "effectiveConfidence": effective,
                "confidenceSource": confidence_source,
            })

        except (TypeError, ValueError):
            continue

    candidates.sort(
        key=lambda item: item["effectiveConfidence"],
        reverse=True,
    )

    selected = []
    players = set()
    signatures = set()

    for candidate in candidates:
        player = str(candidate.get("player") or "").strip()
        market = str(candidate.get("market") or "")
        pick = str(candidate.get("pick") or "")
        line = candidate.get("line")

        player_key = player.lower()
        signature = (
            player_key,
            market.lower(),
            pick.lower(),
            str(line),
        )

        if not player_key:
            continue

        if player_key in players or signature in signatures:
            continue

        players.add(player_key)
        signatures.add(signature)
        selected.append(candidate)

        if len(selected) == LEGS:
            break

    if len(selected) < LEGS:
        raise RuntimeError(
            f"Only {len(selected)} qualifying unique-player props "
            f"were available; {LEGS} required. Skipping."
        )

    combined_decimal = math.prod(
        decimal_odds(item["price"])
        for item in selected
    )

    combined_probability = 1 / combined_decimal

    return selected, {
        "combinedDecimal": round(combined_decimal, 2),
        "combinedAmerican": american_from_decimal(combined_decimal),
        "impliedProbability": round(combined_probability * 100, 1),
        "risk": "High",
    }



def get_player_team_artwork(player_name):
    """Resolve an NFL player to their current team and team badge."""
    try:
        response = requests.get(
            "https://www.thesportsdb.com/api/v1/json/123/searchplayers.php",
            params={"p": player_name},
            timeout=20,
        )
        response.raise_for_status()

        matches = response.json().get("player") or []

        match = next(
            (
                item
                for item in matches
                if str(item.get("strPlayer") or "").strip().lower()
                == str(player_name).strip().lower()
                and str(item.get("strSport") or "").lower()
                == "american football"
            ),
            matches[0] if matches else {},
        )

        team_name = str(match.get("strTeam") or "").strip()

        if not team_name:
            return {"team": "", "badge": ""}

        team_response = requests.get(
            "https://www.thesportsdb.com/api/v1/json/123/searchteams.php",
            params={"t": team_name},
            timeout=20,
        )
        team_response.raise_for_status()

        teams = team_response.json().get("teams") or []

        team = next(
            (
                item
                for item in teams
                if str(item.get("strTeam") or "").strip().lower()
                == team_name.lower()
            ),
            teams[0] if teams else {},
        )

        return {
            "team": team_name,
            "badge": (
                team.get("strBadge")
                or team.get("strTeamBadge")
                or ""
            ),
        }

    except Exception as exc:
        print(
            f"Player team artwork unavailable for "
            f"{player_name}: {exc}"
        )
        return {"team": "", "badge": ""}


def load_badge(url, size=58):
    """Download and resize a transparent team badge."""
    if not url:
        return None

    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()

        badge = Image.open(BytesIO(response.content)).convert("RGBA")
        badge.thumbnail((size, size), Image.LANCZOS)

        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        x = (size - badge.width) // 2
        y = (size - badge.height) // 2
        canvas.alpha_composite(badge, (x, y))

        return canvas

    except Exception as exc:
        print(f"Badge download unavailable: {exc}")
        return None


def build_campaign(legs, parlay):
    campaign_id = (
        "SJ_PARLAY_"
        + datetime.now().strftime("%Y%m%d")
        + "_"
        + uuid.uuid4().hex[:6].upper()
    )

    leg_text = []

    for leg in legs:
        artwork = get_player_team_artwork(leg["player"])
        leg["team"] = artwork["team"]
        leg["team_badge"] = artwork["badge"]

        leg_text.append(
            f"{leg['player']} — {leg['pick']} {leg['line']} "
            f"{market_name(leg['market'])}"
        )

    odds = parlay["combinedAmerican"]
    odds_text = f"+{odds}" if odds > 0 else str(odds)

    caption = (
        "🏈 SPORTS JEDI PLAYER PROP LONGSHOT\n\n"
        + "\n".join(
            f"{index}. {text}"
            for index, text in enumerate(leg_text, 1)
        )
        + f"\n\n5-player longshot • Estimated combined odds {odds_text}"
        + f"\nEstimated implied probability: "
          f"{parlay['impliedProbability']}%"
        + "\nRisk: HIGH"
        + f"\n\nFull board: {SITE_URL}"
        + "\n\n#SportsBetting #NFL #PlayerProps #SportsJedi"
        + f"\n\n{DISCLAIMER}"
    )

    return {
        "campaign_id": campaign_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "content_type": "player_parlay",
        "league": LEAGUE,
        "risk": "High",
        "legs": legs,
        "combined_decimal": parlay["combinedDecimal"],
        "combined_american": parlay["combinedAmerican"],
        "implied_probability": parlay["impliedProbability"],
        "confidence_label": "Odds-derived implied probability",
        "landing_page": SITE_URL,
        "instagram": caption,
        "facebook": caption,
        "threads": caption,
        "x": caption,
        "disclaimer": DISCLAIMER,
    }


def create_image(campaign):
    width = 1080
    height = 1080

    image = Image.new("RGB", (width, height), "#05090f")
    draw = ImageDraw.Draw(image)

    white = "#f4f7fb"
    cyan = "#3dd9f5"
    gray = "#9ca8ba"
    panel = "#0d1824"
    warning = "#f4c95d"

    draw.rounded_rectangle(
        (55, 55, 1025, 1025),
        radius=48,
        fill=panel,
        outline="#263747",
        width=4,
    )

    draw.text(
        (100, 95),
        "SPORTS JEDI",
        font=font(50, True),
        fill=white,
    )

    draw.text(
        (100, 160),
        "5-PLAYER PROP LONGSHOT",
        font=font(34, True),
        fill=cyan,
    )

    draw.text(
        (100, 215),
        "HIGH RISK",
        font=font(27, True),
        fill=warning,
    )

    y = 285

    for index, leg in enumerate(campaign["legs"], 1):
        player = str(leg["player"])
        selection = (
            f"{leg['pick']} {leg['line']} "
            f"{market_name(leg['market'])}"
        )

        badge = load_badge(leg.get("team_badge"), 58)

        if badge is not None:
            image.paste(
                badge,
                (100, y - 4),
                badge,
            )

        text_x = 175 if badge is not None else 100
        selection_x = 175 if badge is not None else 135

        draw.text(
            (text_x, y),
            f"{index}. {player}",
            font=font(31, True),
            fill=white,
        )

        for line in textwrap.wrap(selection, width=38):
            draw.text(
                (selection_x, y + 40),
                line,
                font=font(25),
                fill=gray,
            )
            y += 31

        y += 65

    odds = campaign["combined_american"]
    odds_text = f"+{odds}" if odds > 0 else str(odds)

    draw.text(
        (100, 800),
        f"EST. COMBINED ODDS  {odds_text}",
        font=font(31, True),
        fill=cyan,
    )

    draw.text(
        (100, 850),
        (
            f"Odds-derived implied probability: "
            f"{campaign['implied_probability']}%"
        ),
        font=font(24),
        fill=gray,
    )

    draw.text(
        (100, 910),
        "sportsjedi.com/picks",
        font=font(32, True),
        fill=cyan,
    )

    draw.text(
        (100, 960),
        "Analysis only • No outcome or profit is guaranteed",
        font=font(21),
        fill=gray,
    )

    image_file = (
        IMAGE_DIR / f"{campaign['campaign_id']}.png"
    )

    image.save(image_file)
    return image_file


def main():
    for directory in [OUTPUT_DIR, IMAGE_DIR, SOCIAL_DIR]:
        directory.mkdir(parents=True, exist_ok=True)

    legs, parlay = get_player_parlay()
    campaign = build_campaign(legs, parlay)
    image_file = create_image(campaign)

    campaign["image_file"] = str(image_file)

    package_file = (
        OUTPUT_DIR / f"{campaign['campaign_id']}.json"
    )

    social_file = (
        SOCIAL_DIR / f"{campaign['campaign_id']}.json"
    )

    content = json.dumps(campaign, indent=2)

    package_file.write_text(content)
    social_file.write_text(content)

    print("SPORTS_JEDI_PLAYER_PARLAY_PREVIEW=CREATED")
    print(f"Campaign: {campaign['campaign_id']}")
    print(f"Risk: {campaign['risk']}")
    print(f"Combined odds: {campaign['combined_american']}")
    print(
        "Implied probability: "
        f"{campaign['implied_probability']}%"
    )
    print(f"Image: {image_file}")
    print(f"Package: {package_file}")

    for index, leg in enumerate(campaign["legs"], 1):
        print(
            f"{index}. {leg['player']} | "
            f"{leg['pick']} {leg['line']} | "
            f"{market_name(leg['market'])} | "
            f"{leg['price']}"
        )


if __name__ == "__main__":
    main()
