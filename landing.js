/* Landing page */
(function () {
  document.getElementById("year").textContent = String(new Date().getFullYear());

  // Signed-in visitors get a direct link to their dashboard.
  Orbital.currentUser().then((user) => {
    if (!user) return;
    document.querySelectorAll('a[href^="auth.html"]').forEach((a) => {
      a.setAttribute("href", "dashboard.html");
      if (a.textContent.trim() === "Log in") a.textContent = "Dashboard";
    });
  });
})();
