-- ============================================================
-- MOLDS&COROS — Correção de acesso do painel admin
-- Execute este SQL UMA VEZ no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/dqeyevscnuyqbwdhkqsv/sql/new
-- ============================================================

-- 1. Ativar RLS na chaves_events (se ainda não estiver ativa)
ALTER TABLE public.chaves_events ENABLE ROW LEVEL SECURITY;

-- 2. Anon pode INSERIR eventos (tracker.js da landing page)
DROP POLICY IF EXISTS "anon_insert_chaves" ON public.chaves_events;
CREATE POLICY "anon_insert_chaves"
  ON public.chaves_events FOR INSERT TO anon
  WITH CHECK (true);

-- 3. Admin autenticado pode LER eventos
DROP POLICY IF EXISTS "auth_select_chaves" ON public.chaves_events;
CREATE POLICY "auth_select_chaves"
  ON public.chaves_events FOR SELECT TO authenticated
  USING (true);

-- 4. Admin autenticado pode DELETAR eventos
DROP POLICY IF EXISTS "auth_delete_chaves" ON public.chaves_events;
CREATE POLICY "auth_delete_chaves"
  ON public.chaves_events FOR DELETE TO authenticated
  USING (true);

-- 5. Anon pode também chamar a função receive_webhook (já está no receive_webhook.sql)
-- GRANT EXECUTE ON FUNCTION public.receive_webhook(jsonb) TO anon; -- já feito

-- ============================================================
-- 6. Confirmar e-mail do usuário admin (roda se não consegue logar)
-- ============================================================
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at       = NOW(),
    updated_at         = NOW()
WHERE email = 'eduardoeustaquio369@gmail.com';

-- Verificar se funcionou (deve retornar 1 linha com email_confirmed_at preenchido):
SELECT email, email_confirmed_at, confirmed_at FROM auth.users
WHERE email = 'eduardoeustaquio369@gmail.com';
