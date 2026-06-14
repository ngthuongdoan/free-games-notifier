const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeEmailAddress, stripWrappingQuotes } = require("./index");
const {
  normalizeRecipientEntry,
  getMaxSteamPriceVnd,
} = require("./src/emailListService");
const {
  normalizeRegistrationPayload,
  upsertSubscriberInLists,
} = require("./src/subscriberRegistry");
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

test("normalizeRegistrationPayload normalizes email and validates fields", () => {
  assert.deepEqual(
    normalizeRegistrationPayload({
      email: " Player@Example.com ",
      listName: "daily-free-games",
      steamMaxPriceVnd: "250000",
    }),
    {
      email: "player@example.com",
      listName: "daily-free-games",
      steamMaxPriceVnd: 250000,
    }
  );
});

test("upsertSubscriberInLists adds a new subscriber object", () => {
  const result = upsertSubscriberInLists(
    {
      "daily-free-games": [],
      "admin-alerts": ["admin@example.com"],
    },
    {
      email: "player@example.com",
      listName: "daily-free-games",
      steamMaxPriceVnd: 180000,
    }
  );

  assert.equal(result.changed, true);
  assert.equal(result.action, "created");
  assert.deepEqual(result.lists["daily-free-games"], [
    {
      email: "player@example.com",
      steamMaxPriceVnd: 180000,
    },
  ]);
});

test("upsertSubscriberInLists updates an existing subscriber limit", () => {
  const result = upsertSubscriberInLists(
    {
      "daily-free-games": [
        {
          email: "player@example.com",
          steamMaxPriceVnd: 120000,
        },
      ],
    },
    {
      email: "player@example.com",
      listName: "daily-free-games",
      steamMaxPriceVnd: 200000,
    }
  );

  assert.equal(result.changed, true);
  assert.equal(result.action, "updated");
  assert.equal(
    result.lists["daily-free-games"][0].steamMaxPriceVnd,
    200000
  );
});

test("upsertSubscriberInLists keeps existing entries when nothing changed", () => {
  const result = upsertSubscriberInLists(
    {
      "daily-free-games": [
        {
          email: "player@example.com",
          steamMaxPriceVnd: 200000,
        },
      ],
    },
    {
      email: "player@example.com",
      listName: "daily-free-games",
      steamMaxPriceVnd: 200000,
    }
  );

  assert.equal(result.changed, false);
  assert.equal(result.action, "noop");
});
