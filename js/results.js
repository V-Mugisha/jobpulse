// Renderer for results panels (job listings, analytics, top skills)
// Uses window.SAMPLE_DATA as the source of truth (replace with API later)

function renderJobListings(container, jobs) {
  if (!container) return;
  container.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'job-list';

  jobs.forEach(job => {
    const art = document.createElement('article');
    art.className = 'job-card';

    const left = document.createElement('div');
    left.className = 'job-left';

    const titleEl = document.createElement('h3');
    titleEl.className = 'job-title';
    titleEl.textContent = job.title || job.name || 'Untitled';
    left.appendChild(titleEl);

    const companyEl = document.createElement('div');
    companyEl.className = 'company';
    companyEl.textContent = (job.company && (job.company.display_name || job.company.name)) || job.company || '';
    left.appendChild(companyEl);

    const meta = document.createElement('div');
    meta.className = 'job-meta';

    const locSpan = document.createElement('span');
    locSpan.className = 'meta-item';
    locSpan.innerHTML = '<span data-lucide="map-pin"></span> ' + (typeof job.location === 'string' ? job.location : (job.location && job.location.display_name) || '');
    meta.appendChild(locSpan);

    const salarySpan = document.createElement('span');
    salarySpan.className = 'meta-item';
    salarySpan.textContent = (job.salaryMinK != null || job.salaryMaxK != null) ? ('$ ' + (job.salaryMinK || '?') + 'K - $' + (job.salaryMaxK || '?') + 'K') : 'Salary not listed';
    meta.appendChild(salarySpan);

    const tag = document.createElement('span');
    tag.className = 'tag-pill';
    tag.textContent = job.employment || '';
    meta.appendChild(tag);

    left.appendChild(meta);

    const right = document.createElement('div');
    right.className = 'job-right';
    const time = document.createElement('div');
    time.className = 'timestamp';
    time.textContent = (job.postedDaysAgo != null) ? (job.postedDaysAgo + ' days ago') : 'Posted date unknown';
    right.appendChild(time);
    const btn = document.createElement('button');
    btn.className = 'btn secondary view-btn';
    btn.innerHTML = 'View Details <span data-lucide="external-link"></span>';
    // Open job details modal when clicked
    btn.addEventListener('click', function () {
      showJobDetails(job);
    });
    right.appendChild(btn);

    art.appendChild(left);
    art.appendChild(right);
    list.appendChild(art);
  });

  container.appendChild(list);
  if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
}

// Simplified renderer: only job listings remain.

function getJobContainer() {
  let jobContainer = document.querySelector('[data-component="job-listings"]');
  if (!jobContainer) {
    const placeholder = document.querySelector('.tab-panel[data-tab="job-listings"] .component-placeholder');
    if (placeholder) {
      const container = document.createElement('div');
      container.className = 'job-listings-container';
      placeholder.replaceWith(container);
      jobContainer = container;
    }
  }
  return jobContainer;
}

function initResultsRenderer() {
  const jobContainer = getJobContainer();
  if (jobContainer) jobContainer.innerHTML = '<div class="component-placeholder" aria-live="polite">Loading job listings…</div>';

  const data = window.SAMPLE_DATA;
  if (!data) {
    const onDataLoaded = () => { document.removeEventListener('data:loaded', onDataLoaded); initResultsRenderer(); };
    document.addEventListener('data:loaded', onDataLoaded);
    return;
  }

  const jobs = Array.isArray(data.jobs) ? data.jobs : [];
  if (!jobs.length) {
    if (jobContainer) jobContainer.innerHTML = '<div class="no-results">No job listings found.</div>';
    return;
  }

  if (jobContainer) renderJobListings(jobContainer, jobs);
}

document.addEventListener('components:loaded', initResultsRenderer);
if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(initResultsRenderer, 50);

// Hook for external code to update the data and notify renderer
window.setSampleData = function(newData) { window.SAMPLE_DATA = newData; document.dispatchEvent(new Event('data:loaded')); };

// Render a provided jobs array into the listings container
window.renderJobsView = function(jobsArray) { const container = getJobContainer(); const jobs = Array.isArray(jobsArray) ? jobsArray : []; if (!jobs.length) { if (container) container.innerHTML = '<div class="no-results">No job listings found.</div>'; return; } renderJobListings(container, jobs); };

// ----- Job Details modal UI -----
let _currentJobDetailsModal = null;

function buildJobDetailsElement(job) {
  const wrapper = document.createElement('div');
  wrapper.className = 'job-details-content';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'job-details-close';
  closeBtn.type = 'button';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', closeJobDetails);
  wrapper.appendChild(closeBtn);

  const title = document.createElement('h2');
  title.textContent = job.title || job.name || 'Untitled';
  wrapper.appendChild(title);

  const company = document.createElement('div');
  company.className = 'job-details-company';
  company.textContent = (job.company && (job.company.display_name || job.company.name)) || job.company || '';
  wrapper.appendChild(company);

  const metaList = document.createElement('ul');
  metaList.className = 'job-details-meta';

  const liLocation = document.createElement('li');
  liLocation.innerHTML = '<strong>Location:</strong> ' + (typeof job.location === 'string' ? job.location : (job.location && job.location.display_name) || '');
  metaList.appendChild(liLocation);

  const liSalary = document.createElement('li');
  const minRaw = job.salary_min != null ? Number(job.salary_min) : (job.salaryMinK != null ? Number(job.salaryMinK) * 1000 : null);
  const maxRaw = job.salary_max != null ? Number(job.salary_max) : (job.salaryMaxK != null ? Number(job.salaryMaxK) * 1000 : null);
  liSalary.innerHTML = '<strong>Salary:</strong> ' + (minRaw == null && maxRaw == null ? 'Not listed' : (('$' + (minRaw != null ? Math.round(minRaw/1000) : '?') + 'K - $' + (maxRaw != null ? Math.round(maxRaw/1000) : '?') + 'K')));
  metaList.appendChild(liSalary);

  const liContract = document.createElement('li');
  liContract.innerHTML = '<strong>Contract:</strong> ' + (job.contract_type || job.contract_time || job.employment || '');
  metaList.appendChild(liContract);

  const liPosted = document.createElement('li');
  liPosted.innerHTML = '<strong>Posted:</strong> ' + (job.postedDaysAgo != null ? (job.postedDaysAgo + ' days ago') : (job.created ? new Date(job.created).toString() : 'Unknown'));
  metaList.appendChild(liPosted);

  wrapper.appendChild(metaList);

  if (job.description) {
    const descHeading = document.createElement('h3');
    descHeading.textContent = 'Description';
    wrapper.appendChild(descHeading);

    const desc = document.createElement('div');
    desc.className = 'job-details-description';
    // Job descriptions from Adzuna may contain HTML — render as plain text to avoid injecting markup
    desc.textContent = job.description;
    wrapper.appendChild(desc);
  }

  if (job.category) {
    const cat = document.createElement('div');
    cat.className = 'job-details-category';
    cat.innerHTML = '<strong>Category:</strong> ' + (job.category.label || job.category);
    wrapper.appendChild(cat);
  }

  // Links / apply action
  // Prefer `redirect_url`, fall back to `refs.adzuna_url`, then construct a basic Adzuna job URL using id+adref when available.
  const applyHref = job.redirect_url || (job.refs && job.refs.adzuna_url) || (job.id ? ('https://www.adzuna.co.uk/jobs/details/' + encodeURIComponent(job.id) + (job.adref ? ('?adref=' + encodeURIComponent(job.adref)) : '')) : null);
  if (applyHref) {
    const applyLink = document.createElement('a');
    // style as a primary button so it's prominent; CSS may override
    applyLink.className = 'btn primary job-details-apply';
    applyLink.href = applyHref;
    applyLink.target = '_blank';
    applyLink.rel = 'noopener noreferrer';
    applyLink.textContent = 'Apply for this job';
    // Provide a small hint for users about opening in a new tab
    const hint = document.createElement('div');
    hint.className = 'job-details-apply-hint';
    hint.textContent = 'Opens the original listing in a new tab.';
    wrapper.appendChild(applyLink);
    wrapper.appendChild(hint);
  }

  return wrapper;
}

function showJobDetails(job) {
  closeJobDetails();
  const overlay = document.createElement('div');
  overlay.className = 'job-details-modal';
  overlay.tabIndex = -1;
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeJobDetails();
  });

  const content = buildJobDetailsElement(job);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  _currentJobDetailsModal = overlay;
  // focus for accessibility
  overlay.focus();
}

function closeJobDetails() {
  if (_currentJobDetailsModal) {
    try { _currentJobDetailsModal.remove(); } catch (e) { }
    _currentJobDetailsModal = null;
  }
}
