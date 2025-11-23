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

function initResultsControls() {
  // Select the controls directly by ID for reliability
  const form = document.getElementById("results-controls-form");
  if (!form) return;

  if (form.__resultsBound) return;
  form.__resultsBound = true;

  const searchInput = document.getElementById("search-results-input");
  const sortSelect = document.getElementById("sort");

  function logValues() {
    const data = {
      query: searchInput ? searchInput.value : "",
      sort: sortSelect ? sortSelect.value : "",
    };
    console.log("Results controls changed:", data);
  }

  if (searchInput) searchInput.addEventListener("input", logValues);
  if (sortSelect) sortSelect.addEventListener("change", logValues);
}

document.addEventListener("components:loaded", () => {
  initHeroForm();
  initResultsControls();
});

// Fetch initial jobs from Adzuna and feed the renderer.
async function fetchAndDisplayInitialJobs() {
  const adzunaAppId = 'xxx'; // Still finding a way to hide these
  const adzunaAppKey = 'xxxx';

  try {
    if (typeof fetchAdzunaNormalized !== 'function') {
      console.warn('API adapter not available: fetchAdzunaNormalized()');
      return;
    }

    const adapterResult = await fetchAdzunaNormalized({
      appId: adzunaAppId,
      appKey: adzunaAppKey,
      page: 1,
      resultsPerPage: 10
    });

    const normalizedJobs = adapterResult.jobs || [];

    if (typeof window.setSampleData === 'function') {
      window.setSampleData({ jobs: normalizedJobs });
    } else {
      window.SAMPLE_DATA = { jobs: normalizedJobs };
      document.dispatchEvent(new Event('data:loaded'));
    }
  } catch (err) {
    console.error('Failed to fetch initial jobs from Adzuna:', err);
  }
}

// Kick off initial fetch after components are loaded and UI is wired
document.addEventListener('components:loaded', () => {
  fetchAndDisplayInitialJobs();
});