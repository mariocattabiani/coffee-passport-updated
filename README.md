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
