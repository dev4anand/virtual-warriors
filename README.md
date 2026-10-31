# Goon Tracker

A simple, ongoing daily habit tracker with personal streaks, a rolling 12-month GitHub-style contribution history, and a community player browser.

## Daily check-in

When an existing player opens Goon Tracker, the modal **“Did you goon today?”** appears if they have not answered for the current date in the `Asia/Kolkata` timezone.

- **No, I didn't goon** — saves a clean green day and extends the current streak.
- **Yes, I gooned** — saves a red day and resets the current streak. The player is not eliminated and can start a new streak the next day.
- Only one answer is accepted per calendar date. The modal appears again on the next date until that date is answered.
- The streak continues across month and year boundaries. Activity history is keyed by `YYYY-MM-DD`.

## Activity and community

The personal activity graph shows the most recent 365 days in a GitHub-style contribution grid. The **View players** button opens a modal with a dropdown to select another player and view their contribution history, clean-day count, gooned-day count, and current streak.

## Local storage and GitHub synchronization

Every answer is first saved to browser `localStorage`, then sent to the Cloudflare Worker. When the site opens, it loads the public player JSON, merges the timestamped daily entries, and synchronizes the merged record. Pending changes are retried when the browser comes back online.

Player records are stored in:

`data/players/<player-id>.json`

The Worker exposes:
- `GET /health` — checks Worker and GitHub connectivity.
- `GET /players` — lists public player records without returning the private key hash.
- `GET /players/{player-id}` — reads one public player record.
- `PUT /players/{player-id}` — validates the private device key and creates or updates the record.

The static website does not contain a GitHub token. The Worker uses the Cloudflare Production secret `GH_TOKEN`. The token needs Contents read and write permission for this repository.

Each player has a random device-specific key stored in that browser's localStorage; the JSON record stores only its SHA-256 hash. Clearing local site data loses that device key. Another device can view public player records but cannot write to an existing profile without a recovery-key mechanism.

## First-time setup

1. Read and accept the pledge.
2. Enter a username and usual reminder time.
3. The app checks for an existing player record and restores its history when found.
4. Optionally save the recurring daily Google Calendar reminder.

## Deployment

- Website: https://dev4anand.github.io/virtual-warriors/
- Worker: https://go-tracker-sync.chknhntr123.workers.dev
- Website source: GitHub Pages via the workflow in `.github/workflows/pages.yml`.
- Worker source: `worker/index.js`; deploy the updated source in Cloudflare after changing it.

## Privacy note

Player names, daily answers, and contribution history are stored in public JSON files in this GitHub repository. Do not use real names or record information that you do not want publicly visible.
