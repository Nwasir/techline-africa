# app/main.py
import os
import sqlite3
import logging
import requests
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, ValidationError
import asyncio

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("techline-backend")

# Load .env (optional for local dev)
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")
DB_PATH = os.getenv("DB_PATH", "leads.db")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "onboarding@resend.dev")
EMAIL_TO = os.getenv("EMAIL_TO", "africatechline@gmail.com")

# ─────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────
app = FastAPI(title="Techline Africa API", version="1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files at /static
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Serve index.html at /
@app.get("/", response_class=FileResponse)
async def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))

# ─────────────────────────────────────────────
# DATA MODEL
# ─────────────────────────────────────────────
class ContactIn(BaseModel):
    name: str
    email: EmailStr
    message: str
    source: Optional[str] = None

# ─────────────────────────────────────────────
# DATABASE SETUP
# ─────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            source TEXT,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

async def save_lead_to_db(data: ContactIn):
    def _save():
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO leads (name, email, message, source, created_at) VALUES (?, ?, ?, ?, ?)",
            (data.name, data.email, data.message, data.source or "website", datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()

    await asyncio.to_thread(_save)

# ─────────────────────────────────────────────
# RESEND EMAIL
# ─────────────────────────────────────────────
def send_email_resend(contact: ContactIn):
    if not RESEND_API_KEY:
        logger.warning("⚠ No RESEND_API_KEY — email not sent.")
        return False

    url = "https://api.resend.com/emails"
    payload = {
        "from": EMAIL_FROM,
        "to": [EMAIL_TO],
        "subject": f"New Lead from Techline Africa — {contact.name}",
        "html": f"""
        <h2>New Contact Submission</h2>
        <p><strong>Name:</strong> {contact.name}</p>
        <p><strong>Email:</strong> {contact.email}</p>
        <p><strong>Source:</strong> {contact.source or "website"}</p>
        <p><strong>Message:</strong><br>{contact.message}</p>
        <br>
        <small>Sent at {datetime.utcnow().isoformat()} UTC</small>
        """
    }
    headers = {"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"}

    try:
        r = requests.post(url, json=payload, headers=headers)
        logger.info("Resend response: %s", r.text)
        return True
    except Exception as e:
        logger.exception("Email sending failed: %s", e)
        return False

# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    init_db()
    logger.info("SQLite database ready at %s", DB_PATH)

@app.get("/health")
async def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}

@app.post("/api/contact")
async def post_contact(request: Request, background_tasks: BackgroundTasks):
    """Handles JSON submissions from the frontend"""
    try:
        payload = await request.json()
        contact = ContactIn(**payload)
    except ValidationError as ve:
        return JSONResponse(status_code=422, content={"detail": ve.errors()})
    except Exception:
        return JSONResponse(status_code=400, content={"detail": "Invalid request"})

    # Save lead
    background_tasks.add_task(save_lead_to_db, contact)
    # Send email
    background_tasks.add_task(send_email_resend, contact)

    return {"status": "success", "message": "Thank you — your message has been received."}

@app.get("/api/leads")
async def list_leads(limit: int = 50):
    """List recent leads (admin feature)"""
    def _fetch():
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, email, message, source, created_at FROM leads ORDER BY id DESC LIMIT ?",
            (limit,)
        )
        rows = cur.fetchall()
        conn.close()
        return rows

    rows = await asyncio.to_thread(_fetch)
    leads = [{"id": r[0], "name": r[1], "email": r[2], "message": r[3], "source": r[4], "created_at": r[5]} for r in rows]
    return {"count": len(leads), "leads": leads}
