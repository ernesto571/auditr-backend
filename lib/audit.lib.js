export const buildAuditPrompt = ({ domain, html, pagespeed }) => {
  const { mobile, desktop } = pagespeed;

  const formatAudits = (audits) =>
    audits
      .map(
        (a) =>
          `- [${a.id}] ${a.title} (score: ${a.score})${a.display_value ? ` — ${a.display_value}` : ""}`
      )
      .join("\n");

  const formatCWV = (cwv) => `
    FCP: ${cwv.fcp ?? "N/A"}
    LCP: ${cwv.lcp ?? "N/A"}
    TBT: ${cwv.tbt ?? "N/A"}
    CLS: ${cwv.cls ?? "N/A"}
    Speed Index: ${cwv.speed_index ?? "N/A"}
    TTI: ${cwv.tti ?? "N/A"}
  `.trim();

  return `
You are an expert website auditor AI. You have been given:
1. The rendered HTML of a website
2. A full-page screenshot of the website (attached as an image)
3. Real Performance, SEO, Accessibility, and Best Practices scores and audit findings from Google PageSpeed Insights

Your job is to:
- Use the PageSpeed scores directly for performance, seo, and accessibility — do NOT recalculate them
- Analyze the screenshot and HTML to independently score ui_ux and conversion (PageSpeed cannot measure these)
- Combine everything into one structured JSON audit report

Return a JSON object only.
No explanation, no markdown, no code blocks — just raw JSON.

---

WEBSITE URL: ${domain}

---

PAGESPEED DATA — MOBILE:
Scores:
  Performance: ${mobile.scores.performance}/100
  SEO: ${mobile.scores.seo}/100
  Accessibility: ${mobile.scores.accessibility}/100
  Best Practices: ${mobile.scores.best_practices}/100

Core Web Vitals:
${formatCWV(mobile.core_web_vitals)}

Failing Audits:
${formatAudits(mobile.failing_audits)}

---

PAGESPEED DATA — DESKTOP:
Scores:
  Performance: ${desktop.scores.performance}/100
  SEO: ${desktop.scores.seo}/100
  Accessibility: ${desktop.scores.accessibility}/100
  Best Practices: ${desktop.scores.best_practices}/100

Core Web Vitals:
${formatCWV(desktop.core_web_vitals)}

Failing Audits:
${formatAudits(desktop.failing_audits)}

---

RENDERED HTML (use this to analyze structure, content, semantics, and conversion elements):
${html.slice(0, 50000)}

---

(The full-page screenshot is attached as an image for visual analysis.)

---

Return this exact JSON structure:

{
  "overall_score": <number 0-100, average of all 5 category scores>,
  "verdict": "good" | "needs_attention" | "critical",
  "scores": {
    "ui_ux": <number 0-100, your independent visual and UX assessment from screenshot + HTML>,
    "performance": <number 0-100, use mobile PageSpeed performance score directly>,
    "seo": <number 0-100, use mobile PageSpeed SEO score directly>,
    "accessibility": <number 0-100, use mobile PageSpeed accessibility score directly>,
    "conversion": <number 0-100, your independent CRO assessment from screenshot + HTML>
  },
  "summary": "<3-4 sentence plain English overview of the overall site health and what matters most>",
  "headline": "<one sharp sentence summarising the most critical finding — like a headline>",
  "findings": [
    {
      "category": "<ui_ux | performance | seo | accessibility | conversion>",
      "severity": "high" | "medium" | "low",
      "title": "<short issue title>",
      "description": "<what the issue is and why it matters>",
      "recommendation": "<specific actionable fix>"
    }
  ],
  "strengths": ["<thing the site does well>"],
  "quick_wins": ["<easy fix with high impact>"],
  "ui_ux_notes": {
    "visual_hierarchy": "<assessment of layout, heading structure, and visual flow>",
    "readability": "<font sizes, contrast, line length, text density>",
    "spacing": "<padding, margins, breathing room, content density>",
    "cta_visibility": "<are CTAs visible, prominent, and clear?>",
    "responsiveness": "<any signs of mobile responsiveness issues from the HTML>"
  },
  "conversion_notes": {
    "cta_clarity": "<are calls to action clear and compelling?>",
    "trust_signals": "<testimonials, logos, badges, guarantees visible?>",
    "distractions": "<elements that pull focus away from the main goal>",
    "above_fold": "<what a visitor sees immediately and whether it communicates value>"
  },
  "key_insight": "<2-3 sentence most important pattern or opportunity worth acting on immediately>",
  "priority_order": ["<category or issue to fix first>", "<second>", "<third>"],
  "scan_meta": {
    "url": "${domain}",
    "scan_time_seconds": 0,
    "scanned_at": "${new Date().toISOString()}",
    "total_findings": <number, length of findings array>,
    "high": <number of high severity findings>,
    "medium": <number of medium severity findings>,
    "passing": <number of PageSpeed audits that passed>
  },
  "screenshot_url": ""
}

Rules:
- overall_score: average of scores.ui_ux + scores.performance + scores.seo + scores.accessibility + scores.conversion divided by 5
- verdict: "good" if overall_score >= 80, "needs_attention" if 50-79, "critical" if below 50
- scores.performance: use mobile.scores.performance from PageSpeed exactly
- scores.seo: use mobile.scores.seo from PageSpeed exactly
- scores.accessibility: use mobile.scores.accessibility from PageSpeed exactly
- scores.ui_ux: derive independently from your visual analysis of the screenshot and HTML
- scores.conversion: derive independently from your CRO analysis of the screenshot and HTML
- findings: include the most important issues across all 5 categories — incorporate relevant PageSpeed failing audits as performance/seo/accessibility findings, add your own ui_ux and conversion findings from visual analysis
- findings severity: high = significant user or business impact, medium = worth fixing soon, low = minor improvement
- strengths: 3-5 genuine positives observed from the screenshot or HTML
- quick_wins: 3-5 specific low-effort high-impact improvements
- scan_meta.total_findings must equal the length of the findings array
- scan_meta.high must equal the number of findings with severity "high"
- scan_meta.medium must equal the number of findings with severity "medium"
- Return ONLY the JSON object, nothing else
`;
};