const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeEmailAddress, stripWrappingQuotes } = require("./index");
const {
  normalizeRecipientEntry,
  getMaxSteamPriceVnd,
} = require("./src/emailListService");
const {
  createEmailText,
  selectSteamDiscountGamesForRecipient,
} = require("./src/email");

test("normalizeRecipientEntry supports user-specific steam price limits", () => {
  assert.deepEqual(
    normalizeRecipientEntry({
      email: "player@example.com",
      steamMaxPriceVnd: 150000,
    }),
    {
      email: "player@example.com",
      steamMaxPriceVnd: 150000,
    }
  );
});

test("getMaxSteamPriceVnd returns the highest configured recipient limit", () => {
  assert.equal(
    getMaxSteamPriceVnd([
      { email: "low@example.com", steamMaxPriceVnd: 120000 },
      { email: "default@example.com" },
      { email: "high@example.com", steamMaxPriceVnd: 350000 },
    ]),
    350000
  );
});

test("selectSteamDiscountGamesForRecipient filters games by recipient limit", () => {
  const deals = [
    {
      title: "Cheap Game",
      discountPrice: 90000,
      discountPercent: 40,
      originalPrice: 150000,
      url: "https://example.com/cheap",
      endDate: null,
    },
    {
      title: "Mid Game",
      discountPrice: 180000,
      discountPercent: 50,
      originalPrice: 300000,
      url: "https://example.com/mid",
      endDate: null,
    },
  ];

  assert.deepEqual(
    selectSteamDiscountGamesForRecipient(deals, {
      email: "player@example.com",
      steamMaxPriceVnd: 100000,
    }).map((game) => game.title),
    ["Cheap Game"]
  );
});

test("createEmailText renders the recipient-specific Steam price cap", () => {
  const text = createEmailText({
    epicGames: [],
    steamGames: [],
    steamDiscountGames: [],
    checkedAt: "now",
    steamMaxPriceVnd: 150000,
  });

  assert.match(text, /Steam discounts under 150\.000\s?₫: 0/);
  assert.match(text, /Steam Discounts Under 150\.000\s?₫:/);
});

test("stripWrappingQuotes removes matching outer quotes", () => {
  assert.equal(
    stripWrappingQuotes('"Free Games Bot <contact@thuongda.dev>"'),
    "Free Games Bot <contact@thuongda.dev>"
  );
  assert.equal(
    stripWrappingQuotes("'contact@thuongda.dev'"),
    "contact@thuongda.dev"
  );
});

test("normalizeEmailAddress keeps display name and extracts envelope", () => {
  assert.deepEqual(
    normalizeEmailAddress(
      "Free Games Bot <contact@thuongda.dev>",
      "contact@thuongda.dev"
    ),
    {
      headerFrom: "Free Games Bot <contact@thuongda.dev>",
      envelopeFrom: "contact@thuongda.dev",
    }
  );
});

test("normalizeEmailAddress handles quoted CI secret values", () => {
  assert.deepEqual(
    normalizeEmailAddress(
      '"Free Games Bot <contact@thuongda.dev>"',
      "contact@thuongda.dev"
    ),
    {
      headerFrom: "Free Games Bot <contact@thuongda.dev>",
      envelopeFrom: "contact@thuongda.dev",
    }
  );
});

test("normalizeEmailAddress falls back to SMTP user", () => {
  assert.deepEqual(
    normalizeEmailAddress("Free Games Bot", "contact@thuongda.dev"),
    {
      headerFrom: "contact@thuongda.dev",
      envelopeFrom: "contact@thuongda.dev",
    }
  );
});
