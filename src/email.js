const ejs = require("ejs");
const nodemailer = require("nodemailer");
const path = require("path");

const { STEAM_MAX_PRICE_VND } = require("./config");
const { formatDate, formatPrice, formatVnd } = require("./format");
const { stripWrappingQuotes } = require("./utils");

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
}) {
  return ejs.renderFile(path.join(__dirname, "..", "template.ejs"), {
    epicGames,
    steamGames,
    steamDiscountGames,
    checkedAt,
    steamMaxPriceVnd: STEAM_MAX_PRICE_VND,
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
}) {
  const freeGames = [...epicGames, ...steamGames];

  return [
    "Games Update",
    `Checked at: ${checkedAt}`,
    "",
    `Epic free games: ${epicGames.length}`,
    `Steam free games: ${steamGames.length}`,
    `Steam discounts under ${formatVnd(STEAM_MAX_PRICE_VND)}: ${steamDiscountGames.length}`,
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
    `Steam Discounts Under ${formatVnd(STEAM_MAX_PRICE_VND)}:`,
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

  const subject = `Games Update: Epic Free ${epicGames.length}, Steam Free ${steamGames.length}, Deals ${steamDiscountGames.length}`;

  const html = await createEmailHtml({
    epicGames,
    steamGames,
    steamDiscountGames,
    checkedAt,
  });

  await transporter.sendMail({
    from: sender.headerFrom,
    envelope: {
      from: sender.envelopeFrom,
      to: process.env.EMAIL_TO,
    },
    to: process.env.EMAIL_TO,
    subject,
    text: createEmailText({
      epicGames,
      steamGames,
      steamDiscountGames,
      checkedAt,
    }),
    html,
  });
}

async function sendFailureEmail(error) {
  const transporter = createTransporter();
  const sender = normalizeEmailAddress(
    process.env.EMAIL_FROM,
    process.env.SMTP_USER
  );

  await transporter.sendMail({
    from: sender.headerFrom,
    envelope: {
      from: sender.envelopeFrom,
      to: process.env.EMAIL_TO,
    },
    to: process.env.EMAIL_TO,
    subject: "Games Job Failed",
    text: `The games job failed.\n\nError:\n${error.stack || error.message}`,
  });
}

module.exports = {
  normalizeEmailAddress,
  createTransporter,
  createEmailHtml,
  createEmailText,
  sendEmail,
  sendFailureEmail,
};
