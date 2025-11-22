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

    art.innerHTML = `
      <div class="job-left">
        <h3 class="job-title">${escapeHtml(job.title)}</h3>
        <div class="company">${escapeHtml(job.company)}</div>
        <div class="job-meta">
          <span class="meta-item"><span data-lucide="map-pin"></span> ${escapeHtml(job.location)}</span>
          <span class="meta-item">$ ${job.salaryMinK}K - $${job.salaryMaxK}K</span>
          <span class="tag-pill">${escapeHtml(capitalize(job.employment))}</span>
        </div>
      </div>
      <div class="job-right">
        <div class="timestamp">${job.postedDaysAgo} days ago</div>
        <button class="btn secondary view-btn">View Details <span data-lucide="external-link"></span></button>
      </div>
    `;

    list.appendChild(art);
  });

  container.appendChild(list);
}

function computeSalaryStats(jobs) {
  if (!jobs || !jobs.length) return null;
  const all = jobs.map(job => (job.salaryMinK + job.salaryMaxK) / 2);
  const avg = Math.round(all.reduce((acc, val) => acc + val, 0) / all.length);
  const sorted = all.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length/2);
  const median = sorted.length % 2 === 1 ? sorted[mid] : Math.round((sorted[mid-1]+sorted[mid])/2);
  const highest = Math.max(...all);
  const lowest = Math.min(...all);
  return { average: avg, median, highest, lowest };
}

function computeDistribution(jobs) {
  const buckets = [ [60,100], [100,140], [140,180], [180,1000] ];
  const counts = buckets.map(([min, max]) => jobs.filter(job => job.salaryMinK >= min && job.salaryMinK < max).length);
  return counts;
}

function renderAnalytics(container, jobs) {
  if (!container) return;
  container.innerHTML = '';
  const stats = computeSalaryStats(jobs) || { average: 0, median: 0, highest:0, lowest:0 };

  const cards = document.createElement('div');
  cards.className = 'analytics-cards';
  cards.innerHTML = `
    <div class="stat-card"><div class="stat-label">Average Salary</div><div class="stat-value">$${stats.average}K</div></div>
    <div class="stat-card"><div class="stat-label">Median Salary</div><div class="stat-value">$${stats.median}K</div></div>
    <div class="stat-card"><div class="stat-label">Highest Salary</div><div class="stat-value">$${stats.highest}K</div></div>
    <div class="stat-card"><div class="stat-label">Lowest Salary</div><div class="stat-value">$${stats.lowest}K</div></div>
  `;

  container.appendChild(cards);

  // distribution
  const distCard = document.createElement('div');
  distCard.className = 'distribution-card';
  distCard.innerHTML = '<h3 class="distribution-title">Salary Distribution</h3>';
  const counts = computeDistribution(jobs);
  const labels = ["$60K - $100K", "$100K - $140K", "$140K - $180K", "$180K+"];
  counts.forEach((count, index) => {
    const row = document.createElement('div');
    row.className = 'dist-row';
    const pct = jobs.length ? Math.round((count / jobs.length) * 100) : 0;
    row.innerHTML = `
      <div class="dist-label">${labels[index]}</div>
      <div class="dist-bar"><div class="dist-bar-fill" style="width:${pct}%"></div></div>
      <div class="dist-count">${count} jobs</div>
    `;
    distCard.appendChild(row);
  });
  container.appendChild(distCard);
}

function renderTopSkills(container, jobs) {
  if (!container) return;
  container.innerHTML = '';
  const counts = {};
  jobs.forEach(job => (job.skills || []).forEach(skill => { counts[skill] = (counts[skill] || 0) + 1; }));
  const skillArray = Object.keys(counts).map(skillName => ({ skill: skillName, count: counts[skillName] }));
  skillArray.sort((a, b) => b.count - a.count);
  const totalJobs = jobs.length || 1;

  const card = document.createElement('div');
  card.className = 'skills-card';
  card.innerHTML = '<h3 class="skills-title">Top Skills</h3>';
  const list = document.createElement('div');
  list.className = 'skills-list';

  skillArray.forEach((skillObj, index) => {
    const row = document.createElement('div');
    row.className = 'skill-row';
    const pct = Math.round((skillObj.count / totalJobs) * 100);
    row.innerHTML = `
      <div class="skill-rank">${index + 1}.</div>
      <div class="skill-name">${escapeHtml(skillObj.skill)}</div>
      <div class="skill-bar"><div class="skill-fill" style="width:${pct}%"></div></div>
      <div class="skill-meta"><span class="skill-count">${skillObj.count} jobs</span><span class="skill-pct">${pct}%</span></div>
    `;
    list.appendChild(row);
  });

  card.appendChild(list);
  container.appendChild(card);
}

// small helpers
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function capitalize(s){ return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }

function initResultsRenderer() {
  // Try to find explicit data-component containers (if present).
  // Fall back to the lightweight placeholders that live inside the tab panels.
  let jobContainer = document.querySelector('[data-component="job-listings"]');
  let analyticsContainer = document.querySelector('[data-component="salary-analytics"]');
  let skillsContainer = document.querySelector('[data-component="top-skills"]');

  // fallback: find the placeholder inside each tab panel
  if (!jobContainer) {
    const jobPlaceholder = document.querySelector('.tab-panel[data-tab="job-listings"] .component-placeholder');
    if (jobPlaceholder) {
      const container = document.createElement('div');
      // preserve a marker class
      container.className = 'job-listings-container';
      jobPlaceholder.replaceWith(container);
      jobContainer = container;
    }
  }
  if (!analyticsContainer) {
    const analyticsPlaceholder = document.querySelector('.tab-panel[data-tab="salary-analytics"] .component-placeholder');
    if (analyticsPlaceholder) {
      const container = document.createElement('div');
      container.className = 'salary-analytics-container';
      analyticsPlaceholder.replaceWith(container);
      analyticsContainer = container;
    }
  }
  if (!skillsContainer) {
    const skillsPlaceholder = document.querySelector('.tab-panel[data-tab="top-skills"] .component-placeholder');
    if (skillsPlaceholder) {
      const container = document.createElement('div');
      container.className = 'top-skills-container';
      skillsPlaceholder.replaceWith(container);
      skillsContainer = container;
    }
  }

  // Show loading states first
  if (jobContainer) jobContainer.innerHTML = '<div class="component-placeholder" aria-live="polite">Loading job listings…</div>';
  if (analyticsContainer) analyticsContainer.innerHTML = '<div class="component-placeholder" aria-live="polite">Loading analytics…</div>';
  if (skillsContainer) skillsContainer.innerHTML = '<div class="component-placeholder" aria-live="polite">Loading top skills…</div>';

  const data = window.SAMPLE_DATA;
  if (!data) {
    // If no data is present yet, wait for a 'data:loaded' event (useful when hooking up API)
    const onDataLoaded = () => {
      document.removeEventListener('data:loaded', onDataLoaded);
      initResultsRenderer();
    };
    document.addEventListener('data:loaded', onDataLoaded);
    return;
  }

  const jobs = data.jobs || [];

  if (!jobs.length) {
    // no results
    if (jobContainer) jobContainer.innerHTML = '<div class="no-results">No job listings found.</div>';
    if (analyticsContainer) analyticsContainer.innerHTML = '<div class="no-results">No analytics available.</div>';
    if (skillsContainer) skillsContainer.innerHTML = '<div class="no-results">No skills data available.</div>';
    return;
  }

  // render each section with actual data
  if (jobContainer) renderJobListings(jobContainer, jobs);
  if (analyticsContainer) renderAnalytics(analyticsContainer, jobs);
  if (skillsContainer) renderTopSkills(skillsContainer, jobs);

  // Render icons for dynamically inserted icon placeholders
  if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
}

document.addEventListener('components:loaded', initResultsRenderer);
if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(initResultsRenderer, 50);

// Helper for external code (or API adapter) to update data and notify renderer
window.setSampleData = function(newData) {
  window.SAMPLE_DATA = newData;
  document.dispatchEvent(new Event('data:loaded'));
};
