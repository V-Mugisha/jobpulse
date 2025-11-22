async function loadComponent(el, name) {
  const path = `./components/${name}.html`;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    const html = await res.text();
    el.innerHTML = html;
  } catch (err) {
    console.error(err);
    el.innerHTML = `<div class="component-error">Could not load component: ${name}</div>`;
  }
}

async function loadAll() {
  const nodes = Array.from(document.querySelectorAll("[data-component]"));
  const promises = nodes.map((node) => {
    const name = node.getAttribute("data-component");
    return loadComponent(node, name);
  });

  await Promise.all(promises);

  // Let other scripts know components are ready
  const loadedEvent = new Event("components:loaded");
  document.dispatchEvent(loadedEvent);

  // Render icons if lucide is available - AI Generated
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadAll);
} else {
  loadAll();
}
