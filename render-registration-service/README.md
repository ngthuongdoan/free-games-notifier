# Render registration service

This service receives GitHub Pages registration form submissions and triggers a
GitHub `repository_dispatch` event.

## Endpoints

- `POST /register`
- `GET /healthz`

## Expected request body

```json
{
  "email": "player@example.com",
  "steamMaxPriceVnd": 200000,
  "listName": "daily-free-games",
  "source": "github-pages"
}
```

## Required environment variables

- `GITHUB_TOKEN`
- `GITHUB_OWNER`
- `GITHUB_REPO`

## Optional environment variables

- `GITHUB_EVENT_TYPE`
  Default: `register-subscriber`
- `ALLOWED_ORIGIN`
  Example: `https://ngthuongdoan.github.io`
- `PORT`
  Default: `10000`

## Local run

```bash
cd render-registration-service
set GITHUB_TOKEN=your_token
set GITHUB_OWNER=ngthuongdoan
set GITHUB_REPO=free-games-notifier
node index.js
```
