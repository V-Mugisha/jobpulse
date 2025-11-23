console.log("Hello");

const searchJobsBtn = document.getElementById("search-job-btn");
const toggleFiltersBtn = document.getElementById("toggle-filters");
const filtersSection = document.getElementById("filters-panel");

toggleFiltersBtn.addEventListener("click", () => {
  const btnTextEl = document.getElementById("btn-text");
  const isOpen = filtersSection.classList.contains("open");
  if (isOpen) {
    filtersSection.classList.remove("open");
    if (btnTextEl) btnTextEl.textContent = "Show Filters";
  } else {
    filtersSection.classList.add("open");
    if (btnTextEl) btnTextEl.textContent = "Hide Filters";
  }
});

// Reset button: clear inputs/filters and reload default API results
const resetJobsBtn = document.getElementById("reset-job-btn");
if (resetJobsBtn) {
  resetJobsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const titleInput = document.getElementById("jobTitle");
    if (titleInput) titleInput.value = "";
    const resultsSearch = document.getElementById("search-results-input");
    if (resultsSearch) resultsSearch.value = "";
    // Re-fetch the default API results and render
    getJobs(DEFAULTS);
  });
}

const searchResultsInput = document.getElementById("search-results-input");
// Unified filter + search application: reads filter controls and search input
function readFilterState() {
  const query =
    (document.getElementById("search-results-input") || {}).value || "";
  const employment = {
    remote: !!document.getElementById("filter-remote")?.checked,
    onsite: !!document.getElementById("filter-onsite")?.checked,
    hybrid: !!document.getElementById("filter-hybrid")?.checked,
  };
  const experience = {
    junior: !!document.getElementById("filter-junior")?.checked,
    mid: !!document.getElementById("filter-mid")?.checked,
    senior: !!document.getElementById("filter-senior")?.checked,
  };
  const salaryMinK =
    Number(document.getElementById("filter-salary-min")?.value || "") || null;
  const salaryMaxK =
    Number(document.getElementById("filter-salary-max")?.value || "") || null;
  return {
    query: query.trim().toLowerCase(),
    employment,
    experience,
    salaryMinK,
    salaryMaxK,
  };
}

function inferEmploymentTags(job) {
  const txt = (
    (job.title || "") +
    " \n " +
    (job.description || "") +
    " \n " +
    (job.location && job.location.display_name ? job.location.display_name : "")
  ).toLowerCase();
  const isRemote = /remote|work from home|home-based|home based/.test(txt);
  const isHybrid = /hybrid/.test(txt);
  const isOnsite = !isRemote && !isHybrid; // best-effort
  return { isRemote, isHybrid, isOnsite };
}

function inferExperience(job) {
  const title = (job.title || "").toLowerCase();
  if (/senior|lead|principal|manager|director|sr\b/.test(title))
    return "senior";
  if (/junior|jr\b|entry|graduate|trainee/.test(title)) return "junior";
  return "mid";
}

function jobSalaryValue(job) {
  // prefer salary_max for upper-bound sorting/filtering, fallback to salary_min
  const v = job.salary_max ?? job.salary_min ?? null;
  const n = v == null ? null : Number(v);
  return Number.isNaN(n) ? null : n;
}

function computeFilteredJobs() {
  const base = Array.isArray(window.ALL_JOBS)
    ? window.ALL_JOBS
    : Array.isArray(window.DISPLAYED_JOBS)
    ? window.DISPLAYED_JOBS
    : [];
  const { query, employment, experience, salaryMinK, salaryMaxK } =
    readFilterState();

  const minSalary = salaryMinK ? salaryMinK * 1000 : null;
  const maxSalary = salaryMaxK ? salaryMaxK * 1000 : null;

  return base.filter((job) => {
    // text search
    if (query) {
      const hay = (
        (job.title || "") +
        " " +
        (job.description || "") +
        " " +
        ((job.company && (job.company.display_name || job.company.name)) || "")
      )
        .toString()
        .toLowerCase();
      if (!hay.includes(query)) return false;
    }

    // employment filters
    const tags = inferEmploymentTags(job);
    const employmentFilters = Object.entries(employment)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (employmentFilters.length > 0) {
      // if any selected matches job -> OK
      let ok = false;
      for (const f of employmentFilters) {
        if (f === "remote" && tags.isRemote) ok = true;
        if (f === "hybrid" && tags.isHybrid) ok = true;
        if (f === "onsite" && tags.isOnsite) ok = true;
      }
      if (!ok) return false;
    }

    // experience filters
    const expFilters = Object.entries(experience)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (expFilters.length > 0) {
      const exp = inferExperience(job);
      if (!expFilters.includes(exp)) return false;
    }

    // salary filters
    const sal = jobSalaryValue(job);
    if (minSalary != null && (sal == null || sal < minSalary)) return false;
    if (maxSalary != null && (sal == null || sal > maxSalary)) return false;

    return true;
  });
}

function applyFiltersAndRender() {
  // base is ALL_JOBS (current fetched page). Filter it then replace DISPLAYED_JOBS and render.
  if (!window.ALL_JOBS) window.ALL_JOBS = window.DISPLAYED_JOBS || [];
  window.DISPLAYED_JOBS = computeFilteredJobs();
  renderJobListings();
}

if (searchResultsInput) {
  searchResultsInput.addEventListener("input", (e) => {
    // typing in search field should combine with filters
    applyFiltersAndRender();
  });
}

const DEFAULTS = {
  jobTitle: "",
  resultsPerPage: 10,
  page: 1,
};

// Track last used params so retry can re-run the same request
window.LAST_JOB_PARAMS = null;

function setLoading(isLoading) {
  const container = document.querySelector(".results-container");
  const searchBtn = document.getElementById("search-job-btn");
  const resetBtn = document.getElementById("reset-job-btn");
  const titleInput = document.getElementById("jobTitle");
  const resultsSearch = document.getElementById("search-results-input");
  const perPageSelect = document.getElementById("per-page-select");
  const paginationControls = document.getElementById("pagination-controls");

  if (isLoading) {
    if (container) {
      container.setAttribute("aria-busy", "true");
      container.innerHTML =
        '<div class="loading-ui">\n        <div class="spinner" aria-hidden="true"></div>\n        <div class="loading-text">Loading jobs…</div>\n      </div>';
    }
  } else {
    if (container) {
      container.removeAttribute("aria-busy");
    }
  }

  if (searchBtn) searchBtn.disabled = !!isLoading;
  if (resetBtn) resetBtn.disabled = !!isLoading;
  if (titleInput) titleInput.disabled = !!isLoading;
  if (resultsSearch) resultsSearch.disabled = !!isLoading;
  if (perPageSelect) perPageSelect.disabled = !!isLoading;
  // also disable pagination buttons while loading
  if (paginationControls) {
    const prev = paginationControls.querySelector("#prev-page");
    const next = paginationControls.querySelector("#next-page");
    if (prev) prev.disabled = !!isLoading;
    if (next) next.disabled = !!isLoading;
  }
}

function setError(message) {
  const container = document.querySelector(".results-container");
  if (!container) return;
  if (!message) {
    // clear any existing error
    container.innerHTML = "";
    return;
  }
  const msg = message || "An error occurred while loading jobs.";
  container.innerHTML = `\n    <div class="error-ui" role="alert">\n      <div class="error-text">${msg}</div>\n      <button class="btn primary" id="retry-btn">Retry</button>\n    </div>`;
  // clear pagination when there's an error
  const paginationControls = document.getElementById("pagination-controls");
  if (paginationControls) paginationControls.innerHTML = "";
  const retryBtn = document.getElementById("retry-btn");
  if (retryBtn) {
    retryBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // Retry the last request or default
      getJobs(window.LAST_JOB_PARAMS || DEFAULTS);
    });
  }
}

function clearError() {
  const container = document.querySelector(".results-container");
  if (!container) return;
  container.innerHTML = "";
}
async function getJobs(params) {
  // store last params for retry
  window.LAST_JOB_PARAMS = params;
  const title = encodeURIComponent(params.jobTitle || "");
  const perPage = params.resultsPerPage || DEFAULTS.resultsPerPage;
  const page = params.page || 1;

  // Read Adzuna credentials from the local `env.js` (window.ENV).
  // This keeps keys out of the main script and allows local overrides.
  const appId = window.ENV && window.ENV.ADZUNA_APP_ID;
  const appKey = window.ENV && window.ENV.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    setError(
      "Missing Adzuna API keys. Add `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` to `env.js`."
    );
    return;
  }

  // Adzuna expects the page number in the path; include results_per_page as query
  const url = `https://api.adzuna.com/v1/api/jobs/gb/search/${page}?app_id=${encodeURIComponent(
    appId
  )}&app_key=${encodeURIComponent(appKey)}&results_per_page=${perPage}&title_only=${title}`;
  try {
    setError(null);
    setLoading(true);
    console.log(url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Preserve the full set of results and use a separate displayed list
    window.ALL_JOBS = data.results || [];
    // total results count from API (may vary by API naming)
    window.TOTAL_RESULTS =
      data.count || data.total || data.results_count || window.ALL_JOBS.length;
    // Apply any active filters/search to the newly fetched page
    applyFiltersAndRender();
  } catch (error) {
    console.error("Fetch error:", error);
    setError(error.message || "Failed to fetch jobs from the API.");
  } finally {
    setLoading(false);
  }
}

getJobs(DEFAULTS);

function formatPostedDate(createdIso, postedDaysAgo) {
  if (createdIso) {
    const d = new Date(createdIso);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  if (postedDaysAgo != null) return postedDaysAgo + " days ago";
  return "Unknown";
}

// Current client-side sort (applied to DISPLAYED_JOBS)
window.CURRENT_SORT = window.CURRENT_SORT || "recent";

function getJobTimestamp(job) {
  if (!job) return 0;
  if (job.created) {
    const t = Date.parse(job.created);
    if (!Number.isNaN(t)) return t;
  }
  if (job.postedDaysAgo != null && !Number.isNaN(Number(job.postedDaysAgo))) {
    // approximate timestamp from days ago
    return Date.now() - Number(job.postedDaysAgo) * 24 * 60 * 60 * 1000;
  }
  return 0;
}

function applySort(jobs) {
  if (!Array.isArray(jobs)) return jobs || [];
  const sort =
    (document.getElementById("sort") || {}).value ||
    window.CURRENT_SORT ||
    "recent";
  // copy to avoid mutating original array reference
  const list = [...jobs];
  switch (sort) {
    case "salary_desc":
      return list.sort((a, b) => {
        const aSal = Number(a.salary_max ?? a.salary_min ?? -Infinity);
        const bSal = Number(b.salary_max ?? b.salary_min ?? -Infinity);
        if (Number.isNaN(aSal)) return 1;
        if (Number.isNaN(bSal)) return -1;
        return bSal - aSal;
      });
    case "salary_asc":
      return list.sort((a, b) => {
        const aSal = Number(a.salary_min ?? a.salary_max ?? Infinity);
        const bSal = Number(b.salary_min ?? b.salary_max ?? Infinity);
        if (Number.isNaN(aSal)) return 1;
        if (Number.isNaN(bSal)) return -1;
        return aSal - bSal;
      });
    case "company_az":
      return list.sort((a, b) => {
        const aa =
          (a.company && (a.company.display_name || a.company.name)) || "";
        const bb =
          (b.company && (b.company.display_name || b.company.name)) || "";
        return aa
          .toString()
          .localeCompare(bb.toString(), undefined, { sensitivity: "base" });
      });
    case "contract_type":
      return list.sort((a, b) => {
        const aa = (a.contract_type || "").toString();
        const bb = (b.contract_type || "").toString();
        return aa.localeCompare(bb, undefined, { sensitivity: "base" });
      });
    case "recent":
    default:
      return list.sort((a, b) => getJobTimestamp(b) - getJobTimestamp(a));
  }
}

function renderJobListings() {
  const container = document.querySelector(".results-container");
  if (!container) return;
  container.innerHTML = "";
  const list = document.createElement("div");
  list.className = "job-list";

  // Apply client-side sorting to the currently displayed results
  const jobs = applySort(window.DISPLAYED_JOBS || []);

  console.log("Jobs", jobs);

  jobs.forEach((job) => {
    const art = document.createElement("article");
    art.className = "job-card";

    const left = document.createElement("div");
    left.className = "job-left";

    const titleEl = document.createElement("h3");
    titleEl.className = "job-title";
    titleEl.textContent = job.title || job.name || "Untitled";
    left.appendChild(titleEl);

    const companyEl = document.createElement("div");
    companyEl.className = "company";
    companyEl.textContent =
      (job.company && (job.company.display_name || job.company.name)) ||
      job.company ||
      "";
    left.appendChild(companyEl);

    const meta = document.createElement("div");
    meta.className = "job-meta";

    const locSpan = document.createElement("span");
    locSpan.className = "meta-item";
    locSpan.innerHTML =
      '<span data-lucide="map-pin"></span> ' +
      (typeof job.location === "string"
        ? job.location
        : (job.location && job.location.display_name) || "");
    meta.appendChild(locSpan);

    const salarySpan = document.createElement("span");
    salarySpan.className = "meta-item";
    let salaryDisplay = "Salary not listed";
    if (typeof job.salary_min === "number") {
      salaryDisplay = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(job.salary_min);
    } else if (job.salary_min) {
      const n = Number(job.salary_min);
      if (!Number.isNaN(n)) {
        salaryDisplay = new Intl.NumberFormat("de-DE", {
          style: "currency",
          currency: "EUR",
        }).format(n);
      }
    }
    salarySpan.textContent = salaryDisplay;
    meta.appendChild(salarySpan);

    const tag = document.createElement("span");
    tag.className = "tag-pill";
    tag.textContent = job.contract_type || "";
    meta.appendChild(tag);

    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "job-right";
    const time = document.createElement("div");
    time.className = "timestamp";
    // Prefer `created` ISO timestamp from API; fall back to `postedDaysAgo` if present
    time.textContent = formatPostedDate(job.created, job.postedDaysAgo);
    right.appendChild(time);
    const btn = document.createElement("button");
    btn.className = "btn secondary view-btn";
    btn.innerHTML = 'View Details <span data-lucide="external-link"></span>';
    // Open job details modal when clicked
    btn.addEventListener("click", function () {
      showJobDetails(job);
    });
    right.appendChild(btn);

    art.appendChild(left);
    art.appendChild(right);
    list.appendChild(art);
  });

  container.appendChild(list);
  // render pagination controls after list
  renderPagination();
  if (window.lucide && typeof window.lucide.createIcons === "function")
    window.lucide.createIcons();
}

// Job details modal implementation
let _currentJobDetailsModal = null;

function buildJobDetailsElement(job) {
  const wrapper = document.createElement("div");
  wrapper.className = "job-details-content";

  const closeBtn = document.createElement("button");
  closeBtn.className = "job-details-close";
  closeBtn.type = "button";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", closeJobDetails);
  wrapper.appendChild(closeBtn);

  const title = document.createElement("h2");
  title.textContent = job.title || job.name || "Untitled";
  wrapper.appendChild(title);

  const company = document.createElement("div");
  company.className = "job-details-company";
  company.textContent =
    (job.company && (job.company.display_name || job.company.name)) ||
    job.company ||
    "";
  wrapper.appendChild(company);

  const metaList = document.createElement("ul");
  metaList.className = "job-details-meta";

  const liLocation = document.createElement("li");
  liLocation.innerHTML =
    "<strong>Location:</strong> " +
    (typeof job.location === "string"
      ? job.location
      : (job.location && job.location.display_name) || "");
  metaList.appendChild(liLocation);

  const liSalary = document.createElement("li");
  const minRaw =
    job.salary_min != null
      ? Number(job.salary_min)
      : job.salaryMinK != null
      ? Number(job.salaryMinK) * 1000
      : null;
  const maxRaw =
    job.salary_max != null
      ? Number(job.salary_max)
      : job.salaryMaxK != null
      ? Number(job.salaryMaxK) * 1000
      : null;
  liSalary.innerHTML =
    "<strong>Salary:</strong> " +
    (minRaw == null && maxRaw == null
      ? "Not listed"
      : "$" +
        (minRaw != null ? Math.round(minRaw / 1000) : "?") +
        "K - $" +
        (maxRaw != null ? Math.round(maxRaw / 1000) : "?") +
        "K");
  metaList.appendChild(liSalary);

  const liContract = document.createElement("li");
  liContract.innerHTML =
    "<strong>Contract:</strong> " +
    (job.contract_type || job.contract_time || job.employment || "");
  metaList.appendChild(liContract);

  const liPosted = document.createElement("li");
  liPosted.innerHTML =
    "<strong>Posted:</strong> " +
    formatPostedDate(job.created, job.postedDaysAgo);
  metaList.appendChild(liPosted);

  wrapper.appendChild(metaList);

  if (job.description) {
    const descHeading = document.createElement("h3");
    descHeading.textContent = "Description";
    wrapper.appendChild(descHeading);

    const desc = document.createElement("div");
    desc.className = "job-details-description";
    // render as plain text to avoid injecting markup
    desc.textContent = job.description;
    wrapper.appendChild(desc);
  }

  if (job.category) {
    const cat = document.createElement("div");
    cat.className = "job-details-category";
    cat.innerHTML =
      "<strong>Category:</strong> " + (job.category.label || job.category);
    wrapper.appendChild(cat);
  }

  // Links / apply action
  const applyHref =
    job.redirect_url ||
    (job.refs && job.refs.adzuna_url) ||
    (job.id
      ? "https://www.adzuna.co.uk/jobs/details/" +
        encodeURIComponent(job.id) +
        (job.adref ? "?adref=" + encodeURIComponent(job.adref) : "")
      : null);
  if (applyHref) {
    const applyLink = document.createElement("a");
    applyLink.className = "btn primary job-details-apply";
    applyLink.href = applyHref;
    applyLink.target = "_blank";
    applyLink.rel = "noopener noreferrer";
    applyLink.textContent = "Apply for this job";
    const hint = document.createElement("div");
    hint.className = "job-details-apply-hint";
    hint.textContent = "Opens the original listing in a new tab.";
    wrapper.appendChild(applyLink);
    wrapper.appendChild(hint);
  }

  return wrapper;
}

function showJobDetails(job) {
  closeJobDetails();
  const overlay = document.createElement("div");
  overlay.className = "job-details-modal";
  overlay.tabIndex = -1;
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeJobDetails();
  });

  const content = buildJobDetailsElement(job);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  _currentJobDetailsModal = overlay;
  overlay.focus();
}

function closeJobDetails() {
  if (_currentJobDetailsModal) {
    try {
      _currentJobDetailsModal.remove();
    } catch (e) {}
    _currentJobDetailsModal = null;
  }
}

function renderPagination() {
  const container = document.getElementById("pagination-controls");
  if (!container) return;
  const params = window.LAST_JOB_PARAMS || DEFAULTS;
  const page = params.page || 1;
  const perPage = params.resultsPerPage || DEFAULTS.resultsPerPage;
  const total = window.TOTAL_RESULTS || window.ALL_JOBS?.length || 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const from = Math.min((page - 1) * perPage + 1, total || 1);
  const to = Math.min(page * perPage, total);

  container.innerHTML = `
    <div class="pagination">
      <button class="btn secondary" id="prev-page" ${
        page <= 1 ? "disabled" : ""
      }>Previous</button>
      <div class="page-info">Page ${page} of ${totalPages} — showing ${
    total ? from : 0
  }-${total ? to : 0} of ${total}</div>
      <button class="btn secondary" id="next-page" ${
        page >= totalPages ? "disabled" : ""
      }>Next</button>
    </div>
  `;

  const prev = document.getElementById("prev-page");
  const next = document.getElementById("next-page");
  if (prev) {
    prev.addEventListener("click", (e) => {
      e.preventDefault();
      if (page <= 1) return;
      getJobs({
        jobTitle: params.jobTitle || "",
        resultsPerPage: perPage,
        page: page - 1,
      });
    });
  }
  if (next) {
    next.addEventListener("click", (e) => {
      e.preventDefault();
      if (page >= totalPages) return;
      getJobs({
        jobTitle: params.jobTitle || "",
        resultsPerPage: perPage,
        page: page + 1,
      });
    });
  }
}

// wire per-page select change
const perPageSelectEl = document.getElementById("per-page-select");
if (perPageSelectEl) {
  perPageSelectEl.addEventListener("change", (e) => {
    const perPage = parseInt(e.target.value, 10) || DEFAULTS.resultsPerPage;
    const lastTitle = (document.getElementById("jobTitle") || {}).value || "";
    // when per-page changes, go back to page 1 and refetch
    getJobs({ jobTitle: lastTitle, resultsPerPage: perPage, page: 1 });
  });
}

// Ensure search button uses selected per-page value
if (searchJobsBtn) {
  searchJobsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const inputValue = document.getElementById("jobTitle").value;
    const perPage =
      parseInt((document.getElementById("per-page-select") || {}).value, 10) ||
      DEFAULTS.resultsPerPage;
    getJobs({ jobTitle: inputValue, resultsPerPage: perPage, page: 1 });
  });
}

// wire sort select change (client-side only)
const sortSelect = document.getElementById("sort");
if (sortSelect) {
  sortSelect.addEventListener("change", (e) => {
    window.CURRENT_SORT = e.target.value;
    // sort the currently displayed list without fetching
    renderJobListings();
  });
}

// Apply / Reset filters buttons
const applyFiltersBtn = document.getElementById("apply-filters-btn");
if (applyFiltersBtn) {
  applyFiltersBtn.addEventListener("click", (e) => {
    e.preventDefault();
    applyFiltersAndRender();
  });
}

const resetFiltersBtn = document.getElementById("reset-filters-btn");
if (resetFiltersBtn) {
  resetFiltersBtn.addEventListener("click", (e) => {
    e.preventDefault();
    // Clear filter controls
    const ids = [
      "filter-remote",
      "filter-onsite",
      "filter-hybrid",
      "filter-junior",
      "filter-mid",
      "filter-senior",
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });
    const min = document.getElementById("filter-salary-min");
    if (min) min.value = "";
    const max = document.getElementById("filter-salary-max");
    if (max) max.value = "";
    // Re-apply filters (which will restore full page if none selected)
    applyFiltersAndRender();
  });
}
