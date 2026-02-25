# File storage on Vercel (uploads)

On Vercel the filesystem is read-only, so uploads must go to external storage. You have two options:

## 1. Postgres storage (free)

If you use **Postgres** (e.g. Neon) and **POSTGRES_URL** is set:

- Files **under 5 MB** are stored in the database (base64 in the `files` table).
- No Blob or extra service needed.
- Run **`npm run db:push`** once to add the `file_data_base64` column to your `files` table.

Good for: small CSVs, demos, low volume. Not for large or many files (DB size grows).

## 2. Vercel Blob

- **Hobby (free)**: Free within usage limits; no overage charges (service pauses if you exceed).
- Set up: Vercel → Storage → Create Database → Blob. This sets **BLOB_READ_WRITE_TOKEN**.
- No per-file size limit for Postgres (we still enforce 100MB app-side).

Good for: larger files, higher volume, or when you don’t want to store bytes in Postgres.

## Other options

- **Supabase Storage**: 1 GB free, 50 MB/file. Use an S3-compatible client and your own env vars.
- **Cloudflare R2**: Generous free tier, no egress fees. Integrate with their SDK and env vars.

The app only implements (1) Postgres and (2) Vercel Blob. Priority: if **BLOB_READ_WRITE_TOKEN** is set we use Blob; else on Vercel we use Postgres when **POSTGRES_URL** is set and file ≤ 5MB.
