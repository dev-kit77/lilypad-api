#!/usr/bin/env bash
# Tests the /special endpoints (report management) against a locally running Lilypad API.
# Requires an admin user and a reported user to be set up.
# Usage: bash test-special.sh

set -euo pipefail

BASE="http://localhost:3000/api"
COOKIE_DIR=$(mktemp -d)

cleanup() { rm -rf "$COOKIE_DIR"; }
trap cleanup EXIT

ok()   { echo "  ✓ $*"; }
fail() { echo "  ✗ $*"; }
debug() { echo "  → $*"; }

REPORTING_EMAIL="reporter-${RANDOM}@lilypad.test"
REPORTING_PASS="Password123!"
REPORTING_NAME="reporter"

TARGET_EMAIL="target-${RANDOM}@lilypad.test"
TARGET_PASS="Password123!"
TARGET_NAME="target"

ADMIN_EMAIL="admin-special-${RANDOM}@lilypad.test"
ADMIN_PASS="Password123!"
ADMIN_NAME="admin-special"

REPORTER_JAR="$COOKIE_DIR/reporter.txt"
TARGET_JAR="$COOKIE_DIR/target.txt"
ADMIN_JAR="$COOKIE_DIR/admin.txt"

echo ""
echo "── Setup: Creating users ──────────────────────────────────────"

echo "Creating reporter user..."
debug "POST $BASE/auth/sign-up/email"
debug "Body: {\"email\":\"$REPORTING_EMAIL\",\"password\":\"$REPORTING_PASS\",\"name\":\"$REPORTING_NAME\"}"
SIGNUP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -c "$REPORTER_JAR" \
  -d "{\"email\":\"$REPORTING_EMAIL\",\"password\":\"$REPORTING_PASS\",\"name\":\"$REPORTING_NAME\"}")
CODE=$(echo "$SIGNUP" | tail -n 1)
BODY=$(echo "$SIGNUP" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 200 ] || [ "$CODE" -eq 201 ]; then
  ok "Reporter signed up"
else
  fail "Reporter sign-up failed ($CODE)"
  exit 1
fi

echo "Creating target user..."
debug "POST $BASE/auth/sign-up/email"
debug "Body: {\"email\":\"$TARGET_EMAIL\",\"password\":\"$TARGET_PASS\",\"name\":\"$TARGET_NAME\"}"
SIGNUP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -c "$TARGET_JAR" \
  -d "{\"email\":\"$TARGET_EMAIL\",\"password\":\"$TARGET_PASS\",\"name\":\"$TARGET_NAME\"}")
CODE=$(echo "$SIGNUP" | tail -n 1)
TARGET_BODY=$(echo "$SIGNUP" | sed '$d')
debug "Response: $TARGET_BODY"
if [ "$CODE" -eq 200 ] || [ "$CODE" -eq 201 ]; then
  TARGET_ID=$(echo "$TARGET_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  ok "Target signed up (ID: $TARGET_ID)"
else
  fail "Target sign-up failed ($CODE)"
  exit 1
fi

echo "Creating admin user..."
debug "POST $BASE/auth/sign-up/email"
debug "Body: {\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\",\"name\":\"$ADMIN_NAME\"}"
SIGNUP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -c "$ADMIN_JAR" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\",\"name\":\"$ADMIN_NAME\"}")
CODE=$(echo "$SIGNUP" | tail -n 1)
ADMIN_BODY=$(echo "$SIGNUP" | sed '$d')
debug "Response: $ADMIN_BODY"
if [ "$CODE" -eq 200 ] || [ "$CODE" -eq 201 ]; then
  ADMIN_ID=$(echo "$ADMIN_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  ok "Admin signed up (ID: $ADMIN_ID)"
else
  fail "Admin sign-up failed ($CODE)"
  exit 1
fi

echo ""
echo "── Promoting admin user ───────────────────────────────────────"

debug "POST $BASE/test/promote-admin"
debug "Body: {\"userId\":\"$ADMIN_ID\"}"
PROMOTE=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE/test/promote-admin" \
  -H "Content-Type: application/json" \
  -H "x-test-secret: lilypad-local-test-promote-only" \
  -d "{\"userId\":\"$ADMIN_ID\"}")
CODE=$(echo "$PROMOTE" | tail -n 1)
BODY=$(echo "$PROMOTE" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 200 ]; then
  ok "Admin promoted"
else
  fail "Admin promotion failed ($CODE)"
  exit 1
fi

echo ""
echo "── Filing a report against the target user ───────────────────"

debug "POST $BASE/user/$TARGET_ID/report"
debug "Body: {\"reason\":\"Test report\",\"content\":\"Inappropriate behavior\"}"
REPORT=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE/user/$TARGET_ID/report" \
  -H "Content-Type: application/json" \
  -b "$REPORTER_JAR" \
  -d '{"reason":"Test report","content":"Inappropriate behavior"}')
REPORT_CODE=$(echo "$REPORT" | tail -n 1)
REPORT_BODY=$(echo "$REPORT" | sed '$d')
debug "Response: $REPORT_BODY"
if [ "$REPORT_CODE" -eq 200 ]; then
  ok "Report filed against target user"
else
  fail "Report filing failed ($REPORT_CODE): $REPORT_BODY"
  exit 1
fi

echo ""
echo "── GET /api/special (unauthenticated) ────────────────────────"

debug "GET $BASE/special"
RES=$(curl -s -w "\n%{http_code}" -X GET "$BASE/special")
CODE=$(echo "$RES" | tail -n 1)
BODY=$(echo "$RES" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 401 ]; then
  ok "Returns 401 without auth"
else
  fail "Expected 401, got $CODE"
fi

echo ""
echo "── GET /api/special (non-admin user) ──────────────────────────"

debug "GET $BASE/special (reporter cookie)"
RES=$(curl -s -w "\n%{http_code}" -X GET "$BASE/special" -b "$REPORTER_JAR")
CODE=$(echo "$RES" | tail -n 1)
BODY=$(echo "$RES" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 403 ]; then
  ok "Returns 403 for non-admin"
else
  fail "Expected 403, got $CODE"
fi

echo ""
echo "── GET /api/special (admin) ───────────────────────────────────"

debug "GET $BASE/special (admin cookie)"
RES=$(curl -s -w "\n%{http_code}" -X GET "$BASE/special" -b "$ADMIN_JAR")
CODE=$(echo "$RES" | tail -n 1)
BODY=$(echo "$RES" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 200 ]; then
  ok "Returns 200 for admin"
  REPORT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$REPORT_ID" ]; then
    ok "Report ID extracted: $REPORT_ID"
  else
    fail "Could not extract report ID"
  fi
else
  fail "Expected 200, got $CODE: $BODY"
fi

echo ""
echo "── GET /api/special/:reportId (unauthenticated) ───────────────"

debug "GET $BASE/special/$REPORT_ID"
RES=$(curl -s -w "\n%{http_code}" -X GET "$BASE/special/$REPORT_ID")
CODE=$(echo "$RES" | tail -n 1)
BODY=$(echo "$RES" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 401 ]; then
  ok "Returns 401 without auth"
else
  fail "Expected 401, got $CODE"
fi

echo ""
echo "── GET /api/special/:reportId (non-admin) ─────────────────────"

debug "GET $BASE/special/$REPORT_ID (reporter cookie)"
RES=$(curl -s -w "\n%{http_code}" -X GET "$BASE/special/$REPORT_ID" -b "$REPORTER_JAR")
CODE=$(echo "$RES" | tail -n 1)
BODY=$(echo "$RES" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 403 ]; then
  ok "Returns 403 for non-admin"
else
  fail "Expected 403, got $CODE"
fi

echo ""
echo "── GET /api/special/:reportId (admin, valid ID) ──────────────"

debug "GET $BASE/special/$REPORT_ID (admin cookie)"
RES=$(curl -s -w "\n%{http_code}" -X GET "$BASE/special/$REPORT_ID" -b "$ADMIN_JAR")
CODE=$(echo "$RES" | tail -n 1)
BODY=$(echo "$RES" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 200 ]; then
  ok "Returns 200 for valid report ID"
  if echo "$BODY" | grep -q '"report"'; then
    ok "Response contains report object"
  else
    fail "Response missing report object"
  fi
else
  fail "Expected 200, got $CODE: $BODY"
fi

echo ""
echo "── GET /api/special/:reportId (admin, invalid ID) ────────────"

debug "GET $BASE/special/invalid-report-id (admin cookie)"
RES=$(curl -s -w "\n%{http_code}" -X GET "$BASE/special/invalid-report-id" -b "$ADMIN_JAR")
CODE=$(echo "$RES" | tail -n 1)
BODY=$(echo "$RES" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 404 ]; then
  ok "Returns 404 for non-existent report"
else
  fail "Expected 404, got $CODE"
fi

echo ""
echo "── PUT /api/special/:reportId (unauthenticated) ───────────────"

debug "PUT $BASE/special/$REPORT_ID"
debug "Body: {\"resolved\":true,\"actionTaken\":\"warned\"}"
RES=$(curl -s -w "\n%{http_code}" \
  -X PUT "$BASE/special/$REPORT_ID" \
  -H "Content-Type: application/json" \
  -d '{"resolved":true,"actionTaken":"warned"}')
CODE=$(echo "$RES" | tail -n 1)
BODY=$(echo "$RES" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 401 ]; then
  ok "Returns 401 without auth"
else
  fail "Expected 401, got $CODE"
fi

echo ""
echo "── PUT /api/special/:reportId (non-admin) ─────────────────────"

debug "PUT $BASE/special/$REPORT_ID (reporter cookie)"
debug "Body: {\"resolved\":true,\"actionTaken\":\"warned\"}"
RES=$(curl -s -w "\n%{http_code}" \
  -X PUT "$BASE/special/$REPORT_ID" \
  -H "Content-Type: application/json" \
  -b "$REPORTER_JAR" \
  -d '{"resolved":true,"actionTaken":"warned"}')
CODE=$(echo "$RES" | tail -n 1)
BODY=$(echo "$RES" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 403 ]; then
  ok "Returns 403 for non-admin"
else
  fail "Expected 403, got $CODE"
fi

echo ""
echo "── PUT /api/special/:reportId (admin, resolve report) ─────────"

debug "PUT $BASE/special/$REPORT_ID (admin cookie)"
debug "Body: {\"resolved\":true,\"actionTaken\":\"user_warned\"}"
RES=$(curl -s -w "\n%{http_code}" \
  -X PUT "$BASE/special/$REPORT_ID" \
  -H "Content-Type: application/json" \
  -b "$ADMIN_JAR" \
  -d '{"resolved":true,"actionTaken":"user_warned"}')
CODE=$(echo "$RES" | tail -n 1)
BODY=$(echo "$RES" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 200 ]; then
  ok "Returns 200 when resolving report"
  if echo "$BODY" | grep -q '"status":"OK"'; then
    ok "Response confirms status OK"
  else
    fail "Response missing status OK"
  fi
else
  fail "Expected 200, got $CODE: $BODY"
fi

echo ""
echo "── PUT /api/special/:reportId (admin, non-existent ID) ────────"

debug "PUT $BASE/special/invalid-report-id (admin cookie)"
debug "Body: {\"resolved\":true}"
RES=$(curl -s -w "\n%{http_code}" \
  -X PUT "$BASE/special/invalid-report-id" \
  -H "Content-Type: application/json" \
  -b "$ADMIN_JAR" \
  -d '{"resolved":true}')
CODE=$(echo "$RES" | tail -n 1)
BODY=$(echo "$RES" | sed '$d')
debug "Response: $BODY"
if [ "$CODE" -eq 400 ]; then
  ok "Returns 400 for non-existent report"
else
  fail "Expected 400, got $CODE"
fi

echo ""
echo "── Cleanup: Deleting test users ──────────────────────────────"

curl -s -X DELETE "$BASE/user" -b "$REPORTER_JAR" > /dev/null && ok "Reporter deleted" || true
curl -s -X DELETE "$BASE/user" -b "$TARGET_JAR" > /dev/null && ok "Target deleted" || true
curl -s -X DELETE "$BASE/user" -b "$ADMIN_JAR" > /dev/null && ok "Admin deleted" || true

echo ""
echo "── Done ───────────────────────────────────────────────────────"
