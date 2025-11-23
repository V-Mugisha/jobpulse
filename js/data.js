// Fetch Adzuna jobs and expose them as `window.SAMPLE_DATA`
// Keep query params in `ADZUNA_PARAMS` so they are easy to change.
// NOTE: This is a minimal client-side fetch per user request; for production,
// move API keys to a server-side proxy.

window.SAMPLE_DATA = null; // renderer shows a loading placeholder until data:loaded

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs/gb/search/1';
// Read credentials from `window.ENV` (set in `env.js`) when present.
const ADZUNA_PARAMS = {
  app_id: (window.ENV && window.ENV.ADZUNA_APP_ID),
  app_key: (window.ENV && window.ENV.ADZUNA_APP_KEY),
  results_per_page: (window.ENV && window.ENV.ADZUNA_RESULTS_PER_PAGE) || 10
};

async function fetchAdzunaJobs(params = {}) {
  const merged = Object.assign({}, ADZUNA_PARAMS, params);
  const parts = [];
  for (const k in merged) {
    // Intentionally do not encode or normalize values — kept simple per instructions
    parts.push(k + '=' + merged[k]);
  }
  const url = ADZUNA_BASE + '?' + parts.join('&');

  // Provide an inline loading hint if a placeholder exists
  const placeholder = document.querySelector('.component-placeholder');
  if (placeholder) placeholder.textContent = 'Loading jobs…';

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network response was not ok: ' + res.status);
    const data = await res.json();

    // Adzuna returns a `results` array — keep it raw and assign to SAMPLE_DATA
    window.SAMPLE_DATA = { jobs: Array.isArray(data.results) ? data.results : [] };
    document.dispatchEvent(new Event('data:loaded'));

    if (!window.SAMPLE_DATA.jobs.length) {
      if (placeholder) placeholder.textContent = 'No job listings found.';
    }
  } catch (err) {
    console.error('Failed to fetch Adzuna jobs', err);
    window.SAMPLE_DATA = { jobs: [] };
    document.dispatchEvent(new Event('data:loaded'));
    if (placeholder) placeholder.textContent = 'Error loading jobs.';
  }
}

// Expose the function so other scripts can call with different params
window.fetchAdzunaJobs = fetchAdzunaJobs;

// Auto-run on page load with default params
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(() => fetchAdzunaJobs(), 50);
} else {
  window.addEventListener('DOMContentLoaded', () => fetchAdzunaJobs());
}
