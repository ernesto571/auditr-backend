import { geminiModel } from "../config/gemini.config.js";
import { scanPage } from "../config/browserless.config.js";
import { getPageSpeedData } from "../config/pageSpeed.config.js";
import { buildAuditPrompt } from "../lib/audit.lib.js";
import { uploadScreenshot } from "../config/cloudinary.config.js";
import { sql } from "../config/db.js";
import { getAuthSession } from "../config/auth.js";

const validateDomain = (input) => {
  if (!input || typeof input !== "string" || input.trim().length === 0)
    return { valid: false, message: "Website URL is required" };

  const trimmed = input.trim();
  const withProtocol = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;

  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { valid: false, message: "Invalid URL — please enter a valid website address e.g. example.com" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    return { valid: false, message: "Only http and https URLs are supported" };

  const { hostname } = parsed;

  if (!hostname.includes("."))
    return { valid: false, message: "Invalid domain — must include a valid TLD e.g. example.com" };

  if (hostname === "localhost" || /^(127\.|192\.168\.|10\.|0\.0\.0\.0)/.test(hostname))
    return { valid: false, message: "Local addresses cannot be audited — please enter a public website URL" };

  if (!/^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(hostname))
    return { valid: false, message: "Invalid domain format — please enter a valid website address e.g. example.com" };

  return { valid: true, url: withProtocol };
};

export const runAudit = async (req, res) => {
  try {
    const { domain } = req.body;
    const validation = validateDomain(domain);

    if (!validation.valid)
      return res.status(400).json({ success: false, message: validation.message });

    const { url } = validation;

    // calculate scan time
    const startTime = Date.now();

    console.log("🌐 Scanning page with Browserless...");
    const { screenshotBase64, html } = await scanPage(url);

    // upload img to cloudinary
    const cloudinaryPromise = uploadScreenshot(screenshotBase64, url).catch((err) => {
      console.error("Cloudinary upload failed:", err.message);
      return null; // don't crash if cloudinary fails
    });

    console.log("📊 Fetching PageSpeed data...");
    const pagespeed = await getPageSpeedData(url);
    
    console.log("🤖 Sending to Gemini...");
    const prompt = buildAuditPrompt({ domain: url, html: html.slice(0, 15000), pagespeed });
    const result = await geminiModel.generateContent([
      { text: prompt },
      { inlineData: { mimeType: "image/png", data: screenshotBase64 } },
    ]);

    const rawText = result.response.text();
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let auditReport;
    try {
      auditReport = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError.message);
      return res.status(500).json({ success: false, message: "Failed to parse audit report" });
    }

    console.log("✅ Audit complete. Score:", auditReport.overall_score);

    auditReport.scan_meta.scan_time_seconds = parseFloat(
        ((Date.now() - startTime) / 1000).toFixed(1)
    );

    // Now wait for Cloudinary before saving to DB
    const screenshotUrl = await cloudinaryPromise ?? null;
    console.log("✅ Cloudinary done");

    // add screenshot url to report
    auditReport.screenshot_url = screenshotUrl
    
    console.log("✅ Saving report to db...")
    // only save if logged in
    let savedId = null;

    const session = await getAuthSession(req.headers);
    if (session) {
        const userId = session.user.id;
        const [ saved ] = await sql `
            INSERT INTO reports (
                auth_id, domain, url, overall_score, verdict, scores, summary, headline, findings, strengths, quick_wins, ui_ux_notes, conversion_notes, key_insight, priority_order, scan_meta, screenshot_url 
            )
            VALUES (
                ${userId},
                ${domain},
                ${url},
                ${auditReport.overall_score},
                ${auditReport.verdict},
                ${JSON.stringify(auditReport.scores)},
                ${auditReport.summary},
                ${auditReport.headline},
                ${JSON.stringify(auditReport.findings)},
                ${auditReport.strengths},
                ${auditReport.quick_wins},
                ${JSON.stringify(auditReport.ui_ux_notes)},
                ${JSON.stringify(auditReport.conversion_notes)},
                ${auditReport.key_insight},
                ${auditReport.priority_order},
                ${JSON.stringify(auditReport.scan_meta)},
                ${screenshotUrl}
            )
            RETURNING id
        `
        savedId = saved.id;
        console.log("💾 Report saved, id:", savedId);
    } else {
        console.log("👤 Guest user — report not saved");
    } 

    return res.status(200).json({ success: true, auditReport });
  } catch (error) {
    console.error("Audit error:", error);
    return res.status(500).json({ success: false, message: error.message ?? "Audit failed" });
  }
};