document.addEventListener("DOMContentLoaded", function () {
  const nav = document.getElementById("sbPageNav");

  if (!nav) return;

  const toggle = nav.querySelector(".sb-page-nav__toggle");

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
});