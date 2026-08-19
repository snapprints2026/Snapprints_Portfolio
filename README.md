<<<<<<< HEAD
# SnapPrints Vendor/Admin Dashboard + Landing Page

Vite + React + React Router + Tailwind. Public landing page at `/`,
Login button in the navbar → `/login` → `/admin` or `/vendor` dashboard
depending on role.

## Setup

```bash
npm install
cp .env.example .env
# edit .env — set VITE_API_BASE to your backend's /api URL
npm run dev
```

## What's here

- `src/pages/HomePage.jsx` — public landing page, composed from
  `src/components/landing/*` (Navbar, Hero, TrustedBy, HowItWorks,
  Features, MachineShowcase, Contact, Footer, DemoModal). Ported from
  your Next.js portfolio — same design, `next/image` swapped for plain
  `<img>`, `"use client"` directives dropped (not needed outside Next.js).
- `src/App.jsx` — `/` is now the public landing page (previously it
  redirected straight to `/login`). `/login`, `/admin/*`, `/vendor/*`
  are unchanged from before.
- `src/components/landing/Navbar.jsx` — has a **Login** button (uses
  `react-router-dom`'s `Link`, not `next/link`) next to "Request Demo".
- `src/components/landing/DemoModal.jsx` — posts to
  `{VITE_API_BASE}/request-demo` instead of a Next.js API route, since
  Vite has no server-side routes of its own. See the backend patch below.
- `public/images/logo.png` and `machine.png` — copied over from your
  portfolio's actual assets.

## Backend: one new endpoint needed

The "Request Demo" form now needs a real backend endpoint (it used to
hit Next.js's built-in `/api/request-demo` route, which only exists in
a Next.js server). I've written `routes/demo.routes.js` for your
Express backend — see `server.js.DEMO_ROUTE_PATCH.md` for the 3-step
wiring (require + mount + env vars + `npm install resend`).

Everything else (admin/vendor dashboards, auth) is unchanged from
before — this only adds the landing page and the demo-request email flow.
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> 7decbffe7c97c17a47177f17c8464c16a7dbc89b
