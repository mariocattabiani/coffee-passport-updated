# Coffee Passport

This is the codebase for Coffee Passport, built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui-style components.

## What's included in Sprint 1

- The project foundation (config files, folder structure)
- The full design system as reusable code (colors, fonts, spacing, buttons, cards, inputs)
- The landing page (`/`)
- The login page (`/login`)
- The sign-up page (`/signup`)
- Everything is responsive, from phone-sized screens up to desktop

**Not included yet, on purpose:** the login/sign-up forms don't actually create accounts yet — they're the visual design only. Real authentication and the database connection (Supabase) come in a later sprint, as agreed.

## Project structure, explained

```
app/                    Every page you can visit lives here (this is Next.js's "App Router")
  layout.tsx            The shared wrapper around every page (loads our fonts)
  globals.css           Site-wide styles
  page.tsx              The landing page ("/")
  login/page.tsx         The login page ("/login")
  signup/page.tsx        The sign-up page ("/signup")

components/
  ui/                    Small, reusable building blocks (Button, Input, Card, Label)
                         — think of these as our own mini design-system library
  marketing/             Bigger, page-specific pieces (header, footer, the stamp
                         graphic, the login/signup layout)

lib/
  utils.ts               One small helper function used by the components above

tailwind.config.ts       The design system as code: every brand color, font, and
                         rounded-corner size from the Design System doc lives here
netlify.toml             Tells Netlify how to build and host the site
```

## Running the project on your computer

You'll need [Node.js](https://nodejs.org) installed (version 18 or later). Then, in this folder:

```bash
npm install     # downloads all the code libraries the project depends on
npm run dev     # starts the site on your computer
```

Then open **http://localhost:3000** in your browser. Changes you make to the code will show up instantly.

## Deploying to Netlify

1. Push this project to a GitHub repository.
2. In Netlify, choose "Import an existing project" and connect that repository.
3. Netlify will read `netlify.toml` automatically and know how to build the site — you shouldn't need to configure anything by hand.
4. Every time you push new code to GitHub, Netlify will automatically rebuild and redeploy the live site.

## Photography

Real photos now live in `public/images/`. They're your own images (the ones you sent over), resized to a sensible max dimension and compressed so the site stays fast — full-resolution phone photos can be 3-5MB each, which is too heavy for a webpage. Next.js's `<Image>` component (used throughout `app/page.tsx`) also lazy-loads and further optimizes them automatically at request time.

If you want to swap a photo later, just drop a new file into `public/images/` with the same filename, or update the `src` path in `app/page.tsx`.

## A note on colors and fonts

Every color and font in this project comes directly from the Coffee Passport Design System document, and is defined in exactly one place: `tailwind.config.ts`. If the brand palette ever changes, that's the only file that needs to be updated — every button, card, and page will update automatically.

| Design system name | Hex code | Used for |
|---|---|---|
| Espresso | `#5B3A29` | Primary buttons, headings, dark surfaces |
| Latte | `#C89F7A` | Secondary accents |
| Crema | `#FAF8F4` | Page background |
| Sage | `#6F8F72` | Highlights (e.g. "Coffee Passport tells you" card) |
| Charcoal | `#2B2B2B` | Body text |
| Success | `#4F8A5B` | Success states (future) |
| Error | `#B45353` | Error states (future) |

## Next sprint

Once you approve this sprint, the next step (per our plan) is wiring up real authentication and the database with Supabase.

## Sprint 2 — Authentication & Onboarding

This sprint adds real accounts. Here's what you need to do once, then how it all fits together.

### 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → API** and copy the **Project URL** and **anon public key**.
3. In this project's root folder, copy `.env.local.example` to a new file named `.env.local`, and paste those two values in.
4. Go to **SQL Editor** in the Supabase dashboard, paste in the contents of `supabase/schema.sql`, and run it. This creates the `profiles` and `user_shop_preferences` tables, locks them down with row-level security (so people can only ever see and edit their own data), and sets up a trigger that automatically creates a profile the moment someone signs up.
5. Go to **Authentication → Settings** and turn **off** "Confirm email" for now, so new accounts can move straight into onboarding without needing to click a confirmation link. (You can turn this back on before a real launch — the app already handles both cases.)
6. *(Optional, for profile photos)* In **Storage**, create a new bucket named `avatars` and toggle it public. Then run `supabase/storage.sql` in the SQL Editor. If you skip this step, onboarding still works fine — it just won't save a photo.

### 2. Add the same environment variables to Netlify

In **Netlify → Site settings → Environment variables**, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the same values, then trigger a new deploy.

### 3. How the pieces fit together

- `middleware.ts` runs on every request to `/login`, `/signup`, `/dashboard`, and `/onboarding`. It checks whether you're signed in and whether you've finished onboarding, and redirects you to the right place automatically.
- `lib/auth/actions.ts` has the three server-side functions that actually talk to Supabase: `signUp`, `signIn`, `signOut`.
- `app/onboarding/` is a 5-step wizard (`components/onboarding/`) that collects profile info, favorite drinks, and favorite shops, then saves everything at once via `app/onboarding/actions.ts`.
- `app/dashboard/page.tsx` is the simple landing spot after onboarding — greeting, a disabled "Log Coffee" button (that becomes real in a future sprint), and empty states for the sections that aren't built yet.

### 4. Try it

Run `npm install` (to pick up the two new Supabase packages) and `npm run dev`, then visit `/signup`, create an account, and walk through onboarding. Visiting `/dashboard` directly while signed out should bounce you to `/login`.
