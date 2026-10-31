# Go Tracker — November 2026

A mobile-first dark-mode tracker for the November 1–30, 2026 pledge challenge.

## Daily rule

The challenge question is **“Did you go today?”**

- **No, I didn't go** — this is a clean challenge day. The contribution square turns green and the streak increases by one.
- **Yes, I went** — the player is eliminated from the November challenge. The current streak ends and the out-of-game screen is shown.
- After a clean answer, click **Ask again** to open the next numbered challenge question. Every answer is a real entry, stored sequentially as November Day 1 through Day 30. This lets you complete the 30-question challenge without waiting for another calendar date.
- The 30th **No** completes the challenge, triggers the celebration animation, and saves the player's status as `completed`.

A saved Google Calendar series cannot be cancelled by a static website. If a player has already saved the series, they must delete that event in Google Calendar themselves.

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

The Worker stores a random device-specific key hash in each player record and makes an `out` status permanent for that player. Follow `worker/README.md` for deployment instructions.

## Google Calendar

The onboarding calendar step opens a prefilled daily recurring event for November 1–30, 2026, at the saved usual go time. Its description includes the deployed website URL. The player must confirm and save the event in Google Calendar.
