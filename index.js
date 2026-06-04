require("dotenv").config();

const { STARTUP_DELAY_MS } = require("./src/config");
const { sendEmail, sendFailureEmail } = require("./src/email");
const {
  getMaxSteamPriceVnd,
  getRecipientEntriesByListName,
} = require("./src/emailListService");
const { formatVnd } = require("./src/format");
const { fetchEpicFreeGames } = require("./src/stores/epic");
const {
  fetchSteamDiscountGames,
  fetchSteamFreeGames,
} = require("./src/stores/steam");
const { sleep, withRetry, stripWrappingQuotes } = require("./src/utils");
const { normalizeEmailAddress } = require("./src/email");
const DEFAULT_LIST_NAME =
  process.env.EMAIL_LIST_NAME || "daily-free-games";

async function main() {
  if (STARTUP_DELAY_MS > 0) {
    console.log(`Waiting ${STARTUP_DELAY_MS}ms before starting job...`);
    await sleep(STARTUP_DELAY_MS);
  }

  const recipients = await getRecipientEntriesByListName(DEFAULT_LIST_NAME);
  const maxSteamPriceVnd = getMaxSteamPriceVnd(recipients);

  console.log("Fetching Epic free games...");
  const epicGames = await fetchEpicFreeGames();

  console.log("Fetching Steam free games...");
  const steamGames = await fetchSteamFreeGames();

  console.log(
    `Fetching Steam discounts up to recipient max ${formatVnd(maxSteamPriceVnd)}...`
  );
  const steamDiscountGames = await fetchSteamDiscountGames(maxSteamPriceVnd);

  console.log(`Epic free games found: ${epicGames.length}`);
  console.log(`Steam free games found: ${steamGames.length}`);
  console.log(`Steam discounted games found: ${steamDiscountGames.length}`);

  console.log("Sending email...");
  await withRetry("Email delivery", () =>
    sendEmail({ epicGames, steamGames, steamDiscountGames })
  );

  console.log("Done. Email sent.");
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error("Job failed:", error);

    try {
      await sendFailureEmail(error);
    } catch (emailError) {
      console.error("Failed to send failure email:", emailError);
    }

    process.exit(1);
  });
}

module.exports = {
  main,
  normalizeEmailAddress,
  stripWrappingQuotes,
};
