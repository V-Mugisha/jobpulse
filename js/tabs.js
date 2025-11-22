let _tabsInitialized = false;

function initTabs() {
  // Avoid double initialization
  if (_tabsInitialized) return;

  const tabButtons = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  if (!tabButtons.length) return; // components might not be loaded yet

  _tabsInitialized = true;

  function activate(tabName) {
    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    panels.forEach((p) => {
      p.classList.toggle('active', p.dataset.tab === tabName);
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => activate(btn.dataset.tab));

    btn.addEventListener('keydown', (e) => {
      // Arrow navigation between tabs (Left/Right)
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const arr = Array.from(tabButtons);
        const idx = arr.indexOf(btn);
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = (idx + dir + arr.length) % arr.length;
        arr[next].focus();
      }

      // Enter or Space activates a tab
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(btn.dataset.tab);
      }
    });
  });

  // expose a default active tab (first one) if none is active
  const anyActive = Array.from(tabButtons).some((b) => b.classList.contains('active'));
  if (!anyActive && tabButtons[0]) activate(tabButtons[0].dataset.tab);
}

document.addEventListener('DOMContentLoaded', initTabs);
document.addEventListener('components:loaded', initTabs);
