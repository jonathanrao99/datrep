# Datrep – Cursor Context

## 🧠 Project Overview
I'm building **Datrep**, a modern, donation-supported AI tool for business users to upload CSV/XLSX data and receive instant insights via GPT, charts, and downloadable reports — with a future “chat with data” interface.

---

## ✅ Architectural Decisions

### 1. Backend Architecture
Use a **separate FastAPI backend** (Python) for all data-heavy processing:
- File parsing
- GPT calls
- Chart logic (EvilCharts)
- Future “Chat with Data” module

Frontend (Next.js 15) will communicate with FastAPI backend via REST API.

---

### 2. File Storage
Start with **local storage** (in-memory or disk) for MVP.  
Plan to **migrate to AWS S3 or Vercel Blob** for production scalability and security.

---

### 3. Data Processing Scope
- ✅ Descriptive statistics (mean, median, mode, correlation matrix)
- ✅ Trend detection
- ✅ Anomaly detection
- 🔜 Predictive analytics (future phase)

---

### 4. Chart Types with EvilCharts
Initial support for:
- ✅ Bar Charts
- ✅ Line Charts
- ✅ Pie Charts
- ✅ Scatter Plots
- ✅ Heatmaps (if matrix-format data exists)

---

### 5. User Experience Flow
Support both workflows:
1. **Primary:** Upload → Auto-analyze → View insights → Download report  
2. **Secondary:** Upload → Chat with Data → Ask questions → Visual replies

---

### 6. Authentication
- Anonymous users can upload and preview datasets
- Logged-in users (via NextAuth GitHub OAuth) can:
  - Save projects
  - Access history
  - Use Chat with Data

---

### 7. Data Privacy
- Temporary file storage (auto-deleted in 24–72 hrs)
- No PII stored unless explicitly allowed
- “Delete My Data” functionality planned
- No compliance requirements (not handling sensitive verticals)

---

### 8. Pricing / Usage
- **Free-to-use** MVP
- Donations accepted via **BuyMeACoffee or Stripe**
- No user limits for now, but token usage may be rate-limited to control API costs

---

## 🧩 Tech Stack Summary

- **Frontend:** Next.js 15 with App Router, Tailwind CSS, Shadcn UI, MagicUI, HeroUI, Acertinity UI
- **Backend:** FastAPI (Python) with OpenAI integration, EvilCharts, and Pandas
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** NextAuth (GitHub OAuth)
- **Deployment:** Vercel + future backend on Render or similar
