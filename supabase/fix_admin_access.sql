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
-- 6. Criar usuário admin no Supabase Auth
--    (só precisa rodar uma vez — cria sua conta de login)
-- ============================================================
SELECT auth.uid(); -- teste: verifica se auth schema está acessível

-- Se der erro no SELECT acima, crie o usuário manualmente:
-- Dashboard Supabase → Authentication → Users → Add user → Create new user
-- Email: eduardoeustaquio369@gmail.com
-- Password: (sua senha)
-- ✅ Auto Confirm User: ATIVADO
