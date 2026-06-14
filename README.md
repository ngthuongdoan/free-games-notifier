Free Games Notifier
Overview

Free Games Notifier is a Node.js application that automatically fetches information about free and discounted video games from the Epic Games Store and Steam. It sends notification emails to subscribers, letting them know when new games become available for free or at a significant discount. The project is designed to run either locally or as a scheduled GitHub Actions workflow.

This fork extends the original notifier to support dynamic email lists defined in a JSON configuration file. Instead of hard‑coding a single email recipient, you can maintain multiple lists of subscribers. Anyone who wants to receive notifications can simply add their email address to a list in src/data/email-lists.json.

Features
Fetches free games from the Epic Games Store.
Fetches free games and discounted games from Steam, filtered to a maximum price (default ₫200,000 VND) and limited to a maximum number of deals.
Sends HTML and plain‑text email notifications with detailed information about each game: store, title, URL, price, and end date.
Supports multiple mailing lists via a JSON file. Default lists include:
daily-free-games – receives daily updates about free games and discounts.
admin-alerts – receives notifications if the job fails.
Supports per-user Steam price caps so each subscriber only receives deals within their configured budget.
Configurable through environment variables for SMTP settings, price thresholds, retry behaviour, and more.
Includes a GitHub Actions workflow to run the notifier on a schedule (daily at 02:00 UTC by default) or manually.
Includes a GitHub Pages-ready registration UI in `docs/` that collects subscriber email addresses and per-user Steam price limits.
Setup and Installation

Clone the repository and install dependencies:

git clone https://github.com/ngthuongdoan/free-games-notifier.git
cd free-games-notifier
npm ci

Configure SMTP credentials and other settings via environment variables. Create a .env file in the project root (or set variables in your hosting environment) with the following values:

# SMTP server configuration
SMTP_HOST=mail.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password

# Email sender address (e.g. "Notifier <noreply@example.com>")
EMAIL_FROM=notifier@example.com

# Optional: override default price limit and discount limit
# STEAM_MAX_PRICE_VND=200000
# STEAM_DISCOUNT_LIMIT=30

Note: You no longer need to provide recipient addresses through secrets or environment variables. All recipients are defined in src/data/email-lists.json.

Edit the email lists in src/data/email-lists.json to add or remove recipients. For example:

{
  "daily-free-games": [
    {
      "email": "alice@example.com",
      "steamMaxPriceVnd": 100000
    },
    {
      "email": "bob@example.com",
      "steamMaxPriceVnd": 250000
    },
    "carol@example.com"
  ],
  "admin-alerts": [
    "admin@example.com"
  ]
}

String recipients still work and will use the default STEAM_MAX_PRICE_VND value. Object recipients can override that limit per user with steamMaxPriceVnd.

You can add more lists and update their names; the notifier defaults to daily-free-games for regular notifications and admin-alerts for error alerts.

GitHub Pages Registration UI

The `docs/` directory now contains a static registration site intended for GitHub Pages. It captures:

- subscriber email
- per-user `steamMaxPriceVnd`
- target list name

Important: GitHub Pages cannot directly update `src/data/email-lists.json`. The form is therefore designed to submit JSON to a separate registration endpoint that you configure in `docs/site-config.js`.
That endpoint can trigger a `repository_dispatch` event, and this repo can turn that event into an automated PR that updates the subscriber registry.

Expected payload:

```json
{
  "email": "player@example.com",
  "steamMaxPriceVnd": 200000,
  "listName": "daily-free-games",
  "source": "github-pages"
}
```

If no endpoint is configured yet, the page falls back to a prefilled GitHub issue or email flow so registration requests are still captured.

See `docs/README.md` for setup details.

Running Locally

Once configured, run the notifier manually from your terminal:

npm start

The application will:

Optionally wait for a startup delay (STARTUP_DELAY_MS) if set.
Fetch free games from Epic and free/discounted games from Steam.
Generate HTML and plain‑text emails using an EJS template (template.ejs).
Deliver personalized emails to recipients listed under daily-free-games, using each recipient's Steam price limit.
If an error occurs, send an error email to recipients listed under admin-alerts.
Scheduled Execution via GitHub Actions

The repository includes a workflow file at .github/workflows/free-games-notifier.yml that runs the notifier daily at 02:00 UTC. The workflow defines all required SMTP credentials and other configuration through GitHub secrets, except for recipient lists. To use this workflow:

Set up repository secrets (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM).
Ensure that EMAIL_TO is removed from your secrets—recipients are read from src/data/email-lists.json.
Push your changes; the workflow will send notifications according to the schedule.

You can also trigger the workflow manually from the GitHub Actions tab.

Configuration Options

Several environment variables can be used to control behaviour:

STARTUP_DELAY_MS – delay before the job starts (default 0).
REQUEST_TIMEOUT_MS – HTTP request timeout in milliseconds (default 30000).
RETRY_COUNT and RETRY_DELAY_MS – number of retries and delay between retries when sending email fails (defaults: 3 retries, 5000 ms delay).
STEAM_MAX_PRICE_VND – default maximum price (VND) for Steam deals when a recipient does not define steamMaxPriceVnd (default 200000).
STEAM_DISCOUNT_LIMIT – maximum number of Steam deals to include (default 30).
EMAIL_LIST_NAME – override the default list used for regular notifications.
ADMIN_EMAIL_LIST_NAME – override the default list used for error notifications.

If EMAIL_LIST_NAME or ADMIN_EMAIL_LIST_NAME are not set, the notifier will use daily-free-games and admin-alerts respectively.

Customising Email Templates

The email content is generated using an EJS template (template.ejs). You can modify this file to change the layout or style of your notification emails. The template receives the following variables:

epicGames – array of free games from the Epic Games Store.
steamGames – array of free games from Steam.
steamDiscountGames – array of discounted games from Steam.
checkedAt – timestamp indicating when the data was fetched.
steamMaxPriceVnd – price threshold (VND) for discounts.
Contributing

Pull requests are welcome! If you want to add new features, improve error handling, or support other stores, feel free to fork the repository and submit a PR. Please ensure that any new features are well documented and include appropriate tests where applicable.

License

This project is licensed under the ISC license. See the LICENSE file for details.
