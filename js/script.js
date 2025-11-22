console.log("Hello World");

function initHeroForm() {
  const heroRoot =
    document.querySelector('[data-component="hero"]') ||
    document.querySelector(".hero");
  if (!heroRoot) return;
  const form =
    heroRoot.querySelector("form.search-form") ||
    heroRoot.querySelector("form");
  if (!form) return;

  if (form.__heroFormBound) return;
  form.__heroFormBound = true;

  const jobInput = form.querySelector('input[name="jobTitle"]');
  const locInput = form.querySelector('input[name="location"]');

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const result = {
      jobTitle: jobInput ? jobInput.value.trim() : "",
      location: locInput ? locInput.value.trim() : "",
    };
    console.log("Hero form submitted:", result);
  });
}

document.addEventListener("components:loaded", initHeroForm);
document.addEventListener("DOMContentLoaded", () =>
  setTimeout(initHeroForm, 50)
);
