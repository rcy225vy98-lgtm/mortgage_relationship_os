# Mortgage Relationship OS

A React/Vite app for managing mortgage leads, referral partner touches, KPIs, and weekly updates.

## Run Locally

```bash
npm install
npm run dev
```

## Daily Change Workflow

Use `main` as the normal working branch. It tracks GitHub `main`, and Vercel deploys automatically after each push.

```bash
git status
npm run verify
git add -A
git commit -m "Describe the change"
git push
```

Before pushing, `npm run verify` runs lint and a production build. If that passes locally, Vercel should usually deploy cleanly.

Keep real secrets in `.env` locally and in Vercel environment variables. Commit `.env.example`, not `.env`.

## Open From Your Phone

Make sure your computer and phone are on the same Wi-Fi network, then run:

```bash
npm run dev:phone
```

Vite will print a Network URL such as `http://192.168.1.25:5173/`. Open that URL in your phone browser.

For an installable production-style version:

```bash
npm run build
npm run preview:phone
```

Open the printed Network URL on your phone. In Safari or Chrome, use the browser share/menu action and choose Add to Home Screen to install it like an app.

## Access Away From Home

Deploy the app to a public HTTPS host so it works from cellular data or any network. Vercel is already configured for this repo.

1. Push this repository to GitHub.
2. Create a new Vercel project from the GitHub repo.
3. Use the default Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add these environment variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY`
   - `OPENAI_MESSAGE_MODEL`
   - `CLIENT_ORIGIN`, set to your deployed app URL after the first deploy
5. Deploy, then open the Vercel URL from your phone.

After deployment, open `https://mortgage-relationship-os.vercel.app` from your phone and use Add to Home Screen from the phone browser to install it as a standalone app.

On iPhone, use Safari for the install step: Share, then Add to Home Screen. On Android, Chrome may show an Install App button in the browser menu or inside the CRM Cloud Sync screen.
