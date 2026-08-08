/* Orbital Funding — shared helpers (classic script, no build step) */
(function () {
  const cfg = window.ORBITAL_CONFIG;

  /* ---------- Supabase client ---------- */
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  /* ---------- formatting ---------- */
  const money = (v) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(Number(v ?? 0));

  const shortDate = (v) =>
    new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
    );

  /* ---------- toasts ---------- */
  function toast(message, kind) {
    let host = document.getElementById("toasts");
    if (!host) {
      host = document.createElement("div");
      host.id = "toasts";
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.textContent = message;
    host.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }
  toast.success = (m) => toast(m, "success");
  toast.error = (m) => toast(m, "error");

  /* ---------- clipboard ---------- */
  async function copy(value, label) {
    try {
      await navigator.clipboard.writeText(value);
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast.success((label || "Value") + " copied");
  }

  /* ---------- icons (inline svg) ---------- */
  const S = (p, extra) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="1em" height="1em" ${extra || ""}>${p}</svg>`;
  const icons = {
    zap: S('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/>'),
    wallet: S('<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M16 12h.01"/>'),
    grid: S('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'),
    layers: S('<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>'),
    upload: S('<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3"/>'),
    receipt: S('<path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2Z"/><path d="M8 9h8"/><path d="M8 13h6"/>'),
    user: S('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    logout: S('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>'),
    menu: S('<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>'),
    close: S('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    copy: S('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>'),
    bitcoin: S('<circle cx="12" cy="12" r="9"/><path d="M9.5 8h4a2 2 0 0 1 0 4h-4Zm0 4h4.5a2 2 0 0 1 0 4H9.5Z"/><path d="M11 6v2M11 16v2"/>'),
    bank: S('<path d="m3 10 9-6 9 6"/><path d="M5 10v9"/><path d="M19 10v9"/><path d="M9 10v9"/><path d="M15 10v9"/><path d="M3 21h18"/>'),
    shield: S('<path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z"/><path d="m9 12 2 2 4-4"/>'),
    external: S('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>'),
    users: S('<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M17 4a4 4 0 0 1 0 8"/><path d="M19 21a7 7 0 0 0-3-5.7"/>'),
    clock: S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    package: S('<path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z"/><path d="m3 7 9 5 9-5"/><path d="M12 12v10"/>'),
    dollar: S('<path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
    image: S('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>'),
    arrowLeft: S('<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>'),
    arrowRight: S('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
    check: S('<path d="M20 6 9 17l-5-5"/>'),
    quote: S('<path d="M7 7h4v6a4 4 0 0 1-4 4V7Z"/><path d="M14 7h4v6a4 4 0 0 1-4 4V7Z"/>'),
    lock: S('<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
    chart: S('<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>'),
    spinner: S('<path d="M21 12a9 9 0 1 1-6.2-8.6"/>', 'class="spin"'),
  };

  /* ---------- status pill ---------- */
  function statusPill(status) {
    const cls =
      status === "approved" ? "pill" : status === "rejected" ? "pill pill-danger" : "pill pill-warn";
    return `<span class="${cls}">${esc(status)}</span>`;
  }

  /* ---------- auth helpers ---------- */
  async function currentUser() {
    const { data } = await sb.auth.getUser();
    return data.user || null;
  }

  async function isAdmin(userId) {
    const { data } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return !!data;
  }

  /** Redirect to auth page when signed out. Returns the user. */
  async function requireAuth() {
    const user = await currentUser();
    if (!user) {
      window.location.replace("auth.html");
      return null;
    }
    return user;
  }

  async function signOut() {
    await sb.auth.signOut();
    window.location.replace("auth.html");
  }

  /* ---------- icon hydration: <span data-icon="zap"></span> ---------- */
  function hydrateIcons(root) {
    (root || document).querySelectorAll("[data-icon]").forEach((el) => {
      const svg = icons[el.getAttribute("data-icon")];
      if (svg) el.innerHTML = svg;
    });
  }
  document.addEventListener("DOMContentLoaded", () => hydrateIcons());

  window.Orbital = {
    hydrateIcons,
    sb,
    cfg,
    money,
    shortDate,
    esc,
    toast,
    copy,
    icons,
    statusPill,
    currentUser,
    isAdmin,
    requireAuth,
    signOut,
  };
})();
