import os
import json
import httpx
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv
from ai_project_manager import run_analysis

load_dotenv()

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret")

SUPABASE_URL         = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
SUPABASE_ANON_KEY    = os.getenv("SUPABASE_ANON_KEY", "")
GROQ_API_KEY         = os.getenv("GROQ_API_KEY", "")


# ──────────────────────────────────────────────
# Direct REST helpers (bypasses supabase-py RLS issues)
# ──────────────────────────────────────────────

def _service_headers():
    """Headers that use the service-role key — bypasses RLS completely."""
    return {
        "apikey":        SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation"
    }


def db_insert(table: str, row: dict) -> dict:
    """Insert a row into a Supabase table using direct REST."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    resp = httpx.post(url, headers=_service_headers(), json=row, timeout=15)
    if resp.status_code not in (200, 201):
        raise Exception(f"DB insert failed {resp.status_code}: {resp.text}")
    return resp.json()


def db_select(table: str, columns: str, filters: dict, order: str = None, limit: int = 20) -> list:
    """Select rows from a Supabase table using direct REST."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {"select": columns, "limit": limit}
    # Apply eq filters: e.g. {"user_id": "eq.uuid-here"}
    for col, val in filters.items():
        params[col] = f"eq.{val}"
    if order:
        params["order"] = order
    headers = _service_headers()
    headers.pop("Prefer", None)   # Not needed for SELECT
    resp = httpx.get(url, headers=headers, params=params, timeout=15)
    if resp.status_code != 200:
        raise Exception(f"DB select failed {resp.status_code}: {resp.text}")
    return resp.json()


# ──────────────────────────────────────────────
# Startup: verify DB connection
# ──────────────────────────────────────────────

def check_database():
    try:
        db_select("analyses", "id", {}, limit=1)
        print("[DB] analyses table connected OK")
    except Exception as e:
        err = str(e)
        if "does not exist" in err or "42P01" in err:
            print("[DB] analyses table NOT FOUND — run supabase_schema.sql in Supabase SQL Editor")
        else:
            print(f"[DB] Warning: {err}")


# ──────────────────────────────────────────────
# Serve HTML pages
# ──────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory("templates", "index.html")

@app.route("/login")
def login_page():
    return send_from_directory("templates", "login.html")

@app.route("/signup")
def signup_page():
    return send_from_directory("templates", "signup.html")


# ──────────────────────────────────────────────
# API: Public Config
# ──────────────────────────────────────────────

@app.route("/api/config")
def get_config():
    return jsonify({
        "supabase_url":      SUPABASE_URL,
        "supabase_anon_key": SUPABASE_ANON_KEY
    })


# ──────────────────────────────────────────────
# Helper: verify JWT
# ──────────────────────────────────────────────

def verify_token(token: str):
    """Returns (user_id, user_email) or raises Exception."""
    url = f"{SUPABASE_URL}/auth/v1/user"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}"
    }
    resp = httpx.get(url, headers=headers)
    if resp.status_code != 200:
        raise Exception(f"Auth failed {resp.status_code}: {resp.text}")
    user = resp.json()
    return user.get("id"), user.get("email")


# ──────────────────────────────────────────────
# API: Analyze project
# ──────────────────────────────────────────────

@app.route("/api/analyze", methods=["POST"])
def analyze():
    body  = request.get_json(force=True)
    token = body.get("user_token", "")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        user_id, user_email = verify_token(token)
    except Exception as e:
        return jsonify({"error": f"Invalid token: {str(e)}"}), 401

    project_name = body.get("project_name", "").strip()
    csv_files    = body.get("csv_files", [])

    # New optional fields
    project_description = body.get("project_description", "").strip()
    preferred_roles     = body.get("preferred_roles", [])
    team_size_hint      = body.get("team_size_hint", "").strip()
    tech_preferences    = body.get("tech_preferences", "").strip()
    duration_hint       = body.get("duration_hint", "").strip()

    if not project_name:
        return jsonify({"error": "project_name is required"}), 400

    # CSV is now optional — AI generates from description if not provided
    valid_csv = [f for f in csv_files if f.get("content", "").strip()]

    try:
        result = run_analysis(
            groq_key            = GROQ_API_KEY,
            project_name        = project_name,
            csv_sources         = valid_csv,
            project_description = project_description,
            preferred_roles     = preferred_roles,
            team_size_hint      = team_size_hint,
            tech_preferences    = tech_preferences,
            duration_hint       = duration_hint
        )
    except Exception as e:
        return jsonify({"error": f"AI analysis failed: {str(e)}"}), 500

    # Save to Supabase via direct REST
    try:
        db_insert("analyses", {
            "user_id":      user_id,
            "user_email":   user_email,
            "project_name": project_name,
            "result":       result
        })
        print(f"[DB] Saved: '{project_name}' for {user_email}")
    except Exception as e:
        print(f"[WARN] Could not save analysis: {e}")

    return jsonify(result)



# ──────────────────────────────────────────────
# API: History
# ──────────────────────────────────────────────

@app.route("/api/history", methods=["POST"])
def history():
    body  = request.get_json(force=True)
    token = body.get("user_token", "")
    if not token:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        user_id, _ = verify_token(token)
    except Exception as e:
        return jsonify({"error": f"Invalid token: {str(e)}"}), 401

    try:
        rows = db_select(
            table   = "analyses",
            columns = "id,project_name,created_at,result",
            filters = {"user_id": user_id},
            order   = "created_at.desc",
            limit   = 20
        )
        return jsonify(rows)
    except Exception as e:
        err = str(e)
        if "does not exist" in err or "42P01" in err:
            return jsonify([])   # Table not created yet — return empty gracefully
        print(f"[ERROR] /api/history: {err}")
        return jsonify({"error": err}), 500


# ──────────────────────────────────────────────
# API: Setup trigger
# ──────────────────────────────────────────────

@app.route("/api/setup", methods=["POST"])
def manual_setup():
    check_database()
    return jsonify({"status": "check server logs"})


if __name__ == "__main__":
    check_database()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
