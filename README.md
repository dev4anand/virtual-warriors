# Go Tracker — November 2026

A mobile-first dark-mode tracker for the November 1–30, 2026 daily check-in challenge.

## First-time experience

1. Welcome to Go Tracker.
2. Read and acknowledge the pledge.
3. Enter a username and usual go time. The app checks GitHub for an existing player JSON record using a name-derived ID; matching activity is loaded.
4. Add the prefilled daily Google Calendar reminder and return to the app.

After onboarding, returning visitors go directly to the daily question. Each day from November 1 to November 30 the app asks **“Did you go today?”** and records Yes/No. The local contribution grid, streak and month progress update immediately.

## GitHub Pages deployment

1. Open **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` deploys the site on pushes to `main`.

Live URL: https://dev4anand.github.io/virtual-warriors/

## Player data

Public player records are stored separately at `data/players/<name-derived-id>.json`. Do not store personal or sensitive information in these public records.

The website reads existing public player records from GitHub. Check-ins are always saved to the current browser's localStorage. To write them to GitHub automatically, deploy the secure Worker in `worker/` and configure `SYNC_API` in `index.html`.

## Secure GitHub sync setup

**Never put a GitHub personal access token in a text file, JSON file, or frontend JavaScript in this public repository.** Anyone can read it and use its repository permissions.

Instead:

1. Create a fine-grained GitHub token: https://github.com/settings/personal-access-tokens/new
2. Restrict it to only `dev4anand/virtual-warriors`.
3. Grant **Repository permissions → Contents → Read and write**.
4. Deploy the Worker in `worker/` following `worker/README.md`.
5. Add the token to Cloudflare as a Worker secret named `GH_TOKEN` using `npx wrangler secret put GH_TOKEN`.
6. Copy the deployed Worker URL into the `SYNC_API` constant in `index.html`, commit, and let GitHub Pages redeploy.

The Worker verifies a random device-specific key for each player and writes only to that player's JSON file. The key is generated automatically and stored in that browser's localStorage; it is not shown in the setup form. A different browser/device can read public stats but cannot write as that player unless a recovery-key flow is added. Clearing browser storage loses that device's write key.

## Google Calendar

The onboarding calendar step opens a prefilled daily recurring event for November 1–30, 2026 at the saved usual go time. The description includes the live website URL. Click **Add to Google Calendar**, save the event in Google Calendar, then return to Go Tracker and click **I saved it — enter Go Tracker**.

## Example public player record

```json
{
  "schemaVersion": 1,
  "id": "sample-player",
  "name": "Sample Player",
  "usualTime": "07:00",
  "month": "2026-11",
  "days": {
    "2026-11-01": {
      "went": true,
      "updatedAt": "2026-11-01T07:30:00.000Z"
    }
  }
}
```
