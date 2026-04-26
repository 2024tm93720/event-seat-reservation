"""Catalog Service - venues, events, seat definitions."""
import os, uuid, logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from pythonjsonlogger import jsonlogger

logger = logging.getLogger("catalog-service")
h = logging.StreamHandler()
h.setFormatter(jsonlogger.JsonFormatter('%(asctime)s %(levelname)s %(name)s %(message)s'))
logger.addHandler(h); logger.setLevel(logging.INFO)

DB_URL = os.getenv("DATABASE_URL", "mysql+pymysql://catalog:pass@catalog-db:3306/catalog_db")
engine = create_engine(DB_URL, pool_pre_ping=True, pool_recycle=3600)

events_created_total = Counter("events_created_total", "Total events created")
catalog_lookups_total = Counter("catalog_lookups_total", "Total catalog lookups", ["resource"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    import time
    for i in range(30):
        try:
            with engine.connect() as c:
                c.execute(text("SELECT 1"))
            logger.info("DB connected"); break
        except Exception as e:
            logger.warning("DB not ready", extra={"attempt": i})
            time.sleep(2)
    yield

app = FastAPI(title="Catalog Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def cid_mw(request: Request, call_next):
    cid = request.headers.get("X-Correlation-Id", str(uuid.uuid4()))
    resp = await call_next(request)
    resp.headers["X-Correlation-Id"] = cid
    logger.info("request", extra={"cid": cid, "path": request.url.path, "status": resp.status_code})
    return resp

class VenueIn(BaseModel):
    name: str; city: str; area: str | None = None
    capacity: int; venue_type: str | None = None

class EventIn(BaseModel):
    venue_id: int; title: str; event_type: str; city: str
    status: str = "ON_SALE"; start_time: str; end_time: str; base_price: float

@app.get("/health")
def health():
    try:
        with engine.connect() as c: c.execute(text("SELECT 1"))
        return {"status": "ok", "service": "catalog-service"}
    except Exception as e:
        raise HTTPException(503, str(e))

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

# ---- Venues ----
@app.get("/v1/venues")
def list_venues(city: str | None = None):
    q = "SELECT * FROM venues"
    params = {}
    if city: q += " WHERE city=:c"; params["c"] = city
    with engine.connect() as c:
        rows = c.execute(text(q), params).mappings().all()
    catalog_lookups_total.labels("venues").inc()
    return list(rows)

@app.get("/v1/venues/{venue_id}")
def get_venue(venue_id: int):
    with engine.connect() as c:
        r = c.execute(text("SELECT * FROM venues WHERE venue_id=:i"), {"i": venue_id}).mappings().first()
    if not r: raise HTTPException(404, "Venue not found")
    return dict(r)

@app.post("/v1/venues", status_code=201)
def create_venue(v: VenueIn):
    with engine.begin() as c:
        nid = c.execute(text("SELECT COALESCE(MAX(venue_id),0)+1 FROM venues")).scalar()
        c.execute(text("""INSERT INTO venues (venue_id,name,city,area,capacity,venue_type)
                          VALUES (:i,:n,:c,:a,:cap,:t)"""),
                  {"i": nid, "n": v.name, "c": v.city, "a": v.area, "cap": v.capacity, "t": v.venue_type})
    return {"venue_id": nid, **v.model_dump()}

# ---- Events ----
@app.get("/v1/events")
def list_events(city: str | None = None, type: str | None = None, status: str | None = None, limit: int = 50):
    q = "SELECT * FROM events WHERE 1=1"
    params = {"l": limit}
    if city: q += " AND city=:city"; params["city"] = city
    if type: q += " AND event_type=:t"; params["t"] = type
    if status: q += " AND status=:s"; params["s"] = status
    q += " ORDER BY start_time LIMIT :l"
    with engine.connect() as c:
        rows = c.execute(text(q), params).mappings().all()
    catalog_lookups_total.labels("events").inc()
    return list(rows)

@app.get("/v1/events/{event_id}")
def get_event(event_id: int):
    with engine.connect() as c:
        r = c.execute(text("SELECT * FROM events WHERE event_id=:i"), {"i": event_id}).mappings().first()
    if not r: raise HTTPException(404, "Event not found")
    return dict(r)

@app.post("/v1/events", status_code=201)
def create_event(e: EventIn):
    with engine.begin() as c:
        nid = c.execute(text("SELECT COALESCE(MAX(event_id),0)+1 FROM events")).scalar()
        c.execute(text("""INSERT INTO events (event_id,venue_id,title,event_type,city,status,start_time,end_time,base_price)
                          VALUES (:i,:v,:t,:et,:c,:s,:st,:en,:bp)"""),
                  {"i": nid, "v": e.venue_id, "t": e.title, "et": e.event_type, "c": e.city,
                   "s": e.status, "st": e.start_time, "en": e.end_time, "bp": e.base_price})
    events_created_total.inc()
    return {"event_id": nid, **e.model_dump()}

@app.patch("/v1/events/{event_id}/status")
def update_status(event_id: int, status: str):
    if status not in ("ON_SALE","SOLD_OUT","CANCELLED"):
        raise HTTPException(400, "Invalid status")
    with engine.begin() as c:
        r = c.execute(text("UPDATE events SET status=:s WHERE event_id=:i"), {"s": status, "i": event_id})
        if r.rowcount == 0: raise HTTPException(404, "Event not found")
    return {"event_id": event_id, "status": status}

# ---- Seat definitions (read-only from catalog; seating service owns availability) ----
@app.get("/v1/events/{event_id}/seats")
def event_seats(event_id: int):
    with engine.connect() as c:
        rows = c.execute(text("SELECT * FROM seat_definitions WHERE event_id=:i ORDER BY seat_id"), {"i": event_id}).mappings().all()
    catalog_lookups_total.labels("seats").inc()
    return list(rows)

@app.get("/v1/seats/{seat_id}/price")
def seat_price(seat_id: int):
    """Authoritative pricing source for Order Service."""
    with engine.connect() as c:
        r = c.execute(text("SELECT seat_id, event_id, seat_price FROM seat_definitions WHERE seat_id=:i"), {"i": seat_id}).mappings().first()
    if not r: raise HTTPException(404, "Seat not found")
    return dict(r)
