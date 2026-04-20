#!/usr/bin/env bash
# End-to-end smoke test against docker-compose stack
set -e
BASE_ORDER=http://localhost:8004
BASE_CAT=http://localhost:8002
BASE_SEAT=http://localhost:8003
echo "1) Catalog: list ON_SALE events"
curl -s "$BASE_CAT/v1/events?status=ON_SALE" | head -c 400; echo; echo
echo "2) Seats for event 1 (first 3)"
curl -s "$BASE_SEAT/v1/seats?eventId=1" | head -c 400; echo; echo
KEY="e2e-$(date +%s)"
echo "3) Place order (Idempotency-Key: $KEY)"
curl -s -X POST "$BASE_ORDER/v1/orders" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" \
  -d '{"userId":1,"eventId":1,"seatIds":[3,4]}'; echo; echo
echo "4) Retry same key -> idempotent replay"
curl -s -X POST "$BASE_ORDER/v1/orders" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $KEY" \
  -d '{"userId":1,"eventId":1,"seatIds":[3,4]}'; echo
