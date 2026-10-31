# Go Tracker — November 2026

A mobile-first dark static site for the November 2026 daily check-in challenge.

## Features

- GitHub-contribution-style calendar for November 1–30, 2026.
- Setup asks only for a display name and usual go time.
- Player ID is derived automatically from the name.
- Existing public player JSON is looked up by that ID; matching data and check-ins are restored.
- New names start a new local profile.
- Daily yes/no check-in, streak calculation, progress stats and celebration animation.
- Read-only crew cards for public JSON records.
- Browser localStorage and an offline app shell.
- A prefilled Google Calendar daily event link at the saved usual time.

## Deploy with GitHub Pages

1. Open **Settings → Pages** in this repository.
2. Set **Build and deployment → Source** to **GitHub Actions**.
3. The `.github/workflows/pages.yml` workflow deploys the static app on pushes to `main`.

Expected URL: https://dev4anand.github.io/virtual-warriors/

## Data storage and security

Player records are public JSON files at `data/players/<name-derived-id>.json`. Do not store private information in them.

The current public static frontend can read existing player records from GitHub. New check-ins are saved in the visitor's browser only. It does not push writes to GitHub because GitHub write credentials must never be exposed to browser code or committed to a public file.

**Do not create a `.txt`, `.json`, or JavaScript file in this public repository containing a GitHub personal access token.** Anyone can download it and use the token with its granted permissions.

A GitHub Actions repository secret is safer than a committed text file, but it is visible only to workflow runs; the static website's JavaScript cannot read it. To enable shared writes from the website, add a small serverless API (for example a Cloudflare Worker) and store the token as a server-side secret there. The API should validate the player and allow writes only to that player's JSON path.

## Generate a fine-grained GitHub token (for a server-side secret)

1. Open https://github.com/settings/personal-access-tokens/new
2. Choose **Fine-grained token**.
3. Set **Resource owner** to your GitHub account.
4. Under **Repository access**, choose **Only select repositories** and select `virtual-warriors`.
5. Under **Repository permissions → Contents**, choose **Read and write**.
6. Create the token and copy it once.
7. Store it as a secret in the serverless service (recommended), not in this repository's files.

If you store it as a GitHub Actions secret instead, open **Repository → Settings → Secrets and variables → Actions → New repository secret**, name it `GH_TOKEN`, and paste the token. Workflows can read it using `${{ secrets.GH_TOKEN }}`, but client-side website code cannot.

## Google Calendar reminder

After setting a usual go time, click **Add daily Google Calendar reminder**. Google Calendar opens a prefilled daily event from November 1–30, 2026, titled “Did you go today?” with the deployed site URL in its description. Confirm and save the event in Calendar.

## Example player record

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
