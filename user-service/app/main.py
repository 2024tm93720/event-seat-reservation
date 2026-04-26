"""User Service - manages users, authentication, and profile data."""
import os, uuid, logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, text
from passlib.hash import bcrypt
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST
from pythonjsonlogger import jsonlogger

# Structured logging
logger = logging.getLogger("user-service")
handler = logging.StreamHandler()
handler.setFormatter(jsonlogger.JsonFormatter('%(asctime)s %(levelname)s %(name)s %(message)s'))
logger.addHandler(handler)
logger.setLevel(logging.INFO)

DB_URL = os.getenv("DATABASE_URL", "mysql+pymysql://user:pass@user-db:3306/user_db")
engine = create_engine(DB_URL, pool_pre_ping=True, pool_recycle=3600)

# Metrics (Golden Signals)
users_registered_total = Counter("users_registered_total", "Total user registrations")
auth_failures_total = Counter("auth_failures_total", "Total failed auth attempts")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Wait for DB
    import time
    for i in range(30):
        try:
            with engine.connect() as c:
                c.execute(text("SELECT 1"))
            logger.info("DB connected", extra={"attempt": i})
            break
        except Exception as e:
            logger.warning("DB not ready", extra={"attempt": i, "error": str(e)})
            time.sleep(2)
    yield

app = FastAPI(title="User Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.middleware("http")
async def correlation_id(request: Request, call_next):
    cid = request.headers.get("X-Correlation-Id", str(uuid.uuid4()))
    response = await call_next(request)
    response.headers["X-Correlation-Id"] = cid
    logger.info("request", extra={"cid": cid, "path": request.url.path, "method": request.method, "status": response.status_code})
    return response

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    city: str | None = None
    password: str

class UserOut(BaseModel):
    user_id: int
    name: str
    email: str
    phone: str | None = None
    city: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@app.get("/health")
def health():
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        return {"status": "ok", "service": "user-service"}
    except Exception as e:
        raise HTTPException(503, f"unhealthy: {e}")

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/v1/users", response_model=UserOut, status_code=201)
def register(u: UserCreate):
    with engine.begin() as c:
        existing = c.execute(text("SELECT user_id FROM users WHERE email=:e"), {"e": u.email}).first()
        if existing:
            raise HTTPException(409, "Email already registered")
        next_id = c.execute(text("SELECT COALESCE(MAX(user_id),0)+1 FROM users")).scalar()
        ph = bcrypt.hash(u.password)
        c.execute(text("""INSERT INTO users (user_id,name,email,phone,city,password_hash)
                          VALUES (:i,:n,:e,:p,:c,:h)"""),
                  {"i": next_id, "n": u.name, "e": u.email, "p": u.phone, "c": u.city, "h": ph})
    users_registered_total.inc()
    return UserOut(user_id=next_id, name=u.name, email=u.email, phone=u.phone, city=u.city)

@app.post("/v1/users/login")
def login(req: LoginRequest):
    with engine.connect() as c:
        row = c.execute(text("SELECT user_id,password_hash FROM users WHERE email=:e"), {"e": req.email}).first()
    if not row:
        auth_failures_total.inc()
        raise HTTPException(401, "Invalid credentials")
    # Seeded users have a placeholder hash; treat 'password' as default for demo.
    ok = bcrypt.verify(req.password, row.password_hash) if row.password_hash.startswith("$2") and not row.password_hash.startswith("$2b$12$seedplaceholder") else (req.password == "password")
    if not ok:
        auth_failures_total.inc()
        raise HTTPException(401, "Invalid credentials")
    return {"user_id": row.user_id, "token": f"demo-token-{row.user_id}"}

@app.get("/v1/users/{user_id}", response_model=UserOut)
def get_user(user_id: int):
    with engine.connect() as c:
        row = c.execute(text("SELECT user_id,name,email,phone,city FROM users WHERE user_id=:i"), {"i": user_id}).first()
    if not row:
        raise HTTPException(404, "User not found")
    return UserOut(**row._mapping)

@app.get("/v1/users", response_model=list[UserOut])
def list_users(limit: int = 20, city: str | None = None):
    q = "SELECT user_id,name,email,phone,city FROM users"
    params = {"l": limit}
    if city:
        q += " WHERE city=:c"
        params["c"] = city
    q += " LIMIT :l"
    with engine.connect() as c:
        rows = c.execute(text(q), params).all()
    return [UserOut(**r._mapping) for r in rows]
