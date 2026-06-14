# GitHub Pages registration flow

This `docs/` folder is now structured as a static registration front end for GitHub Pages.

## Files

- `index.html`: page structure and content
- `styles.css`: visual system and responsive layout
- `app.js`: form validation and submission logic
- `site-config.js`: public runtime configuration for the submission target

## Why this structure exists

GitHub Pages can host the registration UI, but it cannot directly write to
`src/data/email-lists.json`.

That means the page needs a second hop:

1. User submits email + `steamMaxPriceVnd`
2. Static site sends JSON to a registration endpoint
3. The endpoint triggers `repository_dispatch` on GitHub
4. GitHub Actions opens a PR that updates your subscriber registry

## Expected request payload

```json
{
  "email": "player@example.com",
  "steamMaxPriceVnd": 200000,
  "listName": "daily-free-games",
  "source": "github-pages"
}
```

## Configure a real endpoint

Edit `site-config.js` and set:

```js
window.FGN_CONFIG = {
  registration: {
    endpoint: "https://your-endpoint.example.com/register",
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  }
};
```

Examples of good targets:

- a serverless function on Vercel, Netlify, or Cloudflare
- a small API route in another app you already run
- a webhook/automation that appends subscribers to a spreadsheet or database
- a GitHub automation endpoint that triggers `repository_dispatch`

## Repository dispatch flow

This repo now includes `.github/workflows/subscriber-registration-pr.yml`.

Expected GitHub event:

- event name: `repository_dispatch`
- event type: `register-subscriber`

Expected `client_payload`:

```json
{
  "email": "player@example.com",
  "steamMaxPriceVnd": 200000,
  "listName": "daily-free-games",
  "source": "github-pages"
}
```

The workflow:

1. validates the payload
2. updates `src/data/email-lists.json`
3. creates a PR with the subscriber change

## Current fallback behavior

If no endpoint is configured, or the endpoint fails, the page offers:

- a prefilled GitHub issue
- a prefilled email

That keeps the UI usable while you finish the backend registration flow.

## Manual Pages redeploy

This repo also includes `.github/workflows/redeploy-github-pages.yml`.

Use it from the GitHub Actions tab with `Run workflow` when you want to force a
GitHub Pages rebuild without editing the page manually. The workflow updates
`docs/deploy.json`, commits that change, and pushes it back to the default
branch so Pages rebuilds.
