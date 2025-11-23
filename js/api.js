async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    const error = new Error(
      `Request failed: ${response.status} ${response.statusText}`
    );
    error.status = response.status;
    error.body = bodyText;
    throw error;
  }
  return response.json();
}

// Convert a string into a list of lowercase alphanumeric tokens.
function sanitizeAndTokenize(text) {
  const lower = String(text || "").toLowerCase();
  const tokens = [];
  let current = "";

  for (let i = 0; i < lower.length; i++) {
    const ch = lower.charAt(i);
    const code = ch.charCodeAt(0);
    const isDigit = code >= 48 && code <= 57; // '0'-'9'
    const isUpper = code >= 65 && code <= 90; // 'A'-'Z'
    const isLower = code >= 97 && code <= 122; // 'a'-'z'
    const isLetterOrDigit = isDigit || isUpper || isLower;

    if (isLetterOrDigit) {
      current += ch;
    } else {
      if (current.length) {
        tokens.push(current);
        current = "";
      }
    }
  }
  if (current.length) tokens.push(current);
  return tokens;
}

/**
 * Extract simple candidate skills from description and category label.
 * Uses a small stopword list and returns the top N frequent tokens.
 */
function extractSkillsFromText(
  description = "",
  categoryLabel = "",
  maxSkills = 8
) {
  const combinedText = (
    String(categoryLabel || "") +
    " " +
    String(description || "")
  ).trim();
  const rawTokens = sanitizeAndTokenize(combinedText);

  const stopwords = new Set([
    "and",
    "the",
    "for",
    "with",
    "that",
    "this",
    "from",
    "you",
    "your",
    "are",
    "will",
    "our",
    "role",
    "we",
    "be",
    "a",
    "an",
    "of",
    "in",
    "to",
    "as",
    "on",
    "by",
    "at",
  ]);

  const frequency = {};
  for (const token of rawTokens) {
    if (token.length < 4) continue; // skip very short words
    if (stopwords.has(token)) continue;
    frequency[token] = (frequency[token] || 0) + 1;
  }

  const scored = Object.keys(frequency).map((token) => ({
    token,
    count: frequency[token],
  }));
  scored.sort((a, b) => b.count - a.count);
  return scored.slice(0, maxSkills).map((s) => s.token);
}

/**
 * Normalize a single Adzuna job object into the app's expected job model.
 */
function normalizeAdzunaJob(adzunaJob) {
  const salaryMinNumber =
    adzunaJob.salary_min == null ? null : Number(adzunaJob.salary_min);
  const salaryMaxNumber =
    adzunaJob.salary_max == null ? null : Number(adzunaJob.salary_max);
  const salaryMinK = salaryMinNumber
    ? Math.round(salaryMinNumber / 1000)
    : null;
  const salaryMaxK = salaryMaxNumber
    ? Math.round(salaryMaxNumber / 1000)
    : null;

  let postedDaysAgo = null;
  if (adzunaJob.created) {
    const createdDate = new Date(adzunaJob.created);
    if (!Number.isNaN(createdDate.getTime())) {
      const millisecondsSince = Date.now() - createdDate.getTime();
      postedDaysAgo = Math.max(
        0,
        Math.floor(millisecondsSince / (1000 * 60 * 60 * 24))
      );
    }
  }

  const locationName =
    adzunaJob.location && adzunaJob.location.display_name
      ? adzunaJob.location.display_name
      : adzunaJob.location && Array.isArray(adzunaJob.location.area)
      ? adzunaJob.location.area.join(", ")
      : "";

  const skills = extractSkillsFromText(
    adzunaJob.description || "",
    (adzunaJob.category && adzunaJob.category.label) || ""
  );

  return {
    id: adzunaJob.id || adzunaJob.adref || String(Math.random()).slice(2),
    title: adzunaJob.title || "Untitled",
    company: (adzunaJob.company && adzunaJob.company.display_name) || null,
    location: locationName || null,
    salaryMinK,
    salaryMaxK,
    employment: adzunaJob.contract_type || adzunaJob.contract_time || null,
    experience: null,
    postedDaysAgo,
    tags:
      adzunaJob.category && adzunaJob.category.tag
        ? [adzunaJob.category.tag]
        : [],
    skills,
    refs: { adzuna_url: adzunaJob.redirect_url || null },
    raw: adzunaJob,
  };
}

/**
 * Fetch results from Adzuna and return normalized jobs.
 * opts: { appId, appKey, page=1, resultsPerPage=10, what='', where='' }
 */
async function fetchAdzunaNormalized(opts = {}) {
  const {
    appId,
    appKey,
    page = 1,
    resultsPerPage = 10,
    what = "",
    where = "",
  } = opts;

  if (!appId || !appKey)
    throw new Error("Adzuna `appId` and `appKey` are required");

  const baseUrl = "https://api.adzuna.com/v1/api/jobs/gb/search";
  const requestUrl = `${baseUrl}/${encodeURIComponent(
    page
  )}?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(
    appKey
  )}&results_per_page=${encodeURIComponent(
    resultsPerPage
  )}&what=${encodeURIComponent(what)}&where=${encodeURIComponent(where)}`;

  const responseData = await fetchJson(requestUrl);
  const rawResults = Array.isArray(responseData.results)
    ? responseData.results
    : [];
  const normalizedJobs = rawResults.map(normalizeAdzunaJob);
  return {
    jobs: normalizedJobs,
    meta: { count: responseData.count, mean: responseData.mean },
  };
}

/**
 * Minimal helper to fetch The Muse jobs and normalize them loosely.
 * The Muse API shape differs; this function maps a few common fields.
 */
async function fetchMuseNormalized(opts = {}) {
  const page = opts.page || 1;
  const requestUrl = `https://www.themuse.com/api/public/jobs?page=${encodeURIComponent(
    page
  )}`;
  const responseData = await fetchJson(requestUrl);
  const rawResults = Array.isArray(responseData.results)
    ? responseData.results
    : [];

  const normalizedJobs = rawResults.map((museItem) => ({
    id: museItem.id || String(Math.random()).slice(2),
    title: museItem.name || museItem.title || "Untitled",
    company:
      (museItem.company && museItem.company.name) ||
      (museItem.organization && museItem.organization.name) ||
      null,
    location:
      Array.isArray(museItem.locations) && museItem.locations.length
        ? museItem.locations.map((l) => l.name || l).join(", ")
        : museItem.location || "",
    salaryMinK: null,
    salaryMaxK: null,
    employment: museItem.type || null,
    experience: null,
    postedDaysAgo: null,
    tags: (museItem.categories || []).map((c) => c.name),
    skills: [],
    refs: { muse: museItem.refs || null },
    raw: museItem,
  }));

  return { jobs: normalizedJobs, meta: {} };
}
