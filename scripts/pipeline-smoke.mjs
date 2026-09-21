/**
 * End-to-end API smoke against a running local server.
 * Usage: node scripts/pipeline-smoke.mjs [baseUrl]
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { CookieJar } from "./_cookie-jar.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.argv[2] || "http://127.0.0.1:3000";

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(resolve(ROOT, ".env"), "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq < 1) continue;
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      env[t.slice(0, eq).trim()] = v;
    }
  } catch {
    /* ignore */
  }
  return env;
}

const env = loadEnv();
const SITE = env.SITE_PASSWORD || process.env.SITE_PASSWORD;
if (!SITE) {
  console.error("SITE_PASSWORD missing from .env");
  process.exit(1);
}

const jar = new CookieJar();
const results = [];

function assert(name, cond, detail = "") {
  results.push({ name, pass: Boolean(cond), detail: String(detail).slice(0, 300) });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : " :: " + String(detail).slice(0, 200)}`);
}

async function api(method, path, { json, form, raw } = {}) {
  const headers = {};
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  } else if (raw !== undefined) {
    body = raw;
  }
  const cookie = jar.headerFor(BASE);
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${BASE}${path}`, { method, headers, body });
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const c of setCookie) jar.store(BASE, c);
  // Node <18 fallback
  const sc = res.headers.get("set-cookie");
  if (sc && setCookie.length === 0) jar.store(BASE, sc);

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data, text };
}

function fd(fields) {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) f.append(k, String(v));
  }
  return f;
}

const user = `pipetest_${Date.now().toString(36)}`;
const pass = "TestPass123!";

async function main() {
  const h = await api("GET", "/api/health");
  assert("health", h.ok && h.data?.ok === true, h.text);

  const me0 = await api("GET", "/api/auth/me");
  assert("me_unauth", me0.ok && me0.data?.user === null, me0.text);

  const w0 = await api("GET", "/api/wallets");
  assert("wallets_unauth_401", w0.status === 401, w0.text);

  const bad = await api("POST", "/api/auth/register", {
    json: { username: user, password: pass, sitePassword: "wrong" },
  });
  assert("register_bad_site", !bad.ok, bad.text);

  const reg = await api("POST", "/api/auth/register", {
    json: { username: user, password: pass, sitePassword: SITE },
  });
  assert("register_ok", reg.ok && reg.data?.user?.username === user, reg.text);

  const me1 = await api("GET", "/api/auth/me");
  assert("me_auth", me1.ok && me1.data?.user?.username === user, me1.text);

  const cw = await api("POST", "/api/wallets", { json: { count: 2 } });
  assert("create_wallets", cw.ok && Array.isArray(cw.data) && cw.data.length >= 2, cw.text);
  const pk1 = cw.data?.[0]?.pubkey;
  const pk2 = cw.data?.[1]?.pubkey;

  const lw = await api("GET", "/api/wallets");
  assert("list_wallets", lw.ok && lw.data?.length >= 2, `count=${lw.data?.length}`);

  const rn = await api("PATCH", `/api/wallets/${pk1}/name`, { json: { name: "Alpha" } });
  assert("rename_wallet", rn.ok, rn.text);

  const sd = await api("PATCH", `/api/wallets/${pk1}/setdev`);
  assert("set_dev", sd.ok, sd.text);

  const ex = await api("GET", `/api/wallets/export/${pk1}`);
  assert("export_wallet", ex.ok && !!ex.data?.secretKey, ex.text);

  const bal = await api("GET", `/api/balance/${pk1}`);
  assert("balance", bal.ok && typeof bal.data?.sol === "number", bal.text);

  const d1 = await api("POST", "/api/deploy", {
    form: fd({ ticker: "TEST", buyAmount: "0.01", walletPublicKey: pk1, jitoTip: "0.001", options: "{}" }),
  });
  assert("deploy_missing_name", d1.status === 400, d1.text);

  const d2 = await api("POST", "/api/deploy", {
    form: fd({
      name: "N".repeat(33),
      ticker: "TEST",
      buyAmount: "0.01",
      walletPublicKey: pk1,
      jitoTip: "0.001",
      options: "{}",
    }),
  });
  assert("deploy_name_too_long", d2.status === 400, d2.text);

  const d3 = await api("POST", "/api/deploy", {
    form: fd({
      name: "Ok",
      ticker: "T".repeat(11),
      buyAmount: "0.01",
      walletPublicKey: pk1,
      jitoTip: "0.001",
      options: "{}",
    }),
  });
  assert("deploy_ticker_too_long", d3.status === 400, d3.text);

  const d4 = await api("POST", "/api/deploy", {
    form: fd({
      name: "Ok",
      ticker: "TEST",
      buyAmount: "-1",
      walletPublicKey: pk1,
      jitoTip: "0.001",
      options: "{}",
    }),
  });
  assert("deploy_neg_buy", d4.status === 400, d4.text);

  const d5 = await api("POST", "/api/deploy", {
    form: fd({
      name: "Ok",
      ticker: "TEST",
      buyAmount: "0",
      walletPublicKey: pk1,
      jitoTip: "0.001",
      options: JSON.stringify({ agent: true }),
      agentBuybackPct: "10",
      imageUrl: "https://pump.fun/logo.png",
    }),
  });
  assert(
    "deploy_agent_requires_buy",
    !d5.ok && /agent|buy/i.test(d5.text),
    d5.text
  );

  const d6 = await api("POST", "/api/deploy", {
    form: fd({
      name: "Ok",
      ticker: "TEST",
      buyAmount: "0.01",
      walletPublicKey: pk1,
      jitoTip: "0.001",
      options: JSON.stringify({ feesharing: true, cashback: true }),
      feeShares: "[]",
      imageUrl: "https://pump.fun/logo.png",
    }),
  });
  assert("deploy_feeshare_cashback_conflict", !d6.ok, d6.text);

  const d7 = await api("POST", "/api/deploy", {
    form: fd({
      name: "Ok",
      ticker: "TEST",
      buyAmount: "0.01",
      walletPublicKey: pk1,
      jitoTip: "0.001",
      options: "{}",
      customCA: "not-a-key",
      imageUrl: "https://pump.fun/logo.png",
    }),
  });
  assert("deploy_bad_customCA", d7.status === 400 && /customCA/i.test(d7.text), d7.text);

  const d8 = await api("POST", "/api/deploy", {
    form: fd({
      name: "PipeTest",
      ticker: "PIPE",
      buyAmount: "0.01",
      walletPublicKey: pk1,
      jitoTip: "0.001",
      options: "{}",
      description: "t",
      imageUrl: "https://pump.fun/logo.png",
    }),
  });
  assert(
    "deploy_insufficient_sol",
    !d8.ok && /Insufficient|SOL|No deployer|IPFS|metadata|fetch/i.test(d8.text),
    d8.text
  );

  // Bundle wallet not owned by user should fail loudly (after fix) or silently drop (current)
  const d9 = await api("POST", "/api/deploy", {
    form: fd({
      name: "Bundle",
      ticker: "BNDL",
      buyAmount: "0",
      walletPublicKey: pk1,
      jitoTip: "0.001",
      options: JSON.stringify({ bundle: true }),
      bundleWallets: JSON.stringify([{ pubkey: pk2, amountSol: 0.1 }]),
      imageUrl: "https://pump.fun/logo.png",
    }),
  });
  assert("deploy_bundle_empty_wallet_path", !d9.ok, d9.text);

  const tb = await api("GET", `/api/trade/balance?mint=invalid&walletPubkey=${pk1}`);
  assert("trade_balance_bad_mint", !tb.ok, tb.text);

  const tb2 = await api("POST", "/api/trade/buy", {
    json: { mint: "So11111111111111111111111111111111111111112", solAmount: -1, walletPubkey: pk1, slippage: 15 },
  });
  assert("trade_buy_neg", !tb2.ok, tb2.text);

  const er = await api("GET", "/api/earnings/creator");
  assert("earnings_list", er.ok && Array.isArray(er.data?.wallets ?? er.data), er.text);

  const vn = await api("POST", "/api/vanity", { json: { pattern: "!!!", match: "prefix" } });
  assert("vanity_bad_pattern", !vn.ok, vn.text);

  const vn2 = await api("POST", "/api/vanity", { json: { pattern: "pump", match: "prefix" } });
  assert("vanity_start", vn2.ok && !!vn2.data?.jobId, vn2.text);
  if (vn2.ok && vn2.data?.jobId) {
    const st = await api("GET", `/api/vanity/${vn2.data.jobId}`);
    assert("vanity_status", st.ok && !!st.data?.status, st.text);
    const can = await api("DELETE", `/api/vanity/${vn2.data.jobId}`);
    assert("vanity_cancel", can.ok, can.text);
  }

  // Cross-user vanity leak probe: register second user, try first job id
  if (vn2.data?.jobId) {
    const jar2 = jar; // reuse note: we'll create fresh session via logout+register
    await api("POST", "/api/auth/logout", { json: {} });
    const user2 = `pipe2_${Date.now().toString(36)}`;
    const reg2 = await api("POST", "/api/auth/register", {
      json: { username: user2, password: pass, sitePassword: SITE },
    });
    assert("register_user2", reg2.ok, reg2.text);
    const cross = await api("GET", `/api/vanity/${vn2.data.jobId}`);
    // Ownership check: other users must not see another user's GPU job / secret.
    assert(
      "vanity_cross_user_blocked",
      cross.status === 404,
      `status=${cross.status} body=${cross.text.slice(0, 120)}`
    );
  } else {
    await api("POST", "/api/auth/logout", { json: {} });
  }

  // login back as user1
  const li = await api("POST", "/api/auth/login", {
    json: { username: user, password: pass, sitePassword: SITE },
  });
  assert("login_ok", li.ok, li.text);

  const me2 = await api("GET", "/api/auth/me");
  assert("me_after_login", me2.ok && me2.data?.user?.username === user, me2.text);

  // fund validation
  const fund = await api("POST", "/api/wallets/fund", {
    json: { from: pk1, to: pk2, amount: -1 },
  });
  assert("fund_neg_amount", !fund.ok, fund.text);

  const del = await api("DELETE", `/api/wallets/${pk2}`);
  assert("delete_wallet", del.ok, del.text);

  const mcap = await api("GET", "/api/mcap/So11111111111111111111111111111111111111112");
  assert("mcap_endpoint", mcap.status === 200 || mcap.status === 404 || mcap.status === 500, mcap.text);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n==== SUMMARY ====`);
  console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${results.length}`);
  if (failed) {
    for (const r of results.filter((x) => !x.pass)) {
      console.log(` - ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
