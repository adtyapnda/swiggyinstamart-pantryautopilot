# Pantry Autopilot

> Being built for **Swiggy Builders Club 2026**.

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

Live at https://swiggyinstamart-pantryautopilot.netlify.app.

Routes:

- `/` is the public landing page
- `/auth/swiggy/start` initiates the OAuth handshake (generates PKCE
  verifier + state, redirects to the authorize endpoint)
- `/auth/swiggy/callback` exchanges the authorization code for an access
  token and stores it
- `/mock/authorize` and `/mock/token` are local mock OAuth endpoints used
  in dev so the full handshake runs end-to-end without a real `client_id`
- `/dev/mcp-ping` exercises the MCP client wrapper. Append `?fake=1` (or
  set `MCP_USE_FAKE=1`) to use the in-memory `FakeMCPClient` until real
  MCP access lands.
- `/dev/cadence` runs the Bayesian cadence model against synthetic
  Instamart + Food order histories and returns per-SKU predictions plus
  self-assertions. Tune via `?seed=`, `?historyDays=`, `?foodOrdersPerWeek=`.
- `/whatsapp/webhook` is the Meta webhook (GET verify handshake + POST
  message events). Set `WHATSAPP_VERIFY_TOKEN` to match the value pasted
  into the Meta dashboard.
- `/dev/whatsapp-send?to=<phone>&text=<msg>` exercises the outbound
  helper. Append `&mode=buttons` to send an interactive 3-button card
  ("Reorder" / "Already got it" / "Skip"). With `WHATSAPP_USE_MOCK=1` it
  logs to the function output instead of calling Meta.

Redirect URIs registered with Swiggy Builders Club:

```
https://swiggyinstamart-pantryautopilot.netlify.app/auth/swiggy/callback
http://localhost:3000/auth/swiggy/callback
```

## Run locally

Copy the example env file (defaults point at the local mock OAuth endpoints,
so no Swiggy credentials are needed to exercise the handshake):

```bash
cp .env.example .env
```

Run with `netlify dev` so the static site and Netlify Functions are served
together on the same origin:

```bash
npm install
netlify dev
```

Open http://localhost:3000. To exercise the OAuth handshake end-to-end
against the mock endpoints, visit
http://localhost:3000/auth/swiggy/start.

## What's here / what's coming

| File | Purpose |
|---|---|
| `app/page.tsx` | Public landing page |
| `netlify/functions/swiggy-start.mts` | Generates PKCE verifier + state, redirects to authorize |
| `netlify/functions/swiggy-callback.mts` | Exchanges the authorization code for an access token |
| `netlify/functions/mock-authorize.mts` | Local mock authorize endpoint (dev only) |
| `netlify/functions/mock-token.mts` | Local mock token endpoint, validates PKCE (dev only) |
| `netlify/functions/dev-mcp-ping.mts` | Dev endpoint that exercises the MCP client end-to-end |
| `netlify/functions/dev-cadence.mts` | Dev endpoint that runs the cadence model on synthetic data with self-assertions |
| `netlify/functions/whatsapp-webhook.mts` | Meta webhook — verify handshake + inbound message events |
| `netlify/functions/dev-whatsapp-send.mts` | Dev endpoint for testing outbound send (text or interactive buttons) |
| `netlify/lib/oauth.ts` | PKCE helpers — verifier, challenge, state |
| `netlify/lib/storage.ts` | Netlify Blobs wrapper for OAuth sessions and tokens |
| `netlify/lib/mcp/` | MCP client wrapper (real + fake) over `@modelcontextprotocol/sdk` |
| `netlify/lib/cadence/` | Bayesian cadence model (Exp-Gamma conjugate) + synthetic data generator |
| `netlify/lib/whatsapp/` | WhatsApp Business Cloud API helpers — types, parser, send (real + mock) |
| `netlify/lib/db/` | Supabase client + AES-256-GCM token encryption |
| `migrations/001_init.sql` | Initial Postgres schema for users, oauth_tokens, tracked_skus, consumption_events, nudges_sent |
| `scripts/smoke.ts` | Pure-Node smoke test for cadence + FakeMCPClient (`npm run smoke`) |

Phase 1 (after MCP access is granted):

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
