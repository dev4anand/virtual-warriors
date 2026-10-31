# Go Tracker GitHub sync Worker

This small Cloudflare Worker keeps the GitHub token out of the public static website.

## 1. Create the Worker

1. Sign in to Cloudflare.
2. Open **Workers & Pages → Create → Worker**.
3. Create a Worker named `go-tracker-sync`.
4. Deploy the initial Worker.

## 2. Add the GitHub token as a Worker secret

Create a fine-grained GitHub token at https://github.com/settings/personal-access-tokens/new

- Resource owner: your GitHub account.
- Repository access: only `dev4anand/virtual-warriors`.
- Repository permission: **Contents → Read and write**.

In Cloudflare, open the Worker → **Settings → Variables and Secrets → Add**:
- Type: **Secret**
- Name: `GH_TOKEN`
- Value: paste the token

Do not add the token to any repository file, frontend JavaScript, or GitHub Pages asset.

## 3. Deploy this Worker source

From this `worker` directory, install Wrangler and deploy:

```bash
npm install --save-dev wrangler
npx wrangler login
npx wrangler secret put GH_TOKEN
npx wrangler deploy
```

The `wrangler.toml` file defines the Worker name and entry point. The secret command prompts for the token without writing it into the repository.

## 4. Connect the website

After deployment, copy the Worker URL, usually:

`https://go-tracker-sync.<your-account>.workers.dev`

Set `SYNC_API` near the top of the site's `index.html` to the deployed URL. The repository already contains the configured URL for the current Go Tracker deployment. The browser uses the Worker for both directions: `GET /health` verifies the deployment and token, `GET /players` lists public player records for the in-app player dropdown, `GET /players/{player-id}` reads one public player record, and authenticated `PUT /players/{player-id}` creates or updates `data/players/<player-id>.json`. Daily entries use unrestricted valid `YYYY-MM-DD` keys so the history continues across months and years.

## Player ownership

On first registration, the browser automatically generates a random 256-bit player key. It is stored only in that browser's localStorage; the public JSON stores only its SHA-256 hash. Returning on the same browser can update the matching record. Another browser/device can view the public record but cannot write to it unless a recovery-key flow is added. Clearing browser storage loses that device's write key.

The Worker only accepts writes for a syntactically validated player ID and checks the per-player key before updating an existing record. A `Yes` answer is just a red day and a streak reset; it does not permanently eliminate the player. Keep this key private. This is a lightweight identity model for a small crew, not a substitute for a full account system.

The Worker only accepts requests from the deployed GitHub Pages origin. This CORS rule is an additional browser restriction, not a replacement for the player-key check.
