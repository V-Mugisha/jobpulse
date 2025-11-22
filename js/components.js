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
  // Repeatedly find and load any [data-component] elements that haven't
  // been loaded yet. This allows nested components to be inserted and
  // loaded after their parent components are fetched.
  while (true) {
    const nodes = Array.from(
      document.querySelectorAll("[data-component]")
    ).filter((n) => !n.__componentLoaded && !n.__componentLoading);
    if (!nodes.length) break;

    const promises = nodes.map((node) => {
      node.__componentLoading = true;
      const name = node.getAttribute("data-component");
      return loadComponent(node, name).then(() => {
        node.__componentLoaded = true;
      });
    });

    await Promise.all(promises);
  }

  // Let other scripts know components are ready
  const loadedEvent = new Event("components:loaded");
  document.dispatchEvent(loadedEvent);

  // Render icons if lucide is available
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadAll);
} else {
  loadAll();
}
