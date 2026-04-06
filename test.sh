#!/usr/bin/env bash
# Creates 10 users and 10 posts each against a locally running Lilypad API.
# Usage: bash test.sh

set -euo pipefail

BASE="http://localhost:3000/api"
COOKIE_DIR=$(mktemp -d)

cleanup() { rm -rf "$COOKIE_DIR"; }
trap cleanup EXIT

# ── Locations (spread around Dundee) ─────────────────────────────────────────
declare -a LATS=(56.4620 56.4700 56.4550 56.4800 56.4650 56.4500 56.4750 56.4580 56.4680 56.4530)
declare -a LONS=(-2.9707 -2.9800 -2.9600 -2.9500 -3.0000 -2.9400 -2.9650 -2.9750 -2.9550 -2.9800)
declare -a DNAMES=(
  "Dundee City Centre"
  "Dundee West End"
  "Dundee Waterfront"
  "Dundee Law"
  "Dundee Lochee"
  "Broughty Ferry"
  "Dundee Blackness"
  "Dundee Stobswell"
  "Dundee Menzieshill"
  "Dundee Ferry"
)

# ── Post content templates ────────────────────────────────────────────────────
declare -a CONTENTS=(
  "Just had the best coffee in town"
  "Beautiful day out here"
  "Working from home today"
  "Anyone know a good restaurant nearby"
  "The weekend cannot come soon enough"
  "Just finished a great run along the waterfront"
  "New cafe opening downtown looks amazing"
  "Cannot believe how busy the city is today"
  "Spotted a seal by the harbour"
  "Loving this city more every day"
)

ok()   { echo "  ✓ $*"; }
fail() { echo "  ✗ $*"; }

# ── Main loop ─────────────────────────────────────────────────────────────────
for i in $(seq 1 10); do
  EMAIL="testuser${i}@lilypad.test"
  PASS="Password${i}123!"
  NAME="testuser${i}"
  JAR="$COOKIE_DIR/user${i}.txt"

  echo ""
  echo "── User $i: $NAME ──────────────────────────────────────────"

  # Sign up (better-auth sets a session cookie on successful signup)
  SIGNUP=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE/auth/sign-up/email" \
    -H "Content-Type: application/json" \
    -c "$JAR" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"name\":\"$NAME\"}")

  SIGNUP_CODE=$(echo "$SIGNUP" | tail -n 1)
  SIGNUP_BODY=$(echo "$SIGNUP" | sed '$d')

  if [ "$SIGNUP_CODE" -eq 200 ] || [ "$SIGNUP_CODE" -eq 201 ]; then
    ok "Signed up ($SIGNUP_CODE)"
  else
    fail "Sign-up failed ($SIGNUP_CODE): $SIGNUP_BODY"
    continue
  fi

  # Create 10 posts
  for j in $(seq 1 10); do
    IDX=$(( (i + j) % 10 ))
    LAT="${LATS[$IDX]}"
    LON="${LONS[$IDX]}"
    DNAME="${DNAMES[$IDX]}"
    CONTENT="${CONTENTS[$IDX]} — post $j"

    BODY=$(printf '{"content":"%s","locality":{"lat":%s,"lon":%s,"displayName":"%s"}}' \
      "$CONTENT" "$LAT" "$LON" "$DNAME")

    POST=$(curl -s -w "\n%{http_code}" \
      -X POST "$BASE/content/post" \
      -H "Content-Type: application/json" \
      -b "$JAR" \
      -d "$BODY")

    POST_CODE=$(echo "$POST" | tail -n 1)
    POST_BODY=$(echo "$POST" | sed '$d')

    if [ "$POST_CODE" -eq 200 ]; then
      ok "Post $j created at $DNAME"
    else
      fail "Post $j failed ($POST_CODE): $POST_BODY"
    fi
  done
done

echo ""
echo "── Done ─────────────────────────────────────────────────────"
echo "Created up to 10 users × 10 posts = 100 posts."
