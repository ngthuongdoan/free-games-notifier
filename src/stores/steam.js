const {
  STEAM_DISCOUNT_LIMIT,
  STEAM_FEATURED_CATEGORIES_URL,
  STEAM_MAX_PRICE_VND,
  STEAM_SEARCH_SPECIALS_URL,
} = require("../config");
const {
  extractAttr,
  extractText,
  fetchJsonWithTimeout,
  fetchTextWithTimeout,
  parseNumber,
  uniqueBy,
} = require("../utils");

function normalizeSteamPrice(rawPrice) {
  const price = parseNumber(rawPrice);
  return price === null ? null : price;
}

function mapSteamFeaturedItem(item) {
  const finalPrice = normalizeSteamPrice(item.final_price);
  const originalPrice = normalizeSteamPrice(item.original_price);

  return {
    kind: finalPrice === 0 ? "free" : "discount",
    store: "Steam",
    title: item.name,
    appId: item.id,
    url: `https://store.steampowered.com/app/${item.id}`,
    image: item.header_image || item.large_capsule_image || null,
    originalPrice,
    discountPrice: finalPrice,
    currency: item.currency || "VND",
    discountPercent: Number(item.discount_percent || 0),
    endDate: item.discount_expiration
      ? new Date(item.discount_expiration * 1000).toISOString()
      : null,
  };
}

function parseSteamSearchRows(html) {
  const rows =
    html.match(
      /<a[\s\S]*?class="[^"]*search_result_row[^"]*"[\s\S]*?<\/a>/gi
    ) || [];

  return rows
    .map((row) => {
      const appId =
        extractAttr(row, "data-ds-appid") ||
        extractAttr(row, "data-ds-itemkey")?.replace("App_", "");
      const url = extractAttr(row, "href");
      const title = extractText(
        row,
        /<span\s+class="title">([\s\S]*?)<\/span>/i
      );
      const image = extractAttr(row, "src");
      const discountPercent = Math.abs(
        parseNumber(extractAttr(row, "data-discount")) || 0
      );
      const finalPrice = normalizeSteamPrice(extractAttr(row, "data-price-final"));

      const originalText = extractText(
        row,
        /<div[^>]*class="[^"]*discount_original_price[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      );
      const finalText = extractText(
        row,
        /<div[^>]*class="[^"]*discount_final_price[^"]*"[^>]*>([\s\S]*?)<\/div>/i
      );

      const parsedFinalFromText = parseNumber(finalText);
      const discountPrice = finalPrice ?? parsedFinalFromText;

      if (!title || !url) return null;

      return {
        kind: discountPrice === 0 ? "free" : "discount",
        store: "Steam",
        title,
        appId,
        url,
        image,
        originalPrice: parseNumber(originalText),
        discountPrice,
        currency: "VND",
        discountPercent,
        endDate: null,
      };
    })
    .filter(Boolean);
}

async function fetchSteamFeaturedDeals() {
  const json = await fetchJsonWithTimeout(
    STEAM_FEATURED_CATEGORIES_URL,
    "Steam featured categories"
  );
  const specials = json?.specials?.items || [];

  return specials.map(mapSteamFeaturedItem);
}

async function fetchSteamSearchDeals() {
  const text = await fetchTextWithTimeout(
    STEAM_SEARCH_SPECIALS_URL,
    "Steam search specials"
  );

  try {
    const json = JSON.parse(text);
    return parseSteamSearchRows(json?.results_html || "");
  } catch {
    return parseSteamSearchRows(text);
  }
}

async function fetchSteamDeals() {
  const [featuredDeals, searchDeals] = await Promise.allSettled([
    fetchSteamFeaturedDeals(),
    fetchSteamSearchDeals(),
  ]);

  const allDeals = [
    ...(featuredDeals.status === "fulfilled" ? featuredDeals.value : []),
    ...(searchDeals.status === "fulfilled" ? searchDeals.value : []),
  ];

  return uniqueBy(allDeals, (game) => game.appId || game.url);
}

async function fetchSteamFreeGames() {
  const deals = await fetchSteamDeals();

  return deals
    .filter((game) => game.discountPercent === 100 && game.discountPrice === 0)
    .map((game) => ({
      ...game,
      kind: "free",
    }));
}

async function fetchSteamDiscountGames() {
  const deals = await fetchSteamDeals();

  return deals
    .filter((game) => {
      return (
        game.discountPercent > 0 &&
        game.discountPercent < 100 &&
        typeof game.discountPrice === "number" &&
        game.discountPrice > 0 &&
        game.discountPrice <= STEAM_MAX_PRICE_VND
      );
    })
    .sort((a, b) => {
      if (b.discountPercent !== a.discountPercent) {
        return b.discountPercent - a.discountPercent;
      }

      return a.discountPrice - b.discountPrice;
    })
    .slice(0, STEAM_DISCOUNT_LIMIT)
    .map((game) => ({
      ...game,
      kind: "discount",
    }));
}

module.exports = {
  fetchSteamDeals,
  fetchSteamFreeGames,
  fetchSteamDiscountGames,
  parseSteamSearchRows,
};
