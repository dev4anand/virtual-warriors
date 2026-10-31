# Goon Tracker

An ongoing daily habit tracker with a GitHub-style year-to-date contribution graph, personal streaks, optional calendar reminders, and a player browser.

## Daily question

When a registered player opens Goon Tracker, the modal **“Did you goon today?”** appears if today's question has not been answered yet. The app uses the `Asia/Kolkata` calendar date and accepts one answer per day.

- **No, I didn't goon** — saves a clean day, shown as a bright green contribution square, and extends the current streak.
- **Yes, I did** — records only that today's question was answered. It does not store a gooned-day value and does not create a red square.
- Only clean days are highlighted in the contribution graph. There is no red activity series.
- A day without a clean check-in breaks the current streak. A later clean day starts a new streak; players are never eliminated.

The browser saves each answer immediately in localStorage, then synchronizes the record through the Cloudflare Worker to GitHub.

## Activity history

The contribution graph starts on **January 1 of the current year** and ends on today's date. It is horizontally scrollable and opens scrolled to the latest date. Month labels and weekday labels follow the GitHub contribution-grid layout. Each clean day is highlighted bright green; unmarked and answered-but-not-clean days remain neutral.

The dashboard shows the current streak, clean-day count, and total check-ins. The **View players** button opens a modal with a dropdown to select another public player and view their year-to-date contribution graph and streak.

## Calendar reminders

Google Calendar is optional and is used only for daily notifications/reminders. It does not store answers, calculate streaks, or control the contribution graph. Players can use Goon Tracker without connecting a calendar.

## Data format and synchronization

Public player JSON files are stored at `data/players/<player-id>.json`. Daily records use `YYYY-MM-DD` keys:

- `{"answered": true, "clean": true, "updatedAt": "..."}` — answered and stayed clean; displayed bright green.
- `{"answered": true, "updatedAt": "..."}` — answered, but no clean contribution is recorded; displayed neutrally.

Legacy `went: false` entries are migrated to clean green entries. Legacy `went: true` entries are migrated to answered-only metadata, so the app does not display or retain a red contribution value.

The static website never contains the GitHub token. The Cloudflare Worker uses the Production Secret `GH_TOKEN` and exposes:
- `GET /health` — checks Worker and GitHub access.
- `GET /players` — lists public players for the dropdown.
- `GET /players/{player-id}` — reads one public player record.
- `PUT /players/{player-id}` — securely creates or updates one player's JSON using their device key.

Each player has a random device-specific key stored in that browser's localStorage; GitHub stores only its SHA-256 hash. Clearing site data loses that device key. Cross-device editing requires a recovery-key mechanism.

## Setup

1. Accept the pledge.
2. Enter a username and preferred daily reminder time.
3. The app restores an existing public player record when one is available.
4. Optionally add a recurring Google Calendar reminder.

## Deployment

- Website: https://dev4anand.github.io/virtual-warriors/
- Worker: https://go-tracker-sync.chknhntr123.workers.dev
- Website deployment: GitHub Pages using `.github/workflows/pages.yml`.
- Worker deployment: deploy `worker/index.js` in Cloudflare after changes.

Player names and activity history are public in this repository. Use a username and do not enter private information.
