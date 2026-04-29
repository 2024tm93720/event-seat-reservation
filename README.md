# SeatSavvy — Event Ticketing & Seat Reservation Platform

A production-grade polyglot microservices platform for event ticketing. Six independent services communicate via REST and RabbitMQ, each backed by its own database, deployed on Kubernetes (Minikube) with full Prometheus observability and structured JSON logging.

---

## Architecture

```
                        ┌─────────────────────────────┐
                        │   React 18 Frontend (Vite)  │
                        │   localhost:3001             │
                        └────────────┬────────────────┘
                                     │ REST
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
  ┌───────────────┐        ┌─────────────────┐        ┌─────────────────┐
  │ user-service  │        │ catalog-service │        │ seating-service │
  │ Python FastAPI│        │ Python FastAPI  │        │ Node.js Express │
  │ :8001         │        │ :8002           │        │ :8003           │
  │ user_db MySQL │        │ catalog_db MySQL│        │ seating_db MySQL│
  └───────────────┘        └─────────────────┘        └────────┬────────┘
                                                               │ OpenFeign
          ┌────────────────────────────────────────────────────┤
          ▼                                                     │
  ┌───────────────┐   ORDER_PLACED    ┌─────────────────┐      │
  │ order-service │──────────────────▶│    RabbitMQ     │      │
  │ Java Spring   │◀─ PAYMENT_SUCCESS─│   3.13-mgmt     │      │
  │ Boot :8965    │◀─ ORDER_CONFIRMED─│                 │      │
  │ order_db PG16 │                   └────────┬────────┘      │
  └───────────────┘                            │               │
                                               ▼               │
  ┌───────────────┐   PAYMENT_SUCCESS  ┌─────────────────┐    │
  │payment-service│◀───────────────────│notification-svc │    │
  │ Java Spring   │                    │ Node.js amqplib │    │
  │ Boot :9865    │                    │ :8006           │    │
  │payment_db PG16│                    │ notification_db │    │
  └───────────────┘                    └─────────────────┘    │
                                                               │
          ┌────────────────────────────────────────────────────┘
          ▼
  ┌───────────────┐
  │  Prometheus   │  ◀── /metrics from all 6 services
  │  + Grafana    │
  └───────────────┘
```

---

## Tech Stack

| Service | Language / Framework | Internal Port | Database |
|---|---|---|---|
| **user-service** | Python 3.12 · FastAPI · SQLAlchemy · passlib BCrypt | 8001 | user_db (MySQL 8.0) |
| **catalog-service** | Python 3.12 · FastAPI · SQLAlchemy | 8002 | catalog_db (MySQL 8.0) |
| **seating-service** | Node.js 20 · Express · mysql2 · prom-client | 8003 | seating_db (MySQL 8.0) |
| **order-service** | Java 17 · Spring Boot 3.2 · Spring Data JPA · OpenFeign · Micrometer | 8965 | order_db (PostgreSQL 16) |
| **payment-service** | Java 17 · Spring Boot 3.2 · Spring Data JPA · Micrometer | 9865 | payment_db (PostgreSQL 16) |
| **notification-service** | Node.js 20 · Express · amqplib · nodemailer · pino | 8006 | notification_db (MySQL 8.0) |
| **frontend** | React 18 · Vite 5 · Tailwind CSS 3 · TanStack Query | 3000 | — |
| **Messaging** | RabbitMQ 3.13 | 5672 / 15672 | — |
| **Monitoring** | Prometheus 2.54 · Grafana 11 | 9090 / 3000 | — |

---

## Quick Start — Docker Compose

```bash
# Clone and start the full stack
git clone https://github.com/deenbenny/event-seat-reservation.git
cd event-seat-reservation

docker compose up --build
# First run: ~90s for MySQL/PostgreSQL to initialise and seed
```

**Service URLs after compose up:**

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| User Service (Swagger) | http://localhost:8001/docs |
| Catalog Service (Swagger) | http://localhost:8002/docs |
| Seating Service | http://localhost:8003/health |
| Order Service (Swagger UI) | http://localhost:8965/swagger-ui.html |
| Payment Service (Swagger UI) | http://localhost:9865/swagger-ui.html |
| Notification Service | http://localhost:8006/health |
| RabbitMQ Management | http://localhost:15672 (guest / guest) |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 (admin / admin) |

---

## Kubernetes Deployment (Minikube)

### Prerequisites

```bash
# Required tools
minikube v1.33+    https://minikube.sigs.k8s.io
kubectl v1.29+     https://kubernetes.io/docs/tasks/tools
docker             https://docs.docker.com/get-docker
java 17+           (to build Spring Boot services)
```

### 1 — Start Minikube

```bash
minikube start --cpus=4 --memory=6g --disk-size=20g
```

### 2 — Point Docker to Minikube's daemon

```bash
# On macOS/Linux
eval $(minikube docker-env)

# If the above fails (macOS Docker driver), export manually:
export DOCKER_TLS_VERIFY="1"
export DOCKER_HOST="tcp://$(minikube ip):2376"
export DOCKER_CERT_PATH="$HOME/.minikube/certs"
```

### 3 — Build all Docker images inside Minikube

```bash
# Python services
docker build -t user-service:latest    ./user-service
docker build -t catalog-service:latest ./catalog-service

# Node.js services
docker build -t seating-service:latest      ./seating-service
docker build -t notification-service:latest ./notification-service

# Java Spring Boot services (Maven builds the JAR first)
docker build -t order-service:latest   ./order-service
docker build -t payment-service:latest ./payment-service

# React frontend
docker build -t seatsavvy-frontend:latest ./frontend
```

### 4 — Deploy to Kubernetes

```bash
# One command — applies all 9 manifests in dependency order,
# waits for each tier before advancing, then prints access URLs
./k8s/deploy.sh

# Options
./k8s/deploy.sh --skip-build   # skip Docker build step
./k8s/deploy.sh --clean        # delete namespace first (fresh install)
```

What `deploy.sh` does internally:

```
00-namespace.yaml   → creates namespace: seatsavvy
01-secrets.yaml     → DB credentials, RabbitMQ password
02-configmap.yaml   → shared env vars
03-storage.yaml     → PersistentVolumeClaims for 6 databases
04-rabbitmq.yaml    → RabbitMQ deployment + service
05-databases.yaml   → MySQL 8.0 × 4 + PostgreSQL 16 × 2
                      (waits for all DBs to be Ready)
06-app-services.yaml→ 6 microservices + ClusterIP services
07-frontend.yaml    → React frontend + NodePort service
08-monitoring.yaml  → Prometheus + Grafana
09-ingress.yaml     → Nginx ingress → seatsavvy.local
```

### 5 — Seed initial data

```bash
# Runs after all pods are Ready — copies SQL into each DB pod
./k8s/seed.sh
```

### 6 — Access the platform

```bash
# Option A — NodePort (no ingress needed)
minikube ip          # note the IP, e.g. 192.168.49.2

# Frontend:    http://<minikube-ip>:30080
# Grafana:     http://<minikube-ip>:30030  (admin / admin)
# Prometheus:  http://<minikube-ip>:30090
# RabbitMQ UI: http://<minikube-ip>:31672  (guest / guest)

# Option B — kubectl port-forward (recommended for local dev)
kubectl port-forward -n seatsavvy svc/frontend              3001:80     &
kubectl port-forward -n seatsavvy svc/user-service          8081:8001   &
kubectl port-forward -n seatsavvy svc/catalog-service       8080:8002   &
kubectl port-forward -n seatsavvy svc/seating-service       8084:8003   &
kubectl port-forward -n seatsavvy svc/order-service         8082:8965   &
kubectl port-forward -n seatsavvy svc/payment-service       8083:9865   &
kubectl port-forward -n seatsavvy svc/notification-service  8085:8006   &
kubectl port-forward -n seatsavvy svc/prometheus-svc        9090:9090   &

# Option C — Ingress (add hosts entry first)
echo "$(minikube ip) seatsavvy.local" | sudo tee -a /etc/hosts
# Frontend: http://seatsavvy.local
```

### Verify deployment

```bash
kubectl get pods -n seatsavvy          # all 16 pods should show Running
kubectl get svc  -n seatsavvy          # check NodePorts
kubectl logs -n seatsavvy deploy/order-service --tail=20
```

---

## End-to-End Demo Flow

```bash
# 1) Register a user
curl -s -X POST http://localhost:8081/v1/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alice","email":"alice@example.com","phone":"9000000001","password":"Test@123"}' | jq

# 2) Browse events
curl -s 'http://localhost:8080/v1/events?status=ON_SALE' | jq '.[0]'

# 3) Check seat availability for event 1
curl -s 'http://localhost:8084/v1/seats/1' | jq '.[0:5]'

# 4) Hold a seat (15-min TTL)
curl -s -X POST http://localhost:8084/v1/seats/hold \
  -H 'Content-Type: application/json' \
  -d '{"seatId":1,"userId":1}' | jq

# 5) Place order (Order Service → RabbitMQ → Payment Service → ticket)
curl -s -X POST http://localhost:8082/v1/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-order-001' \
  -d '{"userId":1,"eventId":1,"seatIds":[1],"paymentMethod":"UPI"}' | jq

# 6) Charge payment (called internally by order-service via RabbitMQ)
curl -s -X POST http://localhost:8083/v1/payments/charge \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-pay-001' \
  -d '{"orderId":1,"userId":1,"amount":2728.64,"currency":"INR","paymentMethod":"UPI","idempotencyKey":"demo-pay-001"}' | jq

# 7) Re-send same order request → identical response (idempotency)
curl -s -X POST http://localhost:8082/v1/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-order-001' \
  -d '{"userId":1,"eventId":1,"seatIds":[1],"paymentMethod":"UPI"}' | jq

# 8) View my orders
curl -s http://localhost:8082/v1/orders/user/1 | jq

# 9) View notifications
curl -s http://localhost:8085/v1/notifications/user/1 | jq
```

---

## API Reference

| Method | Path | Service | Description |
|---|---|---|---|
| POST | /v1/users | user-service | Register user (BCrypt password) |
| POST | /v1/users/login | user-service | Login, returns session token |
| GET | /v1/events | catalog-service | List/search events (`?status=`, `?city=`, `?type=`) |
| GET | /v1/events/{id} | catalog-service | Event detail |
| GET | /v1/seats/{eventId} | seating-service | Seat map with statuses |
| POST | /v1/seats/hold | seating-service | Hold seat (AVAILABLE → HELD, 15-min TTL) |
| POST | /v1/seats/release | seating-service | Release held seat |
| POST | /v1/orders | order-service | Place order (`Idempotency-Key` header required) |
| GET | /v1/orders/user/{userId} | order-service | User's order history with tickets |
| POST | /v1/orders/{id}/cancel | order-service | Cancel order + trigger refund |
| GET | /v1/orders/{id}/tickets | order-service | List tickets for an order |
| POST | /v1/payments/charge | payment-service | Charge payment (`Idempotency-Key` required) |
| POST | /v1/payments/refund | payment-service | Refund a payment |
| GET | /v1/notifications/user/{id} | notification-service | User notifications |
| GET | /metrics | all services | Prometheus metrics endpoint |
| GET | /health | all services | Liveness/readiness check |
| GET | /actuator/health | order / payment | Spring Boot Actuator health |

---

## Observability

### Prometheus Metrics

All 6 services expose `/metrics`. Custom counters by service:

| Metric | Service | Description |
|---|---|---|
| `orders_placed_total` | order-service | Total orders placed (Micrometer) |
| `payments_processed_total{status}` | payment-service | Payments by status: SUCCESS / FAILED / REFUNDED |
| `payments_failed_total` | payment-service | Gateway decline counter |
| `payments_refunded_total` | payment-service | Total refunds processed |
| `seat_reservations_failed` | seating-service | Seat hold conflict count (prom-client) |
| `seat_holds_active` | seating-service | Currently active seat holds |
| `notifications_sent_total{channel,status}` | notification-service | Emails sent by channel and status |

### Structured JSON Logs + Correlation ID

Every HTTP request is assigned an `X-Correlation-Id`. It propagates across all services and appears in every log line:

```json
{
  "timestamp": "2026-04-28T03:07:31Z",
  "level": "INFO",
  "service": "order-service",
  "correlationId": "ord-a3f9b12c4e81",
  "message": "Order 408 placed — user=1 event=7 total=2728.64"
}
```

Implementation by service:

| Service | Library | Mechanism |
|---|---|---|
| order-service | logstash-logback-encoder 7.4 | `CorrelationIdFilter` (OncePerRequestFilter) → SLF4J MDC |
| payment-service | logstash-logback-encoder 7.4 | `CorrelationIdFilter` (OncePerRequestFilter) → SLF4J MDC |
| seating-service | pino + pino-http | `genReqId` extracts/generates the header |
| notification-service | pino | Extracted from amqplib message headers |
| user-service | python-json-logger | FastAPI middleware |
| catalog-service | python-json-logger | FastAPI middleware |

---

## Design Patterns

| Pattern | Where used |
|---|---|
| Database-per-service | Each service owns its schema; no cross-service DB joins |
| Transactional Outbox | order-service and payment-service write events atomically to DB before publishing to RabbitMQ |
| Idempotency | `Idempotency-Key` header on POST /v1/orders and POST /v1/payments/charge |
| Seat Hold TTL | Held seats auto-release after 15 minutes via scheduled cleanup |
| Async messaging | ORDER_PLACED → RabbitMQ → payment-service; PAYMENT_SUCCESS → order-service; ORDER_CONFIRMED → notification-service |
| Synchronous calls | order-service calls seating-service and catalog-service via Spring Cloud OpenFeign |
| Structured logging | All services emit JSON logs with correlationId for end-to-end tracing |

---

## Repository Layout

```
event-seat-reservation/
├── README.md
├── docker-compose.yml            ← full local stack (no Minikube needed)
├── k8s/
│   ├── 00-namespace.yaml
│   ├── 01-secrets.yaml
│   ├── 02-configmap.yaml
│   ├── 03-storage.yaml           ← PVCs for 6 databases
│   ├── 04-rabbitmq.yaml
│   ├── 05-databases.yaml         ← MySQL 8.0 × 4, PostgreSQL 16 × 2
│   ├── 06-app-services.yaml      ← 6 microservices + ClusterIP services
│   ├── 07-frontend.yaml
│   ├── 08-monitoring.yaml        ← Prometheus + Grafana
│   ├── 09-ingress.yaml
│   ├── deploy.sh                 ← ordered apply + readiness wait
│   └── seed.sh                   ← seeds all 6 databases
├── db-init/
│   ├── user/                     ← MySQL DDL + seed data
│   ├── catalog/
│   ├── seating/
│   ├── notification/
│   ├── order/                    ← PostgreSQL DDL
│   └── payment/
├── user-service/                 ← Python FastAPI
├── catalog-service/              ← Python FastAPI
├── seating-service/              ← Node.js Express
├── order-service/                ← Java Spring Boot (Maven)
├── payment-service/              ← Java Spring Boot (Maven)
├── notification-service/         ← Node.js Express
├── frontend/                     ← React 18 + Vite
├── monitoring/
│   └── prometheus.yml
├── docs/                         ← design documents
├── DOCUMENTATION.html            ← full product documentation
├── SeatSavvy_Documentation.docx  ← Word version
├── playwright-demo/              ← automated demo recording
│   ├── demo.spec.js
│   ├── demo.config.js
│   └── demo-results/
│       └── SeatSavvy-Demo-with-Voiceover.mp4
└── dataset/                      ← source CSV data files
```

---

## Troubleshooting

**Spring Boot services take ~90s to start** — this is normal on first pull. Wait for `kubectl rollout status` to complete.

**`eval $(minikube docker-env)` fails on macOS** — use manual export instead:
```bash
export DOCKER_TLS_VERIFY="1"
export DOCKER_HOST="tcp://$(minikube ip):2376"
export DOCKER_CERT_PATH="$HOME/.minikube/certs"
```

**Payment service returns 400 on `/v1/payments/charge`** — both the `Idempotency-Key` header AND `"idempotencyKey"` field in the JSON body are required.

**Pods stuck in `Pending`** — check PVC binding: `kubectl get pvc -n seatsavvy`. Run `minikube addons enable default-storageclass`.

**Port-forward drops after idle** — add `--address=0.0.0.0` and restart: `kubectl port-forward -n seatsavvy svc/order-service 8082:8965 --address=0.0.0.0 &`
