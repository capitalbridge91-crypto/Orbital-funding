/* User dashboard — sidebar sections, wallet, inventory, top-ups, purchases, profile */
(function () {
  const { sb, money, shortDate, esc, toast, copy, statusPill, cfg } = Orbital;

  const SECTIONS = [
    { key: "overview", label: "Dashboard", icon: "grid" },
    { key: "wallet", label: "Wallet", icon: "wallet" },
    { key: "accounts", label: "Funded Accounts", icon: "layers" },
    { key: "topup", label: "Top Up", icon: "upload" },
    { key: "purchases", label: "Purchases", icon: "receipt" },
    { key: "profile", label: "Profile", icon: "user" },
  ];

  const view = document.getElementById("view");
  const nav = document.getElementById("nav");
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");
  const pageTitle = document.getElementById("pageTitle");
  const balanceChip = document.getElementById("balanceChip");

  const state = { user: null, profile: null, accounts: [], topUps: [], purchases: [], section: "overview" };

  /* ---------- shell ---------- */
  function renderNav() {
    nav.innerHTML = SECTIONS.map(
      (s) =>
        `<button class="nav-item${s.key === state.section ? " active" : ""}" data-section="${s.key}">
           <span class="i" data-icon="${s.icon}"></span> ${s.label}
         </button>`,
    ).join("");
    Orbital.hydrateIcons(nav);
    nav.querySelectorAll("[data-section]").forEach((b) =>
      b.addEventListener("click", () => go(b.dataset.section)),
    );
  }

  const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

  function toggleSidebar(open) {
    if (isMobile()) {
      const isOpen = open === undefined ? !sidebar.classList.contains("open") : open;
      sidebar.classList.toggle("open", isOpen);
      sidebar.classList.remove("collapsed");
      scrim.classList.toggle("show", isOpen);
      document.body.style.overflow = isOpen ? "hidden" : "";
    } else {
      const isOpen =
        open === undefined ? sidebar.classList.contains("collapsed") : open;
      sidebar.classList.toggle("collapsed", !isOpen);
      sidebar.classList.remove("open");
      scrim.classList.remove("show");
      document.body.style.overflow = "";
    }
  }
  document.getElementById("hamburger").addEventListener("click", () => toggleSidebar());
  scrim.addEventListener("click", () => toggleSidebar(false));
  const closeBtn = document.getElementById("sidebarClose");
  if (closeBtn) closeBtn.addEventListener("click", () => toggleSidebar(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") toggleSidebar(false);
  });
  window.addEventListener("resize", () => {
    if (!isMobile()) {
      sidebar.classList.remove("open");
      scrim.classList.remove("show");
      document.body.style.overflow = "";
    } else {
      sidebar.classList.remove("collapsed");
    }
  });
  // start closed on mobile
  toggleSidebar(false);
  document.getElementById("logoutBtn").addEventListener("click", () => Orbital.signOut());

  function go(section) {
    state.section = section;
    location.hash = section;
    const meta = SECTIONS.find((s) => s.key === section);
    pageTitle.textContent = meta ? meta.label : "Dashboard";
    renderNav();
    if (isMobile()) toggleSidebar(false);
    render();
  }

  /* ---------- data ---------- */
  async function loadAll() {
    const [profile, accounts, topUps, purchases] = await Promise.all([
      sb.from("profiles").select("id, email, full_name, wallet_balance").eq("id", state.user.id).maybeSingle(),
      sb.from("accounts_catalog").select("*").order("price", { ascending: true }),
      sb.from("top_ups").select("*").order("created_at", { ascending: false }),
      sb
        .from("purchases")
        .select("id, price_paid, created_at, account_id, funded_accounts(code, name, account_size, login_username, login_password, broker_link)")
        .order("created_at", { ascending: false }),
    ]);
    state.profile = profile.data || { wallet_balance: 0, email: state.user.email, full_name: "" };
    state.accounts = accounts.data || [];
    state.topUps = topUps.data || [];
    state.purchases = purchases.data || [];
    balanceChip.textContent = money(state.profile.wallet_balance);
  }

  async function refresh() {
    await loadAll();
    render();
  }

  /* ---------- section renderers ---------- */
  const card = (inner, cls) => `<div class="card card-pad ${cls || ""}">${inner}</div>`;

  function overview() {
    const spent = state.purchases.reduce((s, p) => s + Number(p.price_paid || 0), 0);
    const pending = state.topUps.filter((t) => t.status === "pending").length;
    const available = state.accounts.filter((a) => !a.is_sold).length;
    const stats = [
      { label: "Wallet balance", value: money(state.profile.wallet_balance), icon: "wallet" },
      { label: "Accounts owned", value: String(state.purchases.length), icon: "layers" },
      { label: "Total spent", value: money(spent), icon: "dollar" },
      { label: "Pending top-ups", value: String(pending), icon: "clock", accent: pending > 0 },
    ];
    return `
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr))">
        ${stats
          .map(
            (s) => `<div class="card stat-card${s.accent ? " accent" : ""}">
              <div class="row-between"><span class="eyebrow">${s.label}</span>
              <span class="i" data-icon="${s.icon}" style="color:var(--primary)"></span></div>
              <div class="v truncate">${s.value}</div>
            </div>`,
          )
          .join("")}
      </div>
      <div class="grid grid-2" style="margin-top:22px">
        ${card(
          `<h2 style="font-size:17px">Get started</h2>
           <p class="muted" style="margin-top:8px;font-size:14px">Top up your wallet, then buy any account your balance covers. Credentials appear instantly.</p>
           <div class="row" style="margin-top:18px;flex-wrap:wrap;gap:8px">
             <button class="btn btn-sm" data-go="topup">Top up wallet</button>
             <button class="btn btn-outline btn-sm" data-go="accounts">Browse accounts</button>
           </div>`,
        )}
        ${card(
          `<h2 style="font-size:17px">Available inventory</h2>
           <div class="wallet-balance" style="margin-top:8px">${available}</div>
           <p class="muted" style="font-size:14px">accounts ready to purchase right now.</p>`,
        )}
      </div>`;
  }

  function walletSection() {
    return `
      ${card(
        `<span class="eyebrow">Available balance</span>
         <div class="wallet-balance" style="margin-top:6px">${money(state.profile.wallet_balance)}</div>
         <p class="muted" style="font-size:14px;margin-top:4px">Balance updates automatically once a top-up is approved.</p>
         <button class="btn btn-sm" style="margin-top:18px" data-go="topup">Add funds</button>`,
      )}
      <h2 style="margin:26px 0 14px;font-size:17px">Top-up history</h2>
      ${topUpHistory()}`;
  }

  function topUpHistory() {
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
            </div>
            <div>${statusPill(t.status)}</div>
          </div>
        </div>`,
      )
      .join("")}</div>`;
  }

  function accountsSection() {
    if (!state.accounts.length)
      return `<p class="muted" style="font-size:14px">No accounts in inventory yet. Check back shortly.</p>`;
    return `<div class="grid grid-3">${state.accounts
      .map((a) => {
        const owned = state.purchases.find((p) => p.account_id === a.id);
        const affordable = Number(state.profile.wallet_balance) >= Number(a.price);
        let action;
        if (owned)
          action = `<button class="btn btn-outline btn-block" data-view="${a.id}">View credentials</button>`;
        else if (a.is_sold)
          action = `<button class="btn btn-outline btn-block" disabled>Sold</button>`;
        else
          action = `<button class="btn btn-block" data-buy="${a.id}" ${affordable ? "" : "disabled"}>
            ${affordable ? "Purchase for " + money(a.price) : "Insufficient balance"}</button>`;
        return `<article class="card acct-card">
          <div class="row-between" style="align-items:flex-start">
            <div class="grow" style="min-width:0">
              <h3 style="font-size:16px">${esc(a.name)}</h3>
              <p class="muted" style="font-size:12px;margin-top:6px">${esc(a.description)}</p>
              <div class="mono eyebrow" style="margin-top:8px">${esc(a.code)}</div>
            </div>
            <span class="pill${a.is_sold && !owned ? " pill-danger" : ""}">${
              owned ? "Owned" : a.is_sold ? "Sold" : "Available"
            }</span>
          </div>
          <div class="acct-foot">
            <div><div class="eyebrow">Balance</div><div class="val">${money(a.account_size)}</div></div>
            <div style="text-align:right"><div class="eyebrow">Price</div><div class="val price">${money(a.price)}</div></div>
          </div>
          <div style="margin-top:18px">${action}</div>
        </article>`;
      })
      .join("")}</div>`;
  }

  function detailRows(list) {
    return list
      .map(
        (d) => `<div class="detail-row">
          <div style="min-width:0"><div class="eyebrow">${esc(d.label)}</div><div class="v">${esc(d.value)}</div></div>
          <button class="icon-btn" data-copy="${esc(d.value)}" data-copy-label="${esc(d.label)}" aria-label="Copy ${esc(d.label)}"><span class="i" data-icon="copy"></span></button>
        </div>`,
      )
      .join("");
  }

  function topUpSection() {
    return `
      <div class="grid grid-2">
        ${card(
          `<div class="row" style="gap:8px"><span class="i" data-icon="bitcoin" style="color:var(--primary)"></span>
           <h2 style="font-size:16px">Bitcoin</h2></div>
           <div class="stack" style="margin-top:14px">${detailRows(cfg.BTC_DETAILS)}</div>
           <p class="muted" style="font-size:12px;margin-top:12px">Send the exact amount, then submit the form with your transaction reference.</p>`,
        )}
        ${card(
          `<div class="row" style="gap:8px"><span class="i" data-icon="bank" style="color:var(--primary)"></span>
           <h2 style="font-size:16px">Bank transfer</h2></div>
           <div class="stack" style="margin-top:14px">${detailRows(cfg.BANK_DETAILS)}</div>
           <p class="muted" style="font-size:12px;margin-top:12px">Use your email as the payment narration so we can match it quickly.</p>`,
        )}
      </div>

      ${card(
        `<h2 style="font-size:17px">Submit a top-up</h2>
         <form id="topUpForm" style="margin-top:18px;display:grid;gap:16px">
           <div class="grid grid-2" style="gap:16px">
             <div class="field">
               <label for="tuAmount">Amount (USD)</label>
               <input id="tuAmount" type="number" min="1" step="0.01" required placeholder="250" />
             </div>
             <div class="field">
               <label for="tuMethod">Method</label>
               <select id="tuMethod">
                 <option value="bitcoin">Bitcoin</option>
                 <option value="bank_transfer">Bank transfer</option>
               </select>
             </div>
           </div>
           <div class="field">
             <label for="tuRef">Reference (optional)</label>
             <input id="tuRef" type="text" maxlength="120" placeholder="Transaction hash or bank reference" />
           </div>
           <div class="field">
             <label>Payment proof (optional)</label>
             <label class="file-drop" for="tuProof">
               <span class="i" data-icon="image"></span>
               <span id="tuProofLabel" class="truncate">Upload screenshot or receipt (max 5MB)</span>
             </label>
             <input id="tuProof" class="sr-only" type="file" accept="image/*,application/pdf" />
           </div>
           <button class="btn" id="tuSubmit" type="submit">Submit for approval</button>
         </form>`,
        "",
      )}
      <h2 style="margin:26px 0 14px;font-size:17px">Your requests</h2>
      ${topUpHistory()}`;
  }

  function purchasesSection() {
    if (!state.purchases.length)
      return `<p class="muted" style="font-size:14px">You have not purchased any accounts yet.</p>`;
    return `<div class="list">${state.purchases
      .map((p) => {
        const a = p.funded_accounts || {};
        return `<div class="card list-item">
          <div class="list-split">
            <div style="min-width:0">
              <div class="truncate" style="font-weight:600">${esc(a.name)}</div>
              <div class="mono eyebrow" style="margin-top:4px">${esc(a.code)} · ${money(a.account_size)}</div>
              <div class="muted" style="font-size:12px;margin-top:4px">${shortDate(p.created_at)}</div>
            </div>
            <div style="text-align:right">
              <div style="font-family:var(--font-display);font-size:17px;font-weight:600;color:var(--primary)">${money(p.price_paid)}</div>
              <button class="btn btn-outline btn-sm" style="margin-top:8px" data-view="${p.account_id}">Credentials</button>
            </div>
          </div>
        </div>`;
      })
      .join("")}</div>`;
  }

  function profileSection() {
    return card(
      `<h2 style="font-size:17px">Profile</h2>
       <form id="profileForm" style="margin-top:18px;display:grid;gap:16px;max-width:460px">
         <div class="field">
           <label for="pfName">Full name</label>
           <input id="pfName" type="text" maxlength="100" value="${esc(state.profile.full_name || "")}" />
         </div>
         <div class="field">
           <label for="pfEmail">Email</label>
           <input id="pfEmail" type="email" value="${esc(state.profile.email || state.user.email)}" disabled />
         </div>
         <div class="field">
           <label>Wallet balance</label>
           <input type="text" value="${money(state.profile.wallet_balance)}" disabled />
         </div>
         <button class="btn" type="submit">Save changes</button>
       </form>`,
    );
  }

  /* ---------- credentials modal ---------- */
  function showCredentials(acc) {
    const host = document.getElementById("modalHost");
    host.innerHTML = `
      <div class="modal-backdrop">
        <div class="card modal">
          <div class="row-between">
            <h2 style="font-size:18px">Account credentials</h2>
            <button class="icon-btn" data-close><span class="i" data-icon="close"></span></button>
          </div>
          <p class="muted" style="font-size:13px;margin-top:6px">${esc(acc.name)} · <span class="mono">${esc(acc.code)}</span></p>
          <div class="stack" style="margin-top:18px">
            ${detailRows([
              { label: "Username", value: acc.login_username },
              { label: "Password", value: acc.login_password },
            ])}
          </div>
          <a class="btn btn-block" style="margin-top:18px" href="${esc(acc.broker_link)}" target="_blank" rel="noopener noreferrer">
            Open broker login <span class="i" data-icon="external"></span>
          </a>
          <p class="muted" style="font-size:12px;margin-top:12px">Keep these details private — they are shown only to you.</p>
        </div>
      </div>`;
    Orbital.hydrateIcons(host);
    host.querySelector("[data-close]").addEventListener("click", () => (host.innerHTML = ""));
    host.querySelector(".modal-backdrop").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) host.innerHTML = "";
    });
    bindCopy(host);
  }

  function bindCopy(root) {
    root.querySelectorAll("[data-copy]").forEach((b) =>
      b.addEventListener("click", () => copy(b.dataset.copy, b.dataset.copyLabel)),
    );
  }

  /* ---------- actions ---------- */
  async function purchase(id, btn) {
    btn.disabled = true;
    btn.textContent = "Processing…";
    const { data, error } = await sb.rpc("purchase_account", { _account_id: id });
    if (error) {
      toast.error(error.message);
      btn.disabled = false;
      await refresh();
      return;
    }
    const acc = Array.isArray(data) ? data[0] : data;
    toast.success("Purchase complete — credentials unlocked");
    await refresh();
    if (acc) showCredentials(acc);
  }

  async function viewCredentials(accountId) {
    const { data, error } = await sb
      .from("funded_accounts")
      .select("code, name, login_username, login_password, broker_link")
      .eq("id", accountId)
      .maybeSingle();
    if (error || !data) return toast.error("Could not load credentials");
    showCredentials(data);
  }

  async function submitTopUp(e) {
    e.preventDefault();
    const amount = Number(document.getElementById("tuAmount").value);
    const method = document.getElementById("tuMethod").value;
    const reference = document.getElementById("tuRef").value.trim().slice(0, 120);
    const file = document.getElementById("tuProof").files[0];
    const btn = document.getElementById("tuSubmit");
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    if (file && file.size > 5 * 1024 * 1024) return toast.error("Proof must be under 5MB");

    btn.disabled = true;
    btn.textContent = "Submitting…";
    try {
      let proof_url = null;
      if (file) {
        const path = `${state.user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const up = await sb.storage.from("deposit-proofs").upload(path, file, { upsert: false });
        if (up.error) throw up.error;
        proof_url = path;
      }
      const { error } = await sb.from("top_ups").insert({
        user_id: state.user.id,
        amount,
        method,
        reference: reference || null,
        status: "pending",
        proof_url,
      });
      if (error) throw error;
      toast.success("Top-up submitted — awaiting approval");
      await refresh();
    } catch (err) {
      toast.error(err && err.message ? err.message : "Could not submit top-up");
    } finally {
      btn.disabled = false;
      btn.textContent = "Submit for approval";
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    const full_name = document.getElementById("pfName").value.trim().slice(0, 100);
    const { error } = await sb.from("profiles").update({ full_name }).eq("id", state.user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    await refresh();
  }

  /* ---------- render + bindings ---------- */
  function render() {
    const map = {
      overview,
      wallet: walletSection,
      accounts: accountsSection,
      topup: topUpSection,
      purchases: purchasesSection,
      profile: profileSection,
    };
    view.innerHTML = (map[state.section] || overview)();
    Orbital.hydrateIcons(view);
    bindCopy(view);
    view.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
    view.querySelectorAll("[data-buy]").forEach((b) =>
      b.addEventListener("click", () => purchase(b.dataset.buy, b)),
    );
    view.querySelectorAll("[data-view]").forEach((b) =>
      b.addEventListener("click", () => viewCredentials(b.dataset.view)),
    );
    const tu = document.getElementById("topUpForm");
    if (tu) {
      tu.addEventListener("submit", submitTopUp);
      const input = document.getElementById("tuProof");
      input.addEventListener("change", () => {
        document.getElementById("tuProofLabel").textContent =
          input.files[0] ? input.files[0].name : "Upload screenshot or receipt (max 5MB)";
      });
    }
    const pf = document.getElementById("profileForm");
    if (pf) pf.addEventListener("submit", saveProfile);
  }

  /* ---------- boot ---------- */
  (async function init() {
    const user = await Orbital.requireAuth();
    if (!user) return;
    state.user = user;
    const hash = location.hash.replace("#", "");
    if (SECTIONS.some((s) => s.key === hash)) state.section = hash;
    renderNav();
    const meta = SECTIONS.find((s) => s.key === state.section);
    pageTitle.textContent = meta.label;
    await loadAll();
    render();
  })();
})();
