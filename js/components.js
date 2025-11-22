async function loadComponent(el, name) {
  const path = `./components/${name}.html`;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    const html = await res.text();
    el.innerHTML = html;
    // mark this element as loaded so we don't reload it later
    try {
      el.__componentLoaded = true;
    } catch (e) {}
  } catch (err) {
    console.error(err);
    el.innerHTML = `<div class="component-error">Could not load component: ${name}</div>`;
  }
}

async function loadAll() {
  // Simple single-pass loader: load every top-level [data-component]
  const nodes = Array.from(document.querySelectorAll('[data-component]'));
  const promises = nodes.map((node) => {
    const name = node.getAttribute('data-component');
    return loadComponent(node, name);
  });

  await Promise.all(promises);

  // Notify listeners that components are ready
  document.dispatchEvent(new Event('components:loaded'));

  // Render icons if lucide is available
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadAll);
} else {
  loadAll();
}
