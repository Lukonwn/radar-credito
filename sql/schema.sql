-- O banco cria as tabelas automaticamente na inicialização do serviço.
-- Este arquivo fica como referência opcional para instalação manual.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id text NOT NULL UNIQUE, username text, first_name text, last_name text,
  acquisition_payload text, created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')), content text NOT NULL,
  telegram_message_id text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_lead_created_idx ON messages(lead_id, created_at DESC);
CREATE TABLE IF NOT EXISTS lead_memory (
  lead_id uuid PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  summary text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_name text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
