# 🥃 The Cellar

> Your personal whiskey journal & discovery app

## Setup

### 1. Install Node.js
Download the LTS installer from [nodejs.org](https://nodejs.org) and run it.

### 2. Create a Supabase project
1. Go to [supabase.com](https://supabase.com) → New Project
2. Open **SQL Editor** → run `supabase/schema.sql`
3. Run `supabase/seed.sql` to populate 30 whiskeys

### 3. Configure environment
```bash
cp .env.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from **Settings → API**.

### 4. Install and run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Stack
- **Next.js 14** (App Router) + **TypeScript**
- **TailwindCSS** (custom dark/warm theme)
- **Supabase** (auth + Postgres)
- Mobile-first, dark tasting-room aesthetic
