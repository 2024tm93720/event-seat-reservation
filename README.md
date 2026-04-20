# Event Ticketing & Seat Reservation – Microservices

Problem Statement 5 – SE ZG583 Scalable Services. Six microservices (4 mandatory + 2 optional) with a strict database-per-service architecture, Docker, Kubernetes, and Prometheus observability.

## Stack

| Service              | Tech                  | Port  | Database         |
| -------------------- | --------------------- | ----- | ---------------- |
| User Service         | Python · FastAPI      | 8001  | user-db (MySQL)         |
| Catalog Service      | Python · FastAPI      | 8002  | catalog-db (MySQL)      |
| Seating Service      | Node.js · Express     | 8003  | seating-db (MySQL)      |
| Order & Ticketing    | Node.js · Express     | 8004  | order-db (MySQL)        |
| Payment Service      | Node.js · Express     | 8005  | payment-db (MySQL)      |
| Notification Service | Node.js · Express     | 8006  | notification-db (MySQL) |

## Quick start (Docker Compose)

```bash
docker compose up --build
# wait ~60 s for MySQL seed
curl http://localhost:8002/v1/events?city=Mumbai
```

Service URLs:

- User       http://localhost:8001/docs
- Catalog    http://localhost:8002/docs
- Seating    http://localhost:8003/health
- Order      http://localhost:8004/health
- Payment    http://localhost:8005/health
- Notif.     http://localhost:8006/health
- Prometheus http://localhost:9090
- Grafana    http://localhost:3000 (admin / admin)

## End-to-end demo flow

```bash
# 1) Browse events
curl 'http://localhost:8002/v1/events?status=ON_SALE' | jq '.[0]'

# 2) See seats for an event
curl 'http://localhost:8003/v1/seats?eventId=1' | jq '.[0:3]'

# 3) Place an order (orchestrates reservation -> charge -> ticket)
curl -X POST http://localhost:8004/v1/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-key-001' \
  -d '{"userId":1,"eventId":1,"seatIds":[1,2],"paymentMethod":"UPI"}' | jq

# 4) Re-send same request -> identical response (idempotency)
curl -X POST http://localhost:8004/v1/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-key-001' \
  -d '{"userId":1,"eventId":1,"seatIds":[1,2]}' | jq
```

## Kubernetes (Minikube)

```bash
minikube start --memory=6144 --cpus=4
eval $(minikube docker-env)
for s in user-service catalog-service seating-service order-service payment-service notification-service; do
  docker build -t $s:latest ./$s
done
kubectl apply -f k8s/
kubectl get pods -n ticketing -w
# Expose via NodePort
minikube service order-service -n ticketing --url
```

## Microservice contract (key endpoints)

| Method | URL                                | Purpose                                    |
| ------ | ---------------------------------- | ------------------------------------------ |
| POST   | /v1/users                          | Register user                              |
| POST   | /v1/users/login                    | Login                                      |
| GET    | /v1/events?city=&type=&status=     | Search events                              |
| GET    | /v1/events/{id}                    | Event detail                               |
| GET    | /v1/seats?eventId=                 | List seats with status                     |
| POST   | /v1/seats/reserve                  | Hold seats (15-min TTL)                    |
| POST   | /v1/seats/release                  | Release hold                               |
| POST   | /v1/seats/allocate                 | Permanent allocation after payment success |
| POST   | /v1/orders                         | Place order (Idempotency-Key required)     |
| POST   | /v1/orders/{id}/cancel             | Cancel + refund                            |
| GET    | /v1/orders/{id}/tickets            | List tickets                               |
| POST   | /v1/payments/charge                | Charge (Idempotency-Key required)          |
| POST   | /v1/payments/refund                | Refund                                     |
| POST   | /v1/notifications/send             | Send email/SMS                             |
| GET    | /metrics                           | Prometheus metrics (every service)         |
| GET    | /health                            | Liveness/readiness                         |

## Observability

Every service exposes `/metrics` in Prometheus format with the required Golden-Signal counters:

- `orders_total{status=...}` – Order Service
- `seat_reservations_failed`  – Seating Service
- `payments_failed_total`     – Payment Service

Plus default process metrics (CPU, memory, event-loop lag).
All services emit structured JSON logs with an `X-Correlation-Id` propagated end-to-end.

## Repository layout

```
event-ticketing/
├── README.md
├── docker-compose.yml
├── docs/                       # design + report PDF
├── monitoring/prometheus.yml
├── dataset/*.csv               # original CSVs (provided)
├── db-init/<service>/01_init.sql  # per-service seeded MySQL schema
├── k8s/                        # Kubernetes manifests
├── user-service/               # FastAPI
├── catalog-service/            # FastAPI
├── seating-service/            # Express
├── order-service/              # Express (workflow orchestrator)
├── payment-service/            # Express
└── notification-service/       # Express
```
