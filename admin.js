/* Admin console — stats, top-up approvals, inventory upload, sales */
(function () {
  const { sb, money, shortDate, esc, toast, statusPill } = Orbital;

  const TABS = [
    { key: "topups", label: "Top-ups" },
    { key: "upload", label: "Upload" },
    { key: "inventory", label: "Inventory" },
    { key: "sales", label: "Sales" },
  ];

  const statsEl = document.getElementById("stats");
  const tabsEl = document.getElementById("tabs");
  const bodyEl = document.getElementById("tabBody");
  const state = { tab: "topups", profiles: [], accounts: [], topUps: [], sales: [] };

  document.getElementById("logoutBtn").addEventListener("click", () => Orbital.signOut());

  const userLabel = (id) => {
    const p = state.profiles.find((x) => x.id === id);
    return p ? p.email || p.full_name || "user " + id.slice(0, 8) : "user " + String(id).slice(0, 8);
  };

  async function loadAll() {
    const [profiles, accounts, topUps, sales] = await Promise.all([
      sb.from("profiles").select("id, email, full_name, wallet_balance"),
      sb.from("funded_accounts").select("id, code, name, account_size, price, is_sold, sold_to, created_at").order("created_at", { ascending: false }),
      sb.from("top_ups").select("*").order("created_at", { ascending: false }),
      sb.from("purchases").select("id, user_id, price_paid, created_at, funded_accounts(code, name, account_size)").order("created_at", { ascending: false }),
    ]);
    state.profiles = profiles.data || [];
    state.accounts = accounts.data || [];
    state.topUps = topUps.data || [];
    state.sales = sales.data || [];
  }

  function renderStats() {
    const totalWallet = state.profiles.reduce((s, p) => s + Number(p.wallet_balance || 0), 0);
    const pending = state.topUps.filter((t) => t.status === "pending");
    const available = state.accounts.filter((a) => !a.is_sold);
    const sold = state.accounts.filter((a) => a.is_sold);
    const revenue = state.sales.reduce((s, x) => s + Number(x.price_paid || 0), 0);
    const cards = [
      { label: "Total users", value: String(state.profiles.length), icon: "users", hint: "registered" },
      { label: "Wallet balance", value: money(totalWallet), icon: "wallet", hint: "across all users" },
      {
        label: "Pending deposits",
        value: String(pending.length),
        icon: "clock",
        hint: money(pending.reduce((s, t) => s + Number(t.amount), 0)),
        accent: pending.length > 0,
      },
      { label: "Accounts available", value: String(available.length), icon: "package", hint: "in inventory" },
      { label: "Accounts sold", value: String(sold.length), icon: "dollar", hint: money(revenue) },
    ];
    statsEl.innerHTML = cards
      .map(
        (c) => `<div class="card stat-card${c.accent ? " accent" : ""}">
          <div class="row-between"><span class="eyebrow">${c.label}</span>
          <span class="i" data-icon="${c.icon}" style="color:var(--primary)"></span></div>
          <div class="v truncate">${c.value}</div>
          <div class="muted truncate" style="font-size:12px;margin-top:4px">${c.hint}</div>
        </div>`,
      )
      .join("");
    Orbital.hydrateIcons(statsEl);
  }

  function renderTabs() {
    const pending = state.topUps.filter((t) => t.status === "pending").length;
    tabsEl.innerHTML = TABS.map(
      (t) => `<button class="tab${t.key === state.tab ? " active" : ""}" data-tab="${t.key}">${t.label}${
        t.key === "topups" && pending ? ` <span class="pill pill-warn">${pending}</span>` : ""
      }</button>`,
    ).join("");
    tabsEl.querySelectorAll("[data-tab]").forEach((b) =>
      b.addEventListener("click", () => {
        state.tab = b.dataset.tab;
        renderTabs();
        renderBody();
      }),
    );
  }

  /* ---------- tab bodies ---------- */
  function topUpsBody() {
    if (!state.topUps.length) return `<p class="muted" style="font-size:14px">No top-up requests yet.</p>`;
    return `<div class="list">${state.topUps
      .map(
        (t) => `<div class="card list-item">
          <div class="list-split">
            <div style="min-width:0">
              <div style="font-family:var(--font-display);font-size:17px;font-weight:600">${money(t.amount)}</div>
              <div class="muted" style="font-size:12px;margin-top:3px">
                ${t.method === "bitcoin" ? "Bitcoin" : "Bank transfer"} · ${shortDate(t.created_at)}${
                  t.reference ? " · ref " + esc(t.reference) : ""
                }
              </div>
              <div class="muted truncate" style="font-size:11px;margin-top:3px">${esc(userLabel(t.user_id))}</div>
              ${
                t.proof_url
                  ? `<button class="link" style="margin-top:8px;font-size:12px" data-proof="${esc(t.proof_url)}">View payment proof</button>`
                  : ""
              }
            </div>
            <div class="row" style="flex-wrap:wrap;gap:8px;justify-content:flex-end">
              ${statusPill(t.status)}
              ${
                t.status === "pending"
                  ? `<button class="btn btn-sm" data-approve="${t.id}">Approve</button>
                     <button class="btn btn-outline btn-sm" data-reject="${t.id}">Reject</button>`
                  : ""
              }
            </div>
          </div>
        </div>`,
      )
      .join("")}</div>`;
  }

  function uploadBody() {
    return `<form id="acctForm" class="card card-pad grid grid-2" style="max-width:820px;gap:16px">
      <div class="field"><label for="fCode">Unique account code</label><input id="fCode" required maxlength="40" placeholder="ORB-10K-001" /></div>
      <div class="field"><label for="fName">Display name</label><input id="fName" required maxlength="120" value="Orbital Funded Account" /></div>
      <div class="field" style="grid-column:1/-1"><label for="fDesc">Description</label>
        <textarea id="fDesc" rows="2" maxlength="300">Account access by username and password secured</textarea></div>
      <div class="field"><label for="fSize">Account balance (USD)</label><input id="fSize" type="number" min="1" required placeholder="10000" /></div>
      <div class="field"><label for="fPrice">Price (USD)</label><input id="fPrice" type="number" min="1" max="100000" required placeholder="150" /></div>
      <div class="field"><label for="fUser">Login username</label><input id="fUser" required maxlength="200" /></div>
      <div class="field"><label for="fPass">Login password</label><input id="fPass" required maxlength="200" /></div>
      <div class="field" style="grid-column:1/-1"><label for="fLink">Broker login link</label>
        <input id="fLink" type="url" required maxlength="500" placeholder="https://broker.example.com/login" /></div>
      <div style="grid-column:1/-1"><button class="btn" id="acctSubmit" type="submit">Upload account</button></div>
    </form>`;
  }

  function inventoryBody() {
    if (!state.accounts.length) return `<p class="muted" style="font-size:14px">No accounts uploaded yet.</p>`;
    return `<div class="list">${state.accounts
      .map(
        (a) => `<div class="card list-item">
          <div class="list-split">
            <div style="min-width:0">
              <div class="truncate" style="font-weight:600">${esc(a.name)}</div>
              <div class="mono eyebrow" style="margin-top:4px">${esc(a.code)} · ${money(a.account_size)} · ${money(a.price)}</div>
            </div>
            <span class="pill${a.is_sold ? " pill-danger" : ""}">${
              a.is_sold ? "Sold to " + esc(a.sold_to ? userLabel(a.sold_to) : "—") : "Available"
            }</span>
          </div>
        </div>`,
      )
      .join("")}</div>`;
  }

  function salesBody() {
    if (!state.sales.length) return `<p class="muted" style="font-size:14px">No sales yet.</p>`;
    return `<div class="list">${state.sales
      .map((s) => {
        const a = s.funded_accounts || {};
        return `<div class="card list-item">
          <div class="list-split">
            <div style="min-width:0">
              <div class="truncate" style="font-weight:600">${esc(a.name)}</div>
              <div class="mono eyebrow truncate" style="margin-top:4px">${esc(a.code)} · ${esc(userLabel(s.user_id))}</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-display);font-size:17px;font-weight:600;color:var(--primary)">${money(s.price_paid)}</div>
              <div class="muted" style="font-size:11px">${shortDate(s.created_at)}</div>
            </div>
          </div>
        </div>`;
      })
      .join("")}</div>`;
  }

  /* ---------- actions ---------- */
  async function setStatus(id, status) {
    const { error } = await sb.from("top_ups").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "approved" ? "Top-up approved and wallet credited" : "Top-up rejected");
    await refresh();
  }

  async function openProof(path) {
    const { data, error } = await sb.storage.from("deposit-proofs").createSignedUrl(path, 300);
    if (error || !data) return toast.error("Could not open proof file");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function createAccount(e) {
    e.preventDefault();
    const payload = {
      code: document.getElementById("fCode").value.trim(),
      name: document.getElementById("fName").value.trim(),
      description: document.getElementById("fDesc").value.trim(),
      account_size: Number(document.getElementById("fSize").value),
      price: Number(document.getElementById("fPrice").value),
      login_username: document.getElementById("fUser").value.trim(),
      login_password: document.getElementById("fPass").value.trim(),
      broker_link: document.getElementById("fLink").value.trim(),
    };
    if (!payload.code || payload.account_size <= 0 || payload.price <= 0)
      return toast.error("Check the form values");
    const btn = document.getElementById("acctSubmit");
    btn.disabled = true;
    btn.textContent = "Uploading…";
    const { error } = await sb.from("funded_accounts").insert(payload);
    btn.disabled = false;
    btn.textContent = "Upload account";
    if (error) return toast.error(error.message);
    toast.success("Account uploaded to inventory");
    await refresh();
  }

  function renderBody() {
    const map = { topups: topUpsBody, upload: uploadBody, inventory: inventoryBody, sales: salesBody };
    bodyEl.innerHTML = (map[state.tab] || topUpsBody)();
    Orbital.hydrateIcons(bodyEl);
    bodyEl.querySelectorAll("[data-approve]").forEach((b) =>
      b.addEventListener("click", () => setStatus(b.dataset.approve, "approved")),
    );
    bodyEl.querySelectorAll("[data-reject]").forEach((b) =>
      b.addEventListener("click", () => setStatus(b.dataset.reject, "rejected")),
    );
    bodyEl.querySelectorAll("[data-proof]").forEach((b) =>
      b.addEventListener("click", () => openProof(b.dataset.proof)),
    );
    const f = document.getElementById("acctForm");
    if (f) f.addEventListener("submit", createAccount);
  }

  async function refresh() {
    await loadAll();
    renderStats();
    renderTabs();
    renderBody();
  }

  (async function init() {
    const user = await Orbital.requireAuth();
    if (!user) return;
    if (!(await Orbital.isAdmin(user.id))) {
      location.replace("dashboard.html");
      return;
    }
    await refresh();
  })();
})();
