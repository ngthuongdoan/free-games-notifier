const ejs = require("ejs");
const nodemailer = require("nodemailer");
const path = require("path");

const { STEAM_MAX_PRICE_VND } = require("./config");
const { formatDate, formatPrice, formatVnd } = require("./format");
const { stripWrappingQuotes } = require("./utils");
const { selectSteamDiscountGames } = require("./stores/steam");

// Import the email list service to support dynamic recipient groups. This allows
// us to send notifications to different groups of users based on the type of
// notification being sent.
const {
  getRecipientsByListName,
  getRecipientEntriesByListName,
} = require("./emailListService");

// Default list names used when no environment variable overrides are provided.
// EMAIL_LIST_NAME controls who receives regular game update notifications.
// ADMIN_EMAIL_LIST_NAME controls who receives failure notifications. These can
// be overridden via environment variables.
const DEFAULT_LIST_NAME =
  process.env.EMAIL_LIST_NAME || "daily-free-games";
const ADMIN_LIST_NAME =
  process.env.ADMIN_EMAIL_LIST_NAME || "admin-alerts";

function normalizeEmailAddress(value, fallback) {
  const candidate = stripWrappingQuotes(value);
  const match = candidate.match(/^(.*)<([^<>@\s]+@[^<>@\s]+)>$/);

  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, "");
    const address = match[2].trim();

    return {
      headerFrom: name ? `${name} <${address}>` : address,
      envelopeFrom: address,
    };
  }

  if (/^[^@\s]+@[^@\s]+$/.test(candidate)) {
    return {
      headerFrom: candidate,
      envelopeFrom: candidate,
    };
  }

  const fallbackAddress = stripWrappingQuotes(fallback);

  if (/^[^@\s]+@[^@\s]+$/.test(fallbackAddress)) {
    return {
      headerFrom: fallbackAddress,
      envelopeFrom: fallbackAddress,
    };
  }

  throw new Error(
    "Unable to determine a valid sender email address from EMAIL_FROM or SMTP_USER."
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function createEmailHtml({
  epicGames,
  steamGames,
  steamDiscountGames,
  checkedAt,
  steamMaxPriceVnd = STEAM_MAX_PRICE_VND,
}) {
  return ejs.renderFile(path.join(__dirname, "..", "template.ejs"), {
    epicGames,
    steamGames,
    steamDiscountGames,
    checkedAt,
    steamMaxPriceVnd,
    formatDate,
    formatPrice,
    formatVnd,
  });
}

function createEmailText({
  epicGames,
  steamGames,
  steamDiscountGames,
  checkedAt,
  steamMaxPriceVnd = STEAM_MAX_PRICE_VND,
}) {
  const freeGames = [...epicGames, ...steamGames];

  return [
    "Games Update",
    `Checked at: ${checkedAt}`,
    "",
    `Epic free games: ${epicGames.length}`,
    `Steam free games: ${steamGames.length}`,
    `Steam discounts under ${formatVnd(steamMaxPriceVnd)}: ${steamDiscountGames.length}`,
    "",
    "Free Games:",
    freeGames.length === 0
      ? "No currently free games found."
      : freeGames
          .map((game) =>
            [
              `${game.store}: ${game.title}`,
              `URL: ${game.url}`,
              `Price: ${formatPrice(game)}`,
              `Ends At: ${formatDate(game.endDate)}`,
              "",
            ].join("\n")
          )
          .join("\n"),
    "",
    `Steam Discounts Under ${formatVnd(steamMaxPriceVnd)}:`,
    steamDiscountGames.length === 0
      ? "No matching Steam discounted games found."
      : steamDiscountGames
          .map((game) =>
            [
              `Steam: ${game.title}`,
              `URL: ${game.url}`,
              `Discount: -${game.discountPercent}%`,
              `Price: ${formatPrice(game)}`,
              `Ends At: ${formatDate(game.endDate)}`,
              "",
            ].join("\n")
          )
          .join("\n"),
  ].join("\n");
}

function selectSteamDiscountGamesForRecipient(steamDiscountGames, recipient) {
  return selectSteamDiscountGames(
    steamDiscountGames,
    recipient.steamMaxPriceVnd || STEAM_MAX_PRICE_VND
  );
}

async function sendEmail({ epicGames, steamGames, steamDiscountGames }) {
  const checkedAt = new Date().toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const transporter = createTransporter();
  const sender = normalizeEmailAddress(
    process.env.EMAIL_FROM,
    process.env.SMTP_USER
  );

  // Look up the list of recipients for regular game updates. This makes it
  // possible to manage subscriber groups via a simple JSON configuration.
  const recipients = await getRecipientEntriesByListName(DEFAULT_LIST_NAME);

  for (const recipient of recipients) {
    const recipientSteamDiscountGames = selectSteamDiscountGamesForRecipient(
      steamDiscountGames,
      recipient
    );
    const subject = `Games Update: Epic Free ${epicGames.length}, Steam Free ${steamGames.length}, Deals ${recipientSteamDiscountGames.length}`;
    const html = await createEmailHtml({
      epicGames,
      steamGames,
      steamDiscountGames: recipientSteamDiscountGames,
      checkedAt,
      steamMaxPriceVnd: recipient.steamMaxPriceVnd,
    });

    await transporter.sendMail({
      from: sender.headerFrom,
      envelope: {
        from: sender.envelopeFrom,
        to: [recipient.email],
      },
      to: recipient.email,
      subject,
      text: createEmailText({
        epicGames,
        steamGames,
        steamDiscountGames: recipientSteamDiscountGames,
        checkedAt,
        steamMaxPriceVnd: recipient.steamMaxPriceVnd,
      }),
      html,
    });
  }
}

async function sendFailureEmail(error) {
  const transporter = createTransporter();
  const sender = normalizeEmailAddress(
    process.env.EMAIL_FROM,
    process.env.SMTP_USER
  );

  // Look up the list of recipients for admin/failure alerts. Admins can
  // configure this list separately from regular subscribers.
  const recipients = await getRecipientsByListName(ADMIN_LIST_NAME);

  await transporter.sendMail({
    from: sender.headerFrom,
    envelope: {
      from: sender.envelopeFrom,
      to: recipients,
    },
    to: recipients,
    subject: "Games Job Failed",
    text: `The games job failed.\n\nError:\n${error.stack || error.message}`,
  });
}

module.exports = {
  normalizeEmailAddress,
  createTransporter,
  createEmailHtml,
  createEmailText,
  selectSteamDiscountGamesForRecipient,
  sendEmail,
  sendFailureEmail,
};
