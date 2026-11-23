create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text not null unique,
  username text,
  first_name text,
  last_name text,
  acquisition_payload text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  telegram_message_id text,
  created_at timestamptz not null default now()
);

create index if not exists messages_lead_created_idx
  on public.messages(lead_id, created_at desc);

create table if not exists public.lead_memory (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  summary text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- As tabelas não devem ser acessíveis anonimamente.
alter table public.leads enable row level security;
alter table public.messages enable row level security;
alter table public.lead_memory enable row level security;
alter table public.lead_events enable row level security;

-- O backend usa a chave service_role exclusivamente no servidor.
-- Não exponha SUPABASE_SERVICE_ROLE_KEY no frontend.
