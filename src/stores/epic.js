const { EPIC_FREE_GAMES_URL } = require("../config");
const { fetchJsonWithTimeout } = require("../utils");

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
      kind: "free",
      store: "Epic Games Store",
      title: game.title,
      url: getEpicGameUrl(game),
      image:
        game.keyImages?.find((img) => img.type === "Thumbnail")?.url ||
        game.keyImages?.[0]?.url ||
        null,
      originalPrice: game.price?.totalPrice?.fmtPrice?.originalPrice || null,
      discountPrice: game.price?.totalPrice?.fmtPrice?.discountPrice || "Free",
      endDate:
        game.promotions?.promotionalOffers?.[0]?.promotionalOffers?.[0]
          ?.endDate || null,
    }));
}

module.exports = {
  fetchEpicFreeGames,
  getEpicGameUrl,
  isEpicCurrentlyFree,
};
