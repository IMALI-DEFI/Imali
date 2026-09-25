#!/usr/bin/env bash
set -euo pipefail

SPORTS_ROOT=/home/opc/sports-jedi
IMALI_ROOT=/home/opc/imali-sniper
PYTHON=/home/opc/imali-sniper/sniper-venv311/bin/python
STATE_FILE="$SPORTS_ROOT/marketing/output/last-published-date.txt"
TODAY=$(date +%F)

if [[ -f "$STATE_FILE" ]] &&
   [[ "$(cat "$STATE_FILE")" == "$TODAY" ]]; then
    echo "Sports Jedi marketing already published today."
    exit 0
fi

"$PYTHON" "$SPORTS_ROOT/marketing/generate_marketing.py"

PACKAGE=$(mktemp /tmp/sports-jedi-package.XXXXXX)
trap 'rm -f "$PACKAGE"' EXIT
cp "$SPORTS_ROOT/marketing/output/latest.json" "$PACKAGE"
IMAGE=$(jq -r '.image_file' "$PACKAGE")
MESSAGE=$(jq -r '.telegram' "$PACKAGE")
UPLOAD_IMAGE="/tmp/sports-jedi-${TODAY}.png"

cp "$IMAGE" "$UPLOAD_IMAGE"
chmod 644 "$UPLOAD_IMAGE"

set -a
source "$IMALI_ROOT/.env"
set +a

RESPONSE=$(
    curl -sS \
    --form-string 'chat_id=@sportsjedi' \
    --form "photo=@${UPLOAD_IMAGE};type=image/png" \
    --form-string "caption=${MESSAGE}" \
    "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto"
)

if [[ "$(jq -r '.ok' <<<"$RESPONSE")" != "true" ]]; then
    echo "$RESPONSE" | jq .
    echo "Sports Jedi Telegram publication failed."
    exit 1
fi

MESSAGE_ID=$(jq -r '.result.message_id' <<<"$RESPONSE")

printf '%s\n' "$TODAY" > "$STATE_FILE"
# Save the anti-duplicate marker before receipt persistence: a disk error must
# never turn an acknowledged send into an automatic duplicate on the next run.
CAMPAIGN=$(jq -er '.campaign_id | select(test("^[A-Za-z0-9_-]+$"))' "$PACKAGE")
RECEIPTS="$SPORTS_ROOT/marketing/output/telegram-receipts"
mkdir -p "$RECEIPTS"
RECEIPT_TMP=$(mktemp "$RECEIPTS/.receipt.XXXXXX")
jq -e --arg campaign "$CAMPAIGN" '
  select(.ok == true and .result.chat.username == "sportsjedi") |
  .result | select((.message_id | type) == "number" and .message_id > 0 and (.date | type) == "number") |
  {campaign_id:$campaign,channel:"sportsjedi",message_id:.message_id,
   public_url:("https://t.me/sportsjedi/" + (.message_id|tostring)),
   published_at:(.date|todateiso8601),evidence:"telegram_sendPhoto_receipt"}
' <<<"$RESPONSE" > "$RECEIPT_TMP"
chmod 644 "$RECEIPT_TMP"
mv "$RECEIPT_TMP" "$RECEIPTS/$CAMPAIGN.json"

rm -f "$UPLOAD_IMAGE"
unset TELEGRAM_BOT_TOKEN

echo "Sports Jedi post published successfully."
echo "Telegram message ID: $MESSAGE_ID"
