require("dotenv").config();
const nodemailer = require("nodemailer");

const EPIC_FREE_GAMES_URL =
  "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=vi-VN&country=VN&allowCountries=VN";

const STEAM_SPECIALS_URL =
  "https://store.steampowered.com/api/featuredcategories?cc=VN&l=vietnamese";

const STARTUP_DELAY_MS = Number(process.env.STARTUP_DELAY_MS || 0);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 30000);
const RETRY_COUNT = Number(process.env.RETRY_COUNT || 3);
const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS || 5000);

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

      if (attempt === retries) {
        break;
      }

      console.warn(
        `${label} failed on attempt ${attempt}/${retries}: ${error.message}`
      );
      console.warn(`Retrying in ${RETRY_DELAY_MS}ms...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastError;
}

async function fetchJsonWithTimeout(url, label) {
  return withRetry(label, async () => {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "free-games-notifier/1.0",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`${label} request failed: HTTP ${response.status}`);
    }

    return response.json();
  });
}

function isEpicCurrentlyFree(game) {
  const now = new Date();

  const offers =
    game?.promotions?.promotionalOffers?.flatMap(
      (group) => group.promotionalOffers || []
    ) || [];

  return offers.some((offer) => {
    const startDate = new Date(offer.startDate);
    const endDate = new Date(offer.endDate);

    return (
      startDate <= now &&
      endDate >= now &&
      game?.price?.totalPrice?.discountPrice === 0
    );
  });
}

function getEpicGameUrl(game) {
  const slug =
    game?.productSlug ||
    game?.catalogNs?.mappings?.[0]?.pageSlug ||
    game?.offerMappings?.[0]?.pageSlug ||
    game?.urlSlug;

  if (!slug) return "https://store.epicgames.com/vi/";

  if (slug.includes("/")) {
    return `https://store.epicgames.com/vi/p/${slug}`;
  }

  return `https://store.epicgames.com/vi/p/${slug}`;
}

async function fetchEpicFreeGames() {
  const json = await fetchJsonWithTimeout(
    EPIC_FREE_GAMES_URL,
    "Epic Games Store"
  );

  const elements = json?.data?.Catalog?.searchStore?.elements || [];

  return elements
    .filter(isEpicCurrentlyFree)
    .map((game) => ({
      store: "Epic Games Store",
      title: game.title,
      url: getEpicGameUrl(game),
      image:
        game.keyImages?.find((img) => img.type === "Thumbnail")?.url ||
        game.keyImages?.[0]?.url ||
        null,
      originalPrice: game.price?.totalPrice?.fmtPrice?.originalPrice || null,
      discountPrice: game.price?.totalPrice?.fmtPrice?.discountPrice || null,
      endDate:
        game.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0]
          ?.endDate || null,
    }));
}

async function fetchSteamFreeGames() {
  const json = await fetchJsonWithTimeout(STEAM_SPECIALS_URL, "Steam");

  const specials = json?.specials?.items || [];

  return specials
    .filter((item) => item.discount_percent === 100 && item.final_price === 0)
    .map((item) => ({
      store: "Steam",
      title: item.name,
      appId: item.id,
      url: `https://store.steampowered.com/app/${item.id}`,
      image: item.header_image || item.large_capsule_image || null,
      originalPrice: item.original_price,
      discountPrice: item.final_price,
      currency: item.currency,
      discountPercent: item.discount_percent,
      endDate: item.discount_expiration
        ? new Date(item.discount_expiration * 1000).toISOString()
        : null,
    }));
}

function formatPrice(game) {
  if (game.store === "Epic Games Store") {
    return `${game.originalPrice || "Unknown"} → ${game.discountPrice || "Free"}`;
  }

  if (game.currency && typeof game.originalPrice === "number") {
    return `${game.originalPrice} ${game.currency} → 0 ${game.currency}`;
  }

  return "Free";
}

function createEmailHtml({ epicGames, steamGames, checkedAt }) {
  const allGames = [...epicGames, ...steamGames];

  if (allGames.length === 0) {
    return `
      <h2>Free Games Update</h2>
      <p>Checked at: ${checkedAt}</p>
      <p>No currently free games found from the configured APIs.</p>
    `;
  }

  const rows = allGames
    .map(
      (game) => `
        <tr>
          <td>${game.store}</td>
          <td>
            <strong>${game.title}</strong><br />
            <a href="${game.url}">${game.url}</a>
          </td>
          <td>${formatPrice(game)}</td>
          <td>${game.endDate || "Unknown"}</td>
        </tr>
      `
    )
    .join("");

  return `
    <h2>Free Games Update</h2>
    <p>Checked at: ${checkedAt}</p>

    <h3>Summary</h3>
    <ul>
      <li>Epic Games Store: ${epicGames.length}</li>
      <li>Steam: ${steamGames.length}</li>
      <li>Total: ${allGames.length}</li>
    </ul>

    <table border="1" cellpadding="8" cellspacing="0">
      <thead>
        <tr>
          <th>Store</th>
          <th>Game</th>
          <th>Price</th>
          <th>Ends At</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function createEmailText({ epicGames, steamGames, checkedAt }) {
  const allGames = [...epicGames, ...steamGames];

  if (allGames.length === 0) {
    return [
      "Free Games Update",
      `Checked at: ${checkedAt}`,
      "",
      "No currently free games found from the configured APIs.",
    ].join("\n");
  }

  return [
    "Free Games Update",
    `Checked at: ${checkedAt}`,
    "",
    `Epic Games Store: ${epicGames.length}`,
    `Steam: ${steamGames.length}`,
    `Total: ${allGames.length}`,
    "",
    ...allGames.map((game) =>
      [
        `${game.store}: ${game.title}`,
        `URL: ${game.url}`,
        `Price: ${formatPrice(game)}`,
        `Ends At: ${game.endDate || "Unknown"}`,
        "",
      ].join("\n")
    ),
  ].join("\n");
}

async function sendEmail({ epicGames, steamGames }) {
  const checkedAt = new Date().toISOString();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const subject = `Free Games Update: Epic ${epicGames.length}, Steam ${steamGames.length}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.EMAIL_TO,
    subject,
    text: createEmailText({ epicGames, steamGames, checkedAt }),
    html: createEmailHtml({ epicGames, steamGames, checkedAt }),
  });
}

async function main() {
  if (STARTUP_DELAY_MS > 0) {
    console.log(`Waiting ${STARTUP_DELAY_MS}ms before starting job...`);
    await sleep(STARTUP_DELAY_MS);
  }

  console.log("Fetching Epic free games...");
  const epicGames = await fetchEpicFreeGames();

  console.log("Fetching Steam free games...");
  const steamGames = await fetchSteamFreeGames();

  console.log(`Epic free games found: ${epicGames.length}`);
  console.log(`Steam free games found: ${steamGames.length}`);

  console.log("Sending email...");
  await withRetry("Email delivery", () => sendEmail({ epicGames, steamGames }));

  console.log("Done. Email sent.");
}

main().catch(async (error) => {
  console.error("Job failed:", error);

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: "Free Games Job Failed",
      text: `The free games job failed.\n\nError:\n${error.stack || error.message}`,
    });
  } catch (emailError) {
    console.error("Failed to send failure email:", emailError);
  }

  process.exit(1);
});
