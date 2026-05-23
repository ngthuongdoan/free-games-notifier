const fs = require("fs/promises");
const path = require("path");

// Path to the JSON file containing configured email lists. The JSON file
// should define an object where the keys are list names and the values are
// arrays of recipient email addresses. See `src/data/email-lists.json` for
// an example of the structure.
const EMAIL_LIST_PATH = path.join(__dirname, "data", "email-lists.json");

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

module.exports = {
  getEmailLists,
  getRecipientsByListName,
};