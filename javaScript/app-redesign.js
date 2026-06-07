document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('app-redesign-ready');
  const revealItems = document.querySelectorAll('.reveal-on-scroll, .panel-card, .flow-card, .activity-card, .game-zone-card, .neo-stat');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(el => observer.observe(el));
  } else {
    revealItems.forEach(el => el.classList.add('is-visible'));
  }
});