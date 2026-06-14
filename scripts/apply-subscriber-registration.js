const fs = require("fs/promises");
const path = require("path");

const { upsertSubscriberInLists } = require("../src/subscriberRegistry");

const EMAIL_LIST_PATH = path.join(
  __dirname,
  "..",
  "src",
  "data",
  "email-lists.json"
);

async function main() {
  const payload = {
    email: process.env.REGISTRATION_EMAIL,
    listName: process.env.REGISTRATION_LIST_NAME,
    steamMaxPriceVnd: process.env.REGISTRATION_STEAM_MAX_PRICE_VND,
  };

  const raw = await fs.readFile(EMAIL_LIST_PATH, "utf8");
  const lists = JSON.parse(raw);
  const result = upsertSubscriberInLists(lists, payload);

  if (result.changed) {
    await fs.writeFile(
      EMAIL_LIST_PATH,
      `${JSON.stringify(result.lists, null, 2)}\n`,
      "utf8"
    );
  }

  console.log(
    JSON.stringify(
      {
        changed: result.changed,
        action: result.action,
        email: result.entry.email,
        listName: payload.listName,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
