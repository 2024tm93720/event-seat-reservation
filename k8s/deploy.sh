#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  SeatSavvy — Minikube deployment script
#  Usage: ./k8s/deploy.sh [--skip-build] [--clean]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
NAMESPACE="seatsavvy"
SKIP_BUILD=false
CLEAN=false

for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --clean)      CLEAN=true ;;
  esac
done

# ── helpers ───────────────────────────────────────────────────────────────────
info()  { echo -e "\033[1;34m[INFO]\033[0m  $*"; }
ok()    { echo -e "\033[1;32m[ OK ]\033[0m  $*"; }
warn()  { echo -e "\033[1;33m[WARN]\033[0m  $*"; }
err()   { echo -e "\033[1;31m[ERR ]\033[0m  $*"; exit 1; }

# ── pre-flight checks ─────────────────────────────────────────────────────────
command -v minikube >/dev/null || err "minikube not found. Install from https://minikube.sigs.k8s.io"
command -v kubectl  >/dev/null || err "kubectl not found."
command -v docker   >/dev/null || err "docker not found."

info "Checking Minikube status..."
minikube status --format='{{.Host}}' 2>/dev/null | grep -q "Running" \
  || err "Minikube is not running. Start it with: minikube start --cpus=4 --memory=6g"
ok "Minikube is running."

# ── optional clean slate ──────────────────────────────────────────────────────
if [ "$CLEAN" = true ]; then
  warn "Deleting namespace $NAMESPACE (all data will be lost)..."
  kubectl delete namespace "$NAMESPACE" --ignore-not-found
  info "Waiting for namespace to be deleted..."
  kubectl wait --for=delete namespace/"$NAMESPACE" --timeout=60s 2>/dev/null || true
fi

# ── build images inside Minikube's Docker daemon ──────────────────────────────
if [ "$SKIP_BUILD" = false ]; then
  info "Pointing Docker CLI to Minikube's daemon..."
  eval "$(minikube docker-env)"

  info "Building application images..."
  docker build -t user-service:latest         "$ROOT_DIR/user-service"
  ok "user-service built"
  docker build -t catalog-service:latest      "$ROOT_DIR/catalog-service"
  ok "catalog-service built"
  docker build -t seating-service:latest      "$ROOT_DIR/seating-service"
  ok "seating-service built"
  docker build -t order-service:latest        "$ROOT_DIR/order-service"
  ok "order-service built"
  docker build -t payment-service:latest      "$ROOT_DIR/payment-service"
  ok "payment-service built"
  docker build -t notification-service:latest "$ROOT_DIR/notification-service"
  ok "notification-service built"
  docker build -t frontend:latest             "$ROOT_DIR/frontend"
  ok "frontend built"
else
  warn "--skip-build: using existing images in Minikube daemon."
fi

# ── enable ingress addon ──────────────────────────────────────────────────────
info "Enabling Minikube ingress addon..."
minikube addons enable ingress 2>/dev/null || true

# ── apply manifests (in dependency order) ─────────────────────────────────────
info "Applying Kubernetes manifests..."

kubectl apply -f "$SCRIPT_DIR/00-namespace.yaml"
kubectl apply -f "$SCRIPT_DIR/01-secrets.yaml"
kubectl apply -f "$SCRIPT_DIR/02-configmap.yaml"
kubectl apply -f "$SCRIPT_DIR/03-storage.yaml"
kubectl apply -f "$SCRIPT_DIR/04-rabbitmq.yaml"
kubectl apply -f "$SCRIPT_DIR/05-databases.yaml"

# ── wait for infrastructure before starting app services ──────────────────────
info "Waiting for databases to be ready (this may take ~60s)..."
for db in user-db catalog-db seating-db notification-db order-db payment-db rabbitmq; do
  kubectl rollout status deployment/"$db" -n "$NAMESPACE" --timeout=120s \
    && ok "$db ready" || warn "$db not ready yet — continuing"
done

# ── deploy application services ───────────────────────────────────────────────
kubectl apply -f "$SCRIPT_DIR/06-app-services.yaml"
kubectl apply -f "$SCRIPT_DIR/07-frontend.yaml"
kubectl apply -f "$SCRIPT_DIR/08-monitoring.yaml"
kubectl apply -f "$SCRIPT_DIR/09-ingress.yaml"

# ── wait for app services ────────────────────────────────────────────────────
info "Waiting for application services to be ready (Spring Boot may take ~90s)..."
for svc in user-service catalog-service seating-service order-service payment-service notification-service frontend; do
  kubectl rollout status deployment/"$svc" -n "$NAMESPACE" --timeout=180s \
    && ok "$svc ready" || warn "$svc not ready yet — check: kubectl logs -n $NAMESPACE deploy/$svc"
done

# ── print access URLs ─────────────────────────────────────────────────────────
MINIKUBE_IP=$(minikube ip)

echo ""
echo "══════════════════════════════════════════════════════════"
echo "  SeatSavvy deployed to Minikube!"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "  Minikube IP : $MINIKUBE_IP"
echo ""
echo "  ── Browser access (NodePort) ──────────────────────────"
echo "  Frontend      http://$MINIKUBE_IP:30080"
echo "  Grafana       http://$MINIKUBE_IP:30030   (admin / admin)"
echo "  Prometheus    http://$MINIKUBE_IP:30090"
echo "  RabbitMQ UI   http://$MINIKUBE_IP:31672   (guest / guest)"
echo ""
echo "  ── Ingress (add to /etc/hosts first) ──────────────────"
echo "  echo \"$MINIKUBE_IP seatsavvy.local\" | sudo tee -a /etc/hosts"
echo "  Frontend      http://seatsavvy.local"
echo ""
echo "  ── Quick health checks ─────────────────────────────────"
echo "  kubectl get pods -n $NAMESPACE"
echo "  kubectl get svc  -n $NAMESPACE"
echo ""
echo "  ── Database seeding ────────────────────────────────────"
echo "  Run seed.sh after pods are ready to populate initial data."
echo "══════════════════════════════════════════════════════════"
