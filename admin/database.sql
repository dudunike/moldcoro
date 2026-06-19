-- =============================================
-- MOLDS&COROS — Analytics Schema
-- Cole este SQL no Supabase Dashboard → SQL Editor
-- Execute uma única vez
-- =============================================

-- 1. Tabela de eventos (todos os eventos de rastreamento)
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  timestamp   TIMESTAMPTZ DEFAULT NOW(),
  data        JSONB DEFAULT '{}'::jsonb
);

-- 2. Tabela de configurações (Pixel ID, Google Analytics, etc.)
CREATE TABLE IF NOT EXISTS analytics_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para performance nas queries do dashboard
CREATE INDEX IF NOT EXISTS idx_events_type      ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_session   ON analytics_events (session_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON analytics_events (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_data      ON analytics_events USING GIN (data);

-- =============================================
-- 4. Row Level Security (RLS)
-- =============================================

ALTER TABLE analytics_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_settings ENABLE ROW LEVEL SECURITY;

-- Visitantes anônimos podem INSERIR eventos (rastreamento da landing page)
DROP POLICY IF EXISTS "public_insert_events" ON analytics_events;
CREATE POLICY "public_insert_events"
  ON analytics_events FOR INSERT TO anon
  WITH CHECK (true);

-- Apenas usuário autenticado (admin) pode LER eventos
DROP POLICY IF EXISTS "admin_select_events" ON analytics_events;
CREATE POLICY "admin_select_events"
  ON analytics_events FOR SELECT TO authenticated
  USING (true);

-- Apenas admin pode DELETAR eventos
DROP POLICY IF EXISTS "admin_delete_events" ON analytics_events;
CREATE POLICY "admin_delete_events"
  ON analytics_events FOR DELETE TO authenticated
  USING (true);

-- Settings: anônimo pode LER (para carregar Pixel ID na landing page)
DROP POLICY IF EXISTS "anon_read_settings" ON analytics_settings;
CREATE POLICY "anon_read_settings"
  ON analytics_settings FOR SELECT TO anon
  USING (true);

-- Settings: somente admin pode escrever
DROP POLICY IF EXISTS "admin_settings_select" ON analytics_settings;
CREATE POLICY "admin_settings_select"
  ON analytics_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_settings_insert" ON analytics_settings;
CREATE POLICY "admin_settings_insert"
  ON analytics_settings FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "admin_settings_update" ON analytics_settings;
CREATE POLICY "admin_settings_update"
  ON analytics_settings FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_settings_delete" ON analytics_settings;
CREATE POLICY "admin_settings_delete"
  ON analytics_settings FOR DELETE TO authenticated
  USING (true);

-- =============================================
-- IMPORTANTE: Desativar confirmação de e-mail
-- Supabase Dashboard → Authentication → Providers → Email
-- Desative "Confirm email"
-- =============================================
