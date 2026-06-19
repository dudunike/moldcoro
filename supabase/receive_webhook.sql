-- ============================================================
-- MOLDS&COROS — Receptor de Webhook via PostgreSQL
-- Execute este SQL UMA VEZ no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/dqeyevscnuyqbwdhkqsv/sql
--
-- Depois use a URL:
-- https://dqeyevscnuyqbwdhkqsv.supabase.co/rest/v1/rpc/receive_webhook
-- com o header:  apikey: <anon_key>
-- ============================================================

CREATE OR REPLACE FUNCTION public.receive_webhook(jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  body     jsonb  := $1;
  ev       text;
  platform text;
  pname    text;
  val      numeric;
  otype    text;
  bname    text;
  bemail   text;
  txn      text;
BEGIN
  -- Ignorar eventos que não são vendas aprovadas
  ev := lower(COALESCE(
    body->>'event',
    body->>'status',
    body->>'order_status',
    body->>'trans_status',
    ''
  ));

  IF ev IN ('abandoned','refunded','chargeback','canceled','cancelled',
            'waiting_payment','waiting','recused','refused') THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'event', ev);
  END IF;

  -- ── Hotmart ──
  IF body->'data'->'purchase' IS NOT NULL THEN
    platform := 'hotmart';
    pname    := COALESCE(body->'data'->'product'->>'name', 'Produto');
    val      := COALESCE((body->'data'->'purchase'->'price'->>'value')::numeric,
                         (body->'data'->'purchase'->'full_price'->>'value')::numeric, 0);
    txn      := COALESCE(body->'data'->'purchase'->>'transaction', '');
    bname    := COALESCE(body->'data'->'buyer'->>'name', '');
    bemail   := COALESCE(body->'data'->'buyer'->>'email', '');
    otype    := CASE
      WHEN lower(COALESCE(body->'data'->'purchase'->'offer'->>'code','')) LIKE '%bump%'
        OR lower(COALESCE(body->>'event','')) LIKE '%bump%'   THEN 'order_bump'
      WHEN lower(COALESCE(body->'data'->'purchase'->'offer'->>'code','')) LIKE '%up%'
        OR lower(COALESCE(body->>'event','')) LIKE '%upsell%' THEN 'upsell'
      WHEN lower(COALESCE(body->'data'->'purchase'->'offer'->>'code','')) LIKE '%down%' THEN 'downsell'
      ELSE 'main'
    END;

  -- ── Kiwify ──
  ELSIF body->>'order_id' IS NOT NULL OR body->>'order_status' IS NOT NULL THEN
    platform := 'kiwify';
    pname    := COALESCE(body->'product'->>'name', body->>'product_name', 'Produto');
    val      := COALESCE((body->>'order_total')::numeric, (body->>'amount')::numeric, 0);
    txn      := COALESCE(body->>'order_id', '');
    bname    := COALESCE(body->'customer'->>'full_name', body->'customer'->>'name', '');
    bemail   := COALESCE(body->'customer'->>'email', '');
    otype    := CASE
      WHEN (body->>'order_bump')::boolean  THEN 'order_bump'
      WHEN (body->>'upsell')::boolean      THEN 'upsell'
      ELSE 'main'
    END;

  -- ── Braip ──
  ELSIF body->>'cod_transaction' IS NOT NULL OR body->>'chk_id' IS NOT NULL THEN
    platform := 'braip';
    pname    := COALESCE(body->>'prd_name', body->>'product', 'Produto');
    val      := COALESCE((body->>'vlr_total')::numeric, (body->>'amount')::numeric, 0);
    txn      := COALESCE(body->>'cod_transaction', body->>'chk_id', '');
    bname    := COALESCE(body->>'cus_name', '');
    bemail   := COALESCE(body->>'cus_email', '');
    otype    := 'main';

  -- ── Eduzz ──
  ELSIF body->>'trans_cod' IS NOT NULL THEN
    platform := 'eduzz';
    pname    := COALESCE(body->>'prd_name', 'Produto');
    val      := COALESCE((body->>'trans_paid')::numeric, (body->>'amount')::numeric, 0);
    txn      := COALESCE(body->>'trans_cod', '');
    bname    := COALESCE(body->>'cus_name', '');
    bemail   := COALESCE(body->>'cus_email', '');
    otype    := 'main';

  -- ── Genérico ──
  ELSE
    platform := COALESCE(body->>'platform', 'webhook');
    pname    := COALESCE(body->>'product_name', body->>'product', 'Produto');
    val      := COALESCE((body->>'value')::numeric, (body->>'amount')::numeric, 0);
    txn      := COALESCE(body->>'transaction', body->>'order_id', '');
    bname    := COALESCE(body->>'buyer_name', body->>'name', '');
    bemail   := COALESCE(body->>'buyer_email', body->>'email', '');
    otype    := COALESCE(body->>'order_type', 'main');
  END IF;

  INSERT INTO public.chaves_events (session_id, type, meta)
  VALUES (
    'wh_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6),
    'sale',
    jsonb_build_object(
      'source',       'moldscoros',
      'platform',     platform,
      'event',        ev,
      'product_name', pname,
      'value',        val,
      'currency',     'BRL',
      'order_type',   otype,
      'buyer_name',   bname,
      'buyer_email',  bemail,
      'transaction',  txn,
      'status',       'approved'
    )
  );

  RETURN jsonb_build_object('ok', true, 'platform', platform, 'value', val);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- Permitir que o anon (chave pública) chame esta função
GRANT EXECUTE ON FUNCTION public.receive_webhook(jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.receive_webhook(jsonb) TO authenticated;
