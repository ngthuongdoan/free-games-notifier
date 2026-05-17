const STARTUP_DELAY_MS = Number(process.env.STARTUP_DELAY_MS || 0);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 30000);
const RETRY_COUNT = Number(process.env.RETRY_COUNT || 3);
const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS || 5000);

const STEAM_MAX_PRICE_VND = Number(process.env.STEAM_MAX_PRICE_VND || 200000);
const STEAM_DISCOUNT_LIMIT = Number(process.env.STEAM_DISCOUNT_LIMIT || 30);

const EPIC_FREE_GAMES_URL =
  "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=vi-VN&country=VN&allowCountries=VN";

const STEAM_FEATURED_CATEGORIES_URL =
  "https://store.steampowered.com/api/featuredcategories?cc=VN&l=vietnamese";

const STEAM_SEARCH_SPECIALS_URL =
  "https://store.steampowered.com/search/results/?query&start=0&count=100&dynamic_data=&sort_by=Reviews_DESC&specials=1&cc=VN&l=vietnamese&infinite=1";

module.exports = {
  STARTUP_DELAY_MS,
  REQUEST_TIMEOUT_MS,
  RETRY_COUNT,
  RETRY_DELAY_MS,
  STEAM_MAX_PRICE_VND,
  STEAM_DISCOUNT_LIMIT,
  EPIC_FREE_GAMES_URL,
  STEAM_FEATURED_CATEGORIES_URL,
  STEAM_SEARCH_SPECIALS_URL,
};
