# DatRep

**Your spreadsheet showed up. Now what?**

DatRep is for anyone who has a CSV or Excel file and wants answers without living in pivot tables all weekend. Upload it, poke at a preview, let AI summarize what it *thinks* is going on, then go deeper with full insights, charts, and a chat that actually read your file—not a generic essay about “data.”

No PhD required. No twelve-step enterprise signup. Just your data and a bit of curiosity.

---

## What you actually get

- **Upload** — Drag in `.csv`, `.xlsx`, or `.xls` (we’re generous on size; big files on Vercel use [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) so you don’t hit tiny server limits).
- **A real preview** — Scroll the grid, spot weird columns, sanity-check before you trust anything.
- **AI that’s scoped to *your* rows** — Summaries and analysis are driven by what you uploaded, not vibes.
- **Insights + charts** — Enough to brief someone or decide what to dig into next.
- **Chat with the dataset** — Ask “what’s driving this?” in plain English.

The UI is meant to feel like a product you’d want to use, not a homework assignment.

---

## Quick start (local)

**You’ll need:** Node 18+, Python 3.11+, and an API key from [OpenRouter](https://openrouter.ai/) or OpenAI (see `.env.example`).

```bash
git clone https://github.com/jonathanrao99/datrep.git
cd datrep

npm install
pip3 install -r requirements.txt    # or: pip3 install -r backend/requirements.txt

cp .env.example .env
# Fill in at least OPENROUTER_API_KEY (or OPENAI_API_KEY), NEXTAUTH_SECRET, etc.

# Easiest: one process that boots API + web
python3 scripts/start-dev.py
```

Then open **http://localhost:3000**. API lives at **http://localhost:8000** with docs at **/docs** if you’re poking the FastAPI side.

Prefer two terminals? `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000` and, from the repo root, `npm run dev`.

---

## How it’s built

| Layer | What |
| ----- | ---- |
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind, shadcn-style UI, Recharts |
| **Optional API** | FastAPI + Pandas for uploads, analysis, and chat when you run the Python service |
| **AI** | OpenRouter (default in app config) or OpenAI—your key, your choice |
| **Data (optional)** | Postgres via Drizzle when you want file metadata and history across sessions |

Rough mental model: **Next.js** is the app most people touch; **FastAPI** is there when you want the full Python pipeline locally or behind `BACKEND_URL`. File storage and “no DB” flows are documented in [`docs/STORAGE.md`](docs/STORAGE.md).

---

## Folder map (the short version)

```
app/           → pages + Next.js API routes
components/    → UI building blocks
lib/           → auth, db, upload/analyze helpers
backend/       → FastAPI app (routes, services, MCP helpers)
scripts/       → dev startup helpers
docs/          → security, storage notes
```

---

## Deploying (e.g. Vercel)

Ship the Next app on Vercel, set env vars from `.env.example`, add **Blob** if files can be large, and point `BACKEND_URL` at your FastAPI host if you use it. Postgres is optional; without it, you can still run upload → analyze in one session if Blob + keys are set—details in `docs/STORAGE.md`.

---

## Contributing & safety

PRs welcome. Please skim [`docs/SECURITY.md`](docs/SECURITY.md) before you wire anything sensitive.

---

## License

MIT — see [`LICENSE.md`](LICENSE.md).

---

*Made for people who like their data messy and their explanations clear.*
