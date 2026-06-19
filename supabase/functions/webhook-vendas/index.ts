import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-webhook-secret, Authorization",
};

serve(async (req: Request) => {
  /* ── Preflight ── */
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS });
  }

  /* ── GET — verificação de URL (muitas plataformas testam com GET antes de salvar) ── */
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, service: "webhook-vendas", status: "active" }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  /* ── Validar secret (opcional) ── */
  const url    = new URL(req.url);
  const secret = url.searchParams.get("secret") ?? req.headers.get("x-webhook-secret") ?? "";

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  /* maybeSingle() não lança erro quando não há registro */
  const { data: cfg } = await sb
    .from("chaves_events")
    .select("meta")
    .eq("type", "_mc_config")
    .limit(1)
    .maybeSingle();

  const savedSecret: string = (cfg?.meta as Record<string, string>)?.webhook_secret ?? "";

  if (savedSecret && secret !== savedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  /* ── Parse do payload ── */
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  /* ── Ignorar eventos que não são venda aprovada ── */
  const eventStr = String(
    body.event ?? body.status ?? body.order_status ?? body.trans_status ?? ""
  ).toLowerCase();

  const SKIP = ["abandoned", "refunded", "chargeback", "canceled", "cancelled",
                "waiting_payment", "waiting", "recused", "recusada", "refused"];

  if (SKIP.some((s) => eventStr.includes(s))) {
    return new Response(
      JSON.stringify({ ok: true, skipped: true, event: eventStr }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  /* ── Parse por plataforma ── */
  const sale = parseSale(body);

  const { error: insertErr } = await sb.from("chaves_events").insert({
    session_id: `sale_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type:       "sale",
    meta:       { source: "moldscoros", ...sale },
  });

  if (insertErr) {
    console.error("Insert error:", insertErr);
    return new Response(
      JSON.stringify({ error: "Database error", detail: insertErr.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, sale }),
    { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
  );
});

/* ─────────────────────────────────────────
   Parsers por plataforma
───────────────────────────────────────── */
function parseSale(b: Record<string, unknown>): Record<string, unknown> {

  /* Hotmart */
  if (b.data && (b as any).data?.purchase) {
    const d   = (b as any).data;
    const pur = d.purchase ?? {};
    const pro = d.product  ?? {};
    const buy = d.buyer    ?? {};
    return {
      platform:     "hotmart",
      event:        String(b.event ?? "PURCHASE_APPROVED"),
      product_name: String(pro.name ?? "Produto"),
      product_id:   String(pro.id   ?? ""),
      value:        Number(pur.price?.value ?? pur.full_price?.value ?? 0),
      currency:     String(pur.price?.currency_value ?? "BRL"),
      order_type:   hotmartOrderType(String(pur.offer?.code ?? ""), String(b.event ?? "")),
      buyer_name:   String(buy.name  ?? ""),
      buyer_email:  String(buy.email ?? ""),
      transaction:  String(pur.transaction ?? ""),
      status:       "approved",
    };
  }

  /* Kiwify */
  if ("order_status" in b || "order_id" in b) {
    const cus = (b as any).customer ?? {};
    const pro = (b as any).product  ?? {};
    return {
      platform:     "kiwify",
      event:        String(b.order_status ?? "paid"),
      product_name: String(pro.name ?? (b as any).product_name ?? "Produto"),
      product_id:   String(pro.id   ?? (b as any).product_id   ?? ""),
      value:        Number(b.order_total ?? b.amount ?? (b as any).sale_amount ?? 0),
      currency:     "BRL",
      order_type:   (b as any).order_bump ? "order_bump"
                  : (b as any).upsell     ? "upsell"
                  : "main",
      buyer_name:   String(cus.full_name ?? cus.name ?? ""),
      buyer_email:  String(cus.email ?? ""),
      transaction:  String(b.order_id ?? b.transaction ?? ""),
      status:       "approved",
    };
  }

  /* Braip */
  if (b.cod_transaction || b.chk_id) {
    return {
      platform:     "braip",
      event:        String(b.status ?? b.cod_status ?? "venda_aprovada"),
      product_name: String(b.prd_name ?? b.product ?? "Produto"),
      product_id:   String(b.prd_cod ?? ""),
      value:        Number(b.vlr_total ?? b.vlr_comissao ?? b.amount ?? 0),
      currency:     "BRL",
      order_type:   "main",
      buyer_name:   String(b.cus_name  ?? ""),
      buyer_email:  String(b.cus_email ?? ""),
      transaction:  String(b.cod_transaction ?? b.chk_id ?? ""),
      status:       "approved",
    };
  }

  /* Eduzz */
  if (b.trans_cod || b.key_passthrough) {
    return {
      platform:     "eduzz",
      event:        String(b.trans_status ?? "paid"),
      product_name: String(b.prd_name ?? "Produto"),
      product_id:   String(b.prd_cod  ?? ""),
      value:        Number(b.trans_paid ?? b.amount ?? 0),
      currency:     "BRL",
      order_type:   "main",
      buyer_name:   String(b.cus_name  ?? ""),
      buyer_email:  String(b.cus_email ?? ""),
      transaction:  String(b.trans_cod ?? ""),
      status:       "approved",
    };
  }

  /* Genérico / manual */
  return {
    platform:     String(b.platform     ?? "manual"),
    event:        String(b.event        ?? "sale"),
    product_name: String(b.product_name ?? b.product ?? "Produto"),
    product_id:   String(b.product_id   ?? ""),
    value:        Number(b.value ?? b.amount ?? b.price ?? 0),
    currency:     String(b.currency ?? "BRL"),
    order_type:   String(b.order_type ?? "main"),
    buyer_name:   String(b.buyer_name ?? b.name  ?? ""),
    buyer_email:  String(b.buyer_email ?? b.email ?? ""),
    transaction:  String(b.transaction ?? b.order_id ?? ""),
    status:       "approved",
  };
}

function hotmartOrderType(offerCode: string, event: string): string {
  const code = offerCode.toLowerCase();
  const ev   = event.toLowerCase();
  if (code.includes("bump") || ev.includes("bump"))     return "order_bump";
  if (code.includes("up")   || ev.includes("upsell"))   return "upsell";
  if (code.includes("down") || ev.includes("downsell")) return "downsell";
  return "main";
}
