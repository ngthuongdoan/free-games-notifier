const {
  REQUEST_TIMEOUT_MS,
  RETRY_COUNT,
  RETRY_DELAY_MS,
} = require("./config");

function stripWrappingQuotes(value) {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();

  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, fn, retries = RETRY_COUNT) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === retries) break;

      console.warn(
        `${label} failed on attempt ${attempt}/${retries}: ${error.message}`
      );
      console.warn(`Retrying in ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

async function fetchWithTimeout(url, label, headers = {}) {
  return withRetry(label, async () => {
    const response = await fetch(url, {
      headers: {
        Accept: "*/*",
        "User-Agent":
          "Mozilla/5.0 free-games-notifier/1.0 (+https://github.com/ngthuongdoan/free-games-notifier)",
        ...headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`${label} request failed: HTTP ${response.status}`);
    }

    return response;
  });
}

async function fetchJsonWithTimeout(url, label) {
  const response = await fetchWithTimeout(url, label, {
    Accept: "application/json",
  });

  return response.json();
}

async function fetchTextWithTimeout(url, label) {
  const response = await fetchWithTimeout(url, label, {
    Accept: "text/html,application/json",
  });

  return response.text();
}

function uniqueBy(items, keyFn) {
  const seen = new Set();

  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

function decodeHtml(value) {
  if (!value) return "";

  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function extractAttr(html, attr) {
  const match = html.match(new RegExp(`${attr}="([^"]*)"`, "i"));
  return match ? decodeHtml(match[1]) : null;
}

function extractText(html, regex) {
  const match = html.match(regex);

  return match
    ? decodeHtml(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "))
    : null;
}

module.exports = {
  stripWrappingQuotes,
  sleep,
  withRetry,
  fetchJsonWithTimeout,
  fetchTextWithTimeout,
  uniqueBy,
  parseNumber,
  decodeHtml,
  extractAttr,
  extractText,
};
