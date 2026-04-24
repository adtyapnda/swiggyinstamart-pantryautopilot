# Pantry Autopilot

A WhatsApp agent that models household grocery consumption passively and sends
one-tap reorder carts for Swiggy Instamart before users run out. Built on the
Swiggy MCP stack for Builders Club.

This repo currently hosts the public landing page and the OAuth redirect
handler stub required for the Builders Club application.

## Deploy to Netlify (free subdomain)

Hosted on Netlify via the Netlify CLI.

```bash
npm install
netlify deploy --prod --build
```

Netlify auto-detects Next.js and provisions a `*.netlify.app` subdomain.

The deployed URL serves:

- `/` — public landing page
- `/auth/swiggy/callback` — OAuth redirect handler stub (returns a 400 with
  `missing_code` when visited without parameters, as expected)

Redirect URIs to register with Swiggy Builders Club:

```
https://<your-site>.netlify.app/auth/swiggy/callback
http://localhost:3000/auth/swiggy/callback
```

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## What's here / what's coming

| File | Purpose |
|---|---|
| `app/page.tsx` | Public landing page |
| `app/auth/swiggy/callback/route.ts` | OAuth redirect handler stub |

Phase 1 (5-day MVP build, after MCP access is granted):

- Swiggy MCP client (Instamart + Food)
- Postgres via Supabase for user profiles and per-SKU consumption state
- Bayesian cadence estimator per (user, SKU)
- WhatsApp Business Cloud API inbound/outbound
- Nudge generator with pre-filled reorder carts
- "Already got it" / "Skip" correction loop

Phase 2 (user-consented accuracy signals, for households that shop across multiple apps):

- Account Aggregator transaction cadence (RBI-regulated, user-consented) as a
  dampening signal so the model over-predicts less
- Opt-in Android notification access for broader consumption signal coverage
- Fridge photo vision onboarding
- Claude Sonnet 4.6 via Bedrock for SKU normalization + free-form replies

## Principles

- Swiggy Instamart is named explicitly as the fulfillment source in every
  nudge and confirmation. No aggregator-style masking.
- Prices, availability, and delivery times are shown exactly as the MCP
  returns them. No transformation, no paraphrasing.
- All cross-platform signals are user-consented, scoped, and exist only to
  reduce wrong reorders for the user. Not for benchmarking or competitive
  intelligence.
- MCP tokens are user-scoped, encrypted at rest, and never shared outside the
  user's own account.
- Rate limits, logging, and platform safeguards are respected by design:
  batched nightly pulls, confirm-gated reorders, no polling.
