const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeEmailAddress, stripWrappingQuotes } = require("./index");

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
