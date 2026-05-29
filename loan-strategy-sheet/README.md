# Loan Strategy Sheet

Standalone Vite + React app for creating McIntosh Team Loan Strategy Sheet PDFs.

This app is intentionally separate from the Mortgage Relationship OS CRM. It has its own package, source files, Supabase table, and environment variables.

## Install

```bash
npm install
```

## Run

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

## Supabase Setup

1. Create a new Supabase project for this standalone website.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. In Supabase, keep Email auth enabled under Authentication.
4. Copy `.env.example` to `.env.local`.
5. Fill in:

```bash
VITE_LOAN_STRATEGY_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_LOAN_STRATEGY_SUPABASE_ANON_KEY=your-anon-key
```

The app still works without Supabase. Without these variables, it saves drafts in browser `localStorage` only. With Supabase configured, sign in with email/password before saving sheets.

## Deploy As A Website

Use a static host such as Vercel. Keep this project separate from the CRM by setting the deployment root directory to this folder:

```bash
loan-strategy-sheet
```

Vercel settings:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_LOAN_STRATEGY_SUPABASE_URL`
  - `VITE_LOAN_STRATEGY_SUPABASE_ANON_KEY`

After deployment, open the public URL, create an account or sign in, then use `Save to Supabase`.

## Generate PDF

Fill out the form and click `Generate PDF`.
