# KALYSTRAL
**Intelligence Beyond the Horizon.**
*AI-Powered Maritime Freight Decision Platform for East Coast India Bulk Cargo Importers*

Built by **Team Rizzalytics**.

> **Data Disclaimer:**

## Architecture
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui patterns, Recharts, Framer Motion, React Router
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0
- **Database:** PostgreSQL 16
- **Auth:** Firebase Authentication (Email/Password & Google Sign-In)
- **AI / OR:** XGBoost / Scikit-learn, Google OR-Tools, Google Gemini API (server-side only)

## Quick Start
1. Start PostgreSQL via `docker-compose up -d db` (or point `DATABASE_URL` to a local instance).
2. Configure `backend/.env` from `backend/.env.example` and start FastAPI on `:8000`.
3. Configure `frontend/.env` from `frontend/.env.example` and start Vite on `:5173`.