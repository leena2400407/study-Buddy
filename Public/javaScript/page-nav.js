document.addEventListener("DOMContentLoaded", function () {
  const nav = document.getElementById("sbPageNav");

  if (!nav) return;

  const toggle = nav.querySelector(".sb-page-nav__toggle");
  const langBtn = document.getElementById("langToggleBtn");
  const themeBtn = document.getElementById("themeToggleBtn");
  const navTextItems = nav.querySelectorAll("[data-en][data-ar]");

  // ─── Nav Open / Close ─────────────────────────────────────

  function animateIcon(isOpen) {
    if (!toggle) return;

    clearTimeout(toggle._sbMorphTimer);

    toggle.classList.remove("is-open");
    toggle.classList.add("is-morphing");

    toggle._sbMorphTimer = setTimeout(function () {
      toggle.classList.remove("is-morphing");
      toggle.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation"
      );
    }, 230);
  }

  function setNavState(isOpen, animate = true) {
    nav.classList.toggle("is-open", isOpen);

    if (animate) {
      animateIcon(isOpen);
    } else if (toggle) {
      clearTimeout(toggle._sbMorphTimer);
      toggle.classList.remove("is-morphing");
      toggle.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation"
      );
    }
  }

  function closeNav() {
    setNavState(false);
  }

  function toggleNav(event) {
    event.stopPropagation();
    setNavState(!nav.classList.contains("is-open"));
  }

  if (toggle) {
    toggle.addEventListener("click", toggleNav);
    setNavState(false, false);
  }

  document.addEventListener("click", function (event) {
    if (!event.target.closest("#sbPageNav")) {
      closeNav();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeNav();
    }
  });

  // ─── Cookie Helpers ───────────────────────────────────────

  function canUseDomainCookie() {
    const host = window.location.hostname;

    return host.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(host);
  }

  function setCookie(name, value) {
    document.cookie = name + "=" + value + "; path=/; SameSite=Lax";

    if (canUseDomainCookie()) {
      document.cookie =
        name +
        "=" +
        value +
        "; path=/; domain=" +
        window.location.hostname +
        "; SameSite=Lax";

      document.cookie =
        name +
        "=" +
        value +
        "; path=/; domain=." +
        window.location.hostname +
        "; SameSite=Lax";
    }
  }

  function clearCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    if (canUseDomainCookie()) {
      document.cookie =
        name +
        "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=" +
        window.location.hostname;

      document.cookie =
        name +
        "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=." +
        window.location.hostname;
    }
  }

  function setGoogleTranslateCookie(lang) {
    if (lang === "ar") {
      setCookie("googtrans", "/en/ar");
    } else {
      clearCookie("googtrans");
    }
  }

  // ─── Navbar Manual Translation ────────────────────────────

  function applyNavbarLanguage(lang) {
    navTextItems.forEach(function (item) {
      item.innerHTML = lang === "ar" ? item.dataset.ar : item.dataset.en;
    });

    if (langBtn) {
      langBtn.textContent = lang === "ar" ? "EN" : "AR";
      langBtn.classList.toggle("is-active", lang === "ar");
    }

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

    nav.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  }

  function hardReloadPage() {
    window.location.reload();
  }

  const savedLang = localStorage.getItem("sbLang") || "en";

  applyNavbarLanguage(savedLang);
  setGoogleTranslateCookie(savedLang);

  if (langBtn) {
    langBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      const currentLang = localStorage.getItem("sbLang") || "en";
      const nextLang = currentLang === "ar" ? "en" : "ar";

      localStorage.setItem("sbLang", nextLang);
      setGoogleTranslateCookie(nextLang);
      applyNavbarLanguage(nextLang);

      hardReloadPage();
    });
  }

  // ─── Shared Theme System ─────────────────────────────────

  function applyTheme(theme) {
    const isLight = theme === "light";

    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;

    document.documentElement.classList.toggle("theme-light", isLight);
    document.documentElement.classList.toggle("theme-dark", !isLight);

    document.body.classList.toggle("theme-light", isLight);
    document.body.classList.toggle("theme-dark", !isLight);

    document.body.classList.toggle("light-mode", isLight);
    document.body.classList.toggle("dark-mode", !isLight);
    document.body.classList.toggle("light-theme", isLight);
    document.body.classList.toggle("dark-theme", !isLight);

    if (themeBtn) {
      themeBtn.textContent = isLight ? "☾" : "☀";
      themeBtn.classList.toggle("is-active", isLight);
      themeBtn.setAttribute(
        "aria-label",
        isLight ? "Switch to dark mode" : "Switch to light mode"
      );
    }
  }

  const savedTheme = localStorage.getItem("sbTheme") || "dark";
  applyTheme(savedTheme);

  if (themeBtn) {
    themeBtn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      const currentTheme = localStorage.getItem("sbTheme") || "dark";
      const nextTheme = currentTheme === "light" ? "dark" : "light";

      localStorage.setItem("sbTheme", nextTheme);
      localStorage.setItem("studyBuddyCylinderTheme", nextTheme);

      applyTheme(nextTheme);
    });
  }
});