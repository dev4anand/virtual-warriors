# Go Tracker — November 2026

A mobile-first, dark-mode static site for a daily November check-in challenge. It uses browser storage for an offline-first experience and separate public JSON files in this repository for player-by-player sync.

## Features

- GitHub-contribution-style activity grid for November 1–30, 2026.
- Daily “Did you go today?” check-in, streak count and a small celebration animation.
- Public read-only crew cards for other players.
- Each player writes only to `data/players/<handle>.json`; the app does not update other players' files.
- Local browser storage plus optional GitHub sync.
- Google Calendar link that pre-fills a daily November event at the player's saved usual time.
- Responsive layout designed mobile-first.

## Deploy with GitHub Pages

1. Open **Settings → Pages** in this repository.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Pushes to `main` will run the included deployment workflow.
4. Once the workflow succeeds, open the Pages URL shown in the workflow deployment.

Expected URL: https://dev4anand.github.io/virtual-warriors/

## Enable shared GitHub sync

Each player needs their own GitHub fine-grained personal access token:

1. Create a fine-grained token restricted to `dev4anand/virtual-warriors`.
2. Grant **Contents: Read and write**.
3. In Go Tracker, open Settings and paste the token.
4. Choose whether to remember it on this browser.

The token is used from the browser to create or update only the signed-in player's JSON path. Never paste a token into a shared computer. A static frontend cannot enforce per-player permissions: anyone who possesses a repository write token can technically edit repository content. For strict ownership/security, a backend or GitHub OAuth service would be required.

Without a token, check-ins are saved locally in that browser. They are not shared with other devices or players. Once sync is enabled, the public player cards read the individual JSON files from this repository.

## Google Calendar reminder

After saving a usual go time, click **Add daily Google Calendar reminder**. Google Calendar opens a pre-filled daily event for November 1–30, 2026, titled “Did you go today?” and includes the deployed site URL in its description. Confirm and save the event in Google Calendar. Calendar notifications follow the user's Google Calendar default notification settings.

## Data shape

Each player has an independent JSON document similar to:

```json
{
  "schemaVersion": 1,
  "id": "anand",
  "name": "Anand",
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
