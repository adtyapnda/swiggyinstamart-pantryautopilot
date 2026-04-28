-- Pantry Autopilot — initial schema.
-- Apply via Supabase SQL editor or `supabase db push` once the Supabase
-- CLI is wired. The app is designed so every table is opt-in: until
-- SUPABASE_URL is set, the Netlify Functions fall back to Netlify Blobs
-- for local-dev token storage.

create extension if not exists "pgcrypto";

-- Users keyed by their WhatsApp phone (the channel of record).
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  whatsapp_phone text unique not null,
  swiggy_user_id text,
  created_at timestamptz not null default now()
);

-- Per-user OAuth access token, encrypted at rest by app-layer AES-256-GCM
-- (see netlify/lib/db/encryption.ts). Refresh tokens are not issued by
-- Swiggy MCP v1.0, so the app must re-auth before expires_at.
create table if not exists oauth_tokens (
  user_id uuid primary key references users(id) on delete cascade,
  access_token_ciphertext text not null,
  scope text,
  expires_at timestamptz not null,
  acquired_at timestamptz not null default now()
);

-- SKUs we actively model for a given user.
create table if not exists tracked_skus (
  user_id uuid references users(id) on delete cascade,
  sku text not null,
  name text,
  first_seen_at timestamptz not null default now(),
  last_purchased_at timestamptz,
  primary key (user_id, sku)
);

-- Consumption-relevant events: Instamart purchases (positive signal),
-- Food orders (negative signal), and user replies that override
-- predictions ("already got it" / "skip").
create table if not exists consumption_events (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  sku text,
  event_type text not null check (
    event_type in (
      'instamart_purchase',
      'food_order',
      'manual_skip',
      'manual_have'
    )
  ),
  occurred_at timestamptz not null,
  quantity numeric,
  variant text,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists consumption_events_user_sku_time_idx
  on consumption_events (user_id, sku, occurred_at desc);

-- Outbound nudges + their reply state.
create table if not exists nudges_sent (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  sku text not null,
  predicted_need_at timestamptz not null,
  cadence_days numeric,
  confidence text,
  whatsapp_message_id text,
  user_response text,
  responded_at timestamptz,
  sent_at timestamptz not null default now()
);
create index if not exists nudges_sent_user_time_idx
  on nudges_sent (user_id, sent_at desc);

-- RLS note: this app accesses Supabase only via the service role key from
-- server-side Netlify Functions. RLS policies must be added before any
-- client-side (browser) access is allowed.
