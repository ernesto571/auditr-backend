import "dotenv/config";

const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY;
const BASE_URL = "https://production-sfo.browserless.io";

const headers = {
  "Cache-Control": "no-cache",
  "Content-Type": "application/json",
};

async function captureScreenshot(url) {
  const response = await fetch(
    `${BASE_URL}/screenshot?token=${BROWSERLESS_API_KEY}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        url,
        options: {
          fullPage: true,
          type: "png",
        },
        gotoOptions: {
          waitUntil: "networkidle2",
          timeout: 30000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Screenshot failed (${response.status}): ${error}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return base64; // base64-encoded PNG
}

async function extractHTML(url) {
  const response = await fetch(
    `${BASE_URL}/content?token=${BROWSERLESS_API_KEY}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        url,
        gotoOptions: {
          waitUntil: "networkidle2",
          timeout: 30000,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTML extraction failed (${response.status}): ${error}`);
  }

  const html = await response.text();
  return html;
}

export async function scanPage(url) {
    if (!BROWSERLESS_API_KEY) {
        throw new Error("BROWSERLESS_API_KEY is not set in .env");
    }

    if (!url || typeof url !== "string") {
        throw new Error("A valid URL string is required");
    }

    // Ensure URL has a protocol
    const normalizedUrl =
        url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `https://${url}`;

    console.log(`[Browserless] Scanning: ${normalizedUrl}`);

    const [screenshotBase64, html] = await Promise.all([
        captureScreenshot(normalizedUrl),
        extractHTML(normalizedUrl),
    ]);

    console.log(
        `[Browserless] Done. Screenshot size: ${screenshotBase64.length} chars | HTML size: ${html.length} chars`
    );

    return {
        screenshotBase64, // base64 PNG — pass directly to Gemini
        html,             // rendered DOM — pass directly to Gemini
    };
}