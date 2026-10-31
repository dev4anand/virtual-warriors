# Go Tracker — November 2026

A mobile-first dark-mode tracker for the November 1–30, 2026 pledge challenge.

## Daily rule

The question **“Did you go today?”** appears in a modal when an existing player opens the site and has not answered for the current date (November 1–30, 2026, Asia/Kolkata).

- **No, I didn't go** — records a clean day, turns that date's contribution square green, and continues the streak.
- **Yes, I went** — records the answer for today and permanently marks the player as out.
- Only one answer is accepted per calendar day. The modal appears again on the next day if that day has not yet been answered.
- A clean answer on November 30 completes the challenge only when all 30 dates are clean.

## Local and GitHub data synchronization

Each answer is written to browser localStorage first, then synchronized through the Cloudflare Worker to `data/players/<player-id>.json`. On the next visit, the app reads the player record through the Worker, merges timestamped entries with local data, and uploads pending local changes. When the browser reconnects, pending data is retried.

The website uses `SYNC_API` for the Worker URL. The Worker exposes `GET /health`, `GET /players/{player-id}`, and authenticated `PUT /players/{player-id}`. Store the fine-grained GitHub token only as a Cloudflare Worker secret named `GH_TOKEN`; never put it in the website or repository assets.

## First-time experience

1. Welcome to Go Tracker.
2. Read and acknowledge the pledge.
3. Enter a username and usual go time. The app looks for an existing public player JSON file using the name-derived ID.
4. Add the prefilled daily Google Calendar reminder for November 1–30, 2026.

Returning visitors go directly to the daily check-in.

## GitHub Pages deployment

1. Open **Settings → Pages**.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` deploys the site on pushes to `main`.

Live URL: https://dev4anand.github.io/virtual-warriors/

## Player data

Public player records are stored separately at `data/players/<name-derived-id>.json`. Each daily `days` entry uses:
- `went: false` for a clean day (green square; contributes to streak).
- `went: true` for a day the player went (red square; ends the challenge).

The player record also stores `status: "active"`, `status: "out"`, or `status: "completed"`, with `eliminatedAt` or `completedAt` timestamps as appropriate.

## Secure GitHub sync

The static website never contains a GitHub personal access token. Deploy the Worker in `worker/` and configure `SYNC_API` in `index.html` to enable GitHub writes. Store the fine-grained GitHub token as a Cloudflare Worker secret named `GH_TOKEN`; do not put it into a public text, JSON or JavaScript file.

The Worker stores a random device-specific key hash in each player record and makes `out` and `completed` statuses permanent. The device key remains in that browser's localStorage; a different device can read the public record but cannot write to it without a recovery-key flow. Follow `worker/README.md` for deployment instructions.

## Google Calendar

The onboarding calendar step opens a prefilled daily recurring event for November 1–30, 2026, at the saved usual go time. Its description includes the deployed website URL. The player must confirm and save the event in Google Calendar.
