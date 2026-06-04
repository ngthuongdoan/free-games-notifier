const fs = require("fs/promises");
const path = require("path");

// Path to the JSON file containing configured email lists. The JSON file
// should define an object where the keys are list names and the values are
// arrays of recipient email addresses. See `src/data/email-lists.json` for
// an example of the structure.
const EMAIL_LIST_PATH = path.join(__dirname, "data", "email-lists.json");
const DEFAULT_STEAM_MAX_PRICE_VND = Number(
  process.env.STEAM_MAX_PRICE_VND || 200000
);

/**
 * Load all configured email lists from the JSON file. The file is
 * synchronously read at runtime so that any updates to the JSON file
 * immediately take effect without requiring an application restart.
 *
 * @returns {Promise<Object>} An object mapping list names to arrays of
 *   recipient email addresses.
 */
async function getEmailLists() {
  const raw = await fs.readFile(EMAIL_LIST_PATH, "utf8");
  return JSON.parse(raw);
}

function normalizeRecipientEntry(entry) {
  if (typeof entry === "string") {
    return {
      email: entry,
      steamMaxPriceVnd: DEFAULT_STEAM_MAX_PRICE_VND,
    };
  }

  if (
    !entry ||
    typeof entry !== "object" ||
    typeof entry.email !== "string" ||
    entry.email.trim() === ""
  ) {
    throw new Error("Recipient entry must be an email string or object with an email field");
  }

  const normalized = {
    email: entry.email.trim(),
  };

  if (entry.steamMaxPriceVnd !== undefined) {
    const steamMaxPriceVnd = Number(entry.steamMaxPriceVnd);

    if (!Number.isFinite(steamMaxPriceVnd) || steamMaxPriceVnd <= 0) {
      throw new Error(
        `Recipient "${normalized.email}" has an invalid steamMaxPriceVnd value`
      );
    }

    normalized.steamMaxPriceVnd = steamMaxPriceVnd;
  } else {
    normalized.steamMaxPriceVnd = DEFAULT_STEAM_MAX_PRICE_VND;
  }

  return normalized;
}

function getMaxSteamPriceVnd(recipients) {
  return recipients.reduce((max, recipient) => {
    return Math.max(max, recipient.steamMaxPriceVnd || DEFAULT_STEAM_MAX_PRICE_VND);
  }, DEFAULT_STEAM_MAX_PRICE_VND);
}

/**
 * Retrieve a list of recipients by list name. Throws an error if the list
 * does not exist or is empty. This helps catch configuration errors
 * early and avoids sending emails to an undefined list.
 *
 * @param {string} listName The name of the configured recipient list to
 *   retrieve.
 * @returns {Promise<string[]>} An array of email addresses.
 */
async function getRecipientsByListName(listName) {
  const lists = await getEmailLists();
  const recipients = lists[listName];

  if (!recipients || recipients.length === 0) {
    throw new Error(`Email list "${listName}" has no recipients`);
  }

  return recipients;
}

async function getRecipientEntriesByListName(listName) {
  const recipients = await getRecipientsByListName(listName);
  return recipients.map(normalizeRecipientEntry);
}

module.exports = {
  getEmailLists,
  getRecipientsByListName,
  getRecipientEntriesByListName,
  normalizeRecipientEntry,
  getMaxSteamPriceVnd,
};
