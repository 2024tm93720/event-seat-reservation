#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  SeatSavvy — seed databases in Minikube after deploy.sh completes
#  Copies each db-init SQL file into the running DB pod and executes it.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

NAMESPACE="seatsavvy"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

info() { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
ok()   { echo -e "\033[1;32m[ OK ]\033[0m  $*"; }
err()  { echo -e "\033[1;31m[ERR ]\033[0m  $*"; exit 1; }

seed_mysql() {
  local pod_selector="$1"  # e.g. app=user-db
  local db_name="$2"       # e.g. user_db
  local db_user="$3"       # e.g. user
  local sql_dir="$4"       # e.g. $ROOT_DIR/db-init/user

  local pod
  pod=$(kubectl get pod -n "$NAMESPACE" -l "$pod_selector" -o jsonpath='{.items[0].metadata.name}')
  info "Seeding MySQL $db_name in pod $pod ..."

  for sql_file in "$sql_dir"/*.sql; do
    [ -f "$sql_file" ] || continue
    kubectl cp "$sql_file" "$NAMESPACE/$pod:/tmp/seed.sql"
    kubectl exec -n "$NAMESPACE" "$pod" -- \
      mysql -u"$db_user" -ppass "$db_name" -e "source /tmp/seed.sql" 2>/dev/null
    ok "$(basename "$sql_file") applied to $db_name"
  done
}

seed_postgres() {
  local pod_selector="$1"
  local db_name="$2"
  local db_user="$3"
  local sql_dir="$4"

  local pod
  pod=$(kubectl get pod -n "$NAMESPACE" -l "$pod_selector" -o jsonpath='{.items[0].metadata.name}')
  info "Seeding PostgreSQL $db_name in pod $pod ..."

  for sql_file in "$sql_dir"/*.sql; do
    [ -f "$sql_file" ] || continue
    kubectl cp "$sql_file" "$NAMESPACE/$pod:/tmp/seed.sql"
    kubectl exec -n "$NAMESPACE" "$pod" -- \
      psql -U "$db_user" -d "$db_name" -f /tmp/seed.sql 2>/dev/null
    ok "$(basename "$sql_file") applied to $db_name"
  done
}

seed_mysql "app=user-db"         "user_db"         "user"       "$ROOT_DIR/db-init/user"
seed_mysql "app=catalog-db"      "catalog_db"      "catalog"    "$ROOT_DIR/db-init/catalog"
seed_mysql "app=seating-db"      "seating_db"      "seating"    "$ROOT_DIR/db-init/seating"
seed_mysql "app=notification-db" "notification_db" "notify"     "$ROOT_DIR/db-init/notification"
seed_postgres "app=order-db"     "order_db"        "order_user" "$ROOT_DIR/db-init/order"
seed_postgres "app=payment-db"   "payment_db"      "pay_user"   "$ROOT_DIR/db-init/payment"

echo ""
echo "All databases seeded successfully!"
