# AI Project Manager

An intelligent web application that uses AI to analyze projects and automatically generate comprehensive project plans, team assignments, tech stacks, timelines, and risk analyses — even without CSV data.

---

## What This Project Does

Given a project name and optional context (description, preferred roles, team size, tech preferences, or CSV employee data), the AI generates a **full structured project plan** including:

- **Team Composition** — recommended roles with headcounts and skills
- **Team Assignment** — which employee/profile should fill each role
- **Tech Stack** — recommended technologies with categories and purpose
- **Timeline Breakdown** — phase-by-phase duration with visual progress bars
- **Execution Plan** — step-by-step tasks per phase
- **Risk Analysis** — potential risks and mitigation strategies

Results can be:
- Viewed interactively in the browser
- **Copied as formatted plain text** to clipboard
- **Downloaded as a PDF** (A4 format with cover page and tables)
- **Sent to the Task Execution Dashboard** (auto-copy + open in new tab)

---

## Features

| Feature | Description |
|---|---|
| **AI Analysis** | Powered by Groq LLM — generates plans in seconds |
| **CSV Upload** | Optional — paste employee/project datasets for personalized assignments |
| **Role Search** | Searchable dropdown of 50+ IT roles with quick-add buttons |
| **History** | All analyses are saved to Supabase and can be re-loaded |
| **PDF Export** | Clean A4 white PDF with cover page, tables, and page numbers |
| **Text Export** | Copy full report as formatted plain text |
| **Execute Tasks** | Auto-copies plan and opens the Task Execution Dashboard |
| **Auth** | Supabase email/password authentication (login + signup) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python · Flask |
| **AI** | Groq API (LLaMA-based models) |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (JWT) |
| **Frontend** | Vanilla HTML · CSS · JavaScript |
| **PDF** | jsPDF (client-side text-based PDF generation) |

---

## Project Structure

```
Role Assignment/
├── app.py                  # Flask backend — API routes, auth, DB operations
├── ai_project_manager.py   # AI prompt engineering and response parsing
├── supabase_schema.sql     # Database schema (run once in Supabase SQL Editor)
├── .env                    # Environment variables (not committed to Git)
├── .gitignore
├── templates/
│   ├── index.html          # Main app page
│   └── login.html          # Login / signup page
└── static/
    ├── app.js              # Frontend logic (analysis, export, history)
    ├── auth.js             # Supabase auth helpers
    └── style.css           # Dark-mode UI styles
```

---

## Setup & Installation

### 1. Prerequisites
- Python 3.10+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key

### 2. Clone the repository
```bash
git clone <your-repo-url>
cd "Role Assignment"
```

### 3. Install Python dependencies
```bash
pip install flask python-dotenv groq supabase httpx pandas
```

### 4. Configure environment variables
Create a `.env` file in the project root:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
GROQ_API_KEY=your-groq-api-key
FLASK_SECRET_KEY=any-random-secret-string
```

### 5. Set up the database
1. Open your Supabase project → SQL Editor
2. Paste and run the contents of `supabase_schema.sql`

### 6. Run the application
```bash
python app.py
```

Then open [http://localhost:5000](http://localhost:5000) in your browser.

---

## Usage

1. **Sign up / Log in** at the login page
2. Enter a **project name** and optionally:
   - Project description
   - Estimated duration (e.g. "3 months")
   - Team size hint (e.g. "8 people")
   - Technology preferences (e.g. "React, Python, AWS")
   - Preferred IT roles (search and select from dropdown)
   - CSV data (paste employee/project datasets)
3. Click **Generate Project Plan**
4. View the results across all sections (team, tech stack, timeline, risks)
5. Use the export buttons to **Copy Text**, **Download PDF**, or **Execute Tasks**

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous public key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (for backend DB writes) |
| `GROQ_API_KEY` | Groq API key for LLM access |
| `FLASK_SECRET_KEY` | Flask session secret (any random string) |

---

## License

MIT License — free to use, modify, and distribute.
