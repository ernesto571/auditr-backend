import "dotenv/config";

const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
const PAGESPEED_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

/**
 * Normalizes a domain/URL string to a full URL with protocol.
 */
function normalizeUrl(domain) {
  if (!domain || typeof domain !== "string") {
    throw new Error("A valid domain or URL string is required");
  }
  return domain.startsWith("http://") || domain.startsWith("https://")
    ? domain
    : `https://${domain}`;
}

/**
 * Fetches PageSpeed Insights data for a given URL and strategy.
 * Strategy: "mobile" | "desktop"
 */
async function fetchPageSpeed(url, strategy = "mobile") {
  const params = new URLSearchParams({
    url,
    key: PAGESPEED_API_KEY,
    strategy,
  });

  // Request all 4 categories in one call
  const categories = ["performance", "seo", "accessibility", "best-practices"];
  categories.forEach((cat) => params.append("category", cat));

  const response = await fetch(`${PAGESPEED_URL}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `PageSpeed API error (${response.status}): ${error?.error?.message ?? "Unknown error"}`
    );
  }

  return response.json();
}

/**
 * Extracts clean scores (0-100) from the raw PageSpeed response.
 */
function extractScores(data) {
  const cats = data.lighthouseResult.categories;
  return {
    performance: Math.round((cats.performance?.score ?? 0) * 100),
    seo: Math.round((cats.seo?.score ?? 0) * 100),
    accessibility: Math.round((cats.accessibility?.score ?? 0) * 100),
    best_practices: Math.round((cats["best-practices"]?.score ?? 0) * 100),
  };
}

/**
 * Extracts Core Web Vitals from the raw PageSpeed response.
 */
function extractCoreWebVitals(data) {
  const audits = data.lighthouseResult.audits;
  return {
    fcp: audits["first-contentful-paint"]?.displayValue ?? null,
    lcp: audits["largest-contentful-paint"]?.displayValue ?? null,
    tbt: audits["total-blocking-time"]?.displayValue ?? null,
    cls: audits["cumulative-layout-shift"]?.displayValue ?? null,
    speed_index: audits["speed-index"]?.displayValue ?? null,
    tti: audits["interactive"]?.displayValue ?? null,
  };
}

/**
 * Extracts only failing/warning audits to send to Gemini.
 * Filters out passing audits and non-scored informational items.
 */
function extractFailingAudits(data) {
  const audits = data.lighthouseResult.audits;

  return Object.values(audits)
    .filter(
      (audit) =>
        audit.score !== null &&
        audit.score < 1 &&
        audit.scoreDisplayMode !== "informative" &&
        audit.scoreDisplayMode !== "manual" &&
        audit.scoreDisplayMode !== "notApplicable"
    )
    .map((audit) => ({
      id: audit.id,
      title: audit.title,
      description: audit.description,
      score: audit.score,
      display_value: audit.displayValue ?? null,
    }))
    .sort((a, b) => a.score - b.score); // worst first
}

/**
 * Main export: accepts a domain string, returns structured
 * PageSpeed data ready to be passed to Gemini.
 */
export async function getPageSpeedData(domain) {
  if (!PAGESPEED_API_KEY) {
    throw new Error("PAGESPEED_API_KEY is not set in .env");
  }

  const url = normalizeUrl(domain);
  console.log(`[PageSpeed] Scanning: ${url}`);

  // Run mobile and desktop in parallel
  const [mobileData, desktopData] = await Promise.all([
    fetchPageSpeed(url, "mobile"),
    fetchPageSpeed(url, "desktop"),
  ]);

  const mobile = {
    scores: extractScores(mobileData),
    core_web_vitals: extractCoreWebVitals(mobileData),
    failing_audits: extractFailingAudits(mobileData),
  };

  const desktop = {
    scores: extractScores(desktopData),
    core_web_vitals: extractCoreWebVitals(desktopData),
    failing_audits: extractFailingAudits(desktopData),
  };

  console.log(
    `[PageSpeed] Done. Mobile perf: ${mobile.scores.performance} | Desktop perf: ${desktop.scores.performance}`
  );

  return {
    mobile,
    desktop,
  };
}