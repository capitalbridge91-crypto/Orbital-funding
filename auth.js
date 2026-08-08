/* Login / signup */
(function () {
  const { sb, toast } = Orbital;
  const params = new URLSearchParams(location.search);
  let isSignup = params.get("mode") === "signup";

  const els = {
    title: document.getElementById("authTitle"),
    sub: document.getElementById("authSub"),
    nameField: document.getElementById("nameField"),
    fullName: document.getElementById("fullName"),
    email: document.getElementById("email"),
    password: document.getElementById("password"),
    submit: document.getElementById("submitBtn"),
    switchLabel: document.getElementById("switchLabel"),
    switchBtn: document.getElementById("switchBtn"),
    form: document.getElementById("authForm"),
    google: document.getElementById("googleBtn"),
  };

  function render() {
    els.title.textContent = isSignup ? "Create your account" : "Welcome back";
    els.sub.textContent = isSignup
      ? "Start funding your wallet in under a minute."
      : "Log in to your dashboard and inventory.";
    els.nameField.classList.toggle("hidden", !isSignup);
    els.submit.textContent = isSignup ? "Create account" : "Log in";
    els.switchLabel.textContent = isSignup ? "Already have an account?" : "New to Orbital?";
    els.switchBtn.textContent = isSignup ? "Log in" : "Create one";
    els.password.setAttribute("autocomplete", isSignup ? "new-password" : "current-password");
  }
  render();
  els.switchBtn.addEventListener("click", () => {
    isSignup = !isSignup;
    render();
  });

  /** Admins land on the admin console, everyone else on the dashboard. */
  async function routeAfterAuth() {
    const user = await Orbital.currentUser();
    if (user && (await Orbital.isAdmin(user.id))) {
      location.replace("admin.html");
      return;
    }
    location.replace("dashboard.html");
  }

  // Already signed in? Skip straight through.
  sb.auth.getSession().then(({ data }) => {
    if (data.session) routeAfterAuth();
  });

  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = els.email.value.trim();
    const password = els.password.value;
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Enter a valid email");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    els.submit.disabled = true;
    els.submit.textContent = "Please wait…";
    try {
      if (isSignup) {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: location.origin,
            data: { full_name: els.fullName.value.trim().slice(0, 100) },
          },
        });
        if (error) throw error;
        if (data.session) return routeAfterAuth();
        toast.success("Account created — you can log in now.");
        isSignup = false;
        render();
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return routeAfterAuth();
      }
    } catch (err) {
      toast.error(err && err.message ? err.message : "Something went wrong");
    } finally {
      els.submit.disabled = false;
      render();
    }
  });

  els.google.addEventListener("click", async () => {
    const redirectTo = location.href.replace(/[^/]*$/, "auth.html");
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) toast.error("Google sign-in failed. Please try again.");
  });
})();
