const OWNER = "dev4anand";
const REPO = "virtual-warriors";
const BRANCH = "main";
const ALLOWED_ORIGIN = "https://dev4anand.github.io";
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

function json(data, status, origin, publicHealth = false) {
  const corsOrigin = publicHealth ? "*" : (origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : null);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...(corsOrigin ? {
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Methods": publicHealth ? "GET" : "GET, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": publicHealth ? undefined : "Origin"
      } : {})
    }
  });
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function isValidDayKey(value) {
  const match = typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function mergeDays(previous, incoming) {
  const result = { ...(previous || {}) };
  for (const [date, entry] of Object.entries(incoming || {})) {
    if (!isValidDayKey(date)) continue;
    if (!entry || typeof entry.went !== "boolean") continue;
    const old = result[date];
    if (!old || Date.parse(entry.updatedAt || 0) >= Date.parse(old.updatedAt || 0)) {
      result[date] = {
        went: entry.went,
        updatedAt: entry.updatedAt || new Date().toISOString()
      };
    }
  }
  return result;
}

async function githubRequest(env, path, options = {}) {
  if (!env.GH_TOKEN) throw new Error("Missing GH_TOKEN Worker secret.");
  return fetch(API + path, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GH_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "GoTracker-Cloudflare-Worker",
      ...(options.headers || {})
    }
  });
}

async function readPlayer(env, id) {
  const response = await githubRequest(env, `/contents/data/players/${id}.json?ref=${BRANCH}`);
  if (response.status === 404) return { status: 404, body: { error: "Player not found." } };
  if (!response.ok) {
    const detail = await response.text();
    return { status: response.status, body: { error: "Could not read the player JSON from GitHub.", detail } };
  }
  const file = await response.json();
  const record = JSON.parse(decodeBase64(file.content));
  const { authHash, ...publicRecord } = record;
  return { status: 200, body: publicRecord };
}

async function readPlayers(env) {
  const response = await githubRequest(env, `/contents/data/players?ref=${BRANCH}`);
  if (response.status === 404) return { status: 200, body: [] };
  if (!response.ok) {
    const detail = await response.text();
    return { status: response.status, body: { error: "Could not list player JSON files.", detail } };
  }
  const files = await response.json();
  const playerFiles = files.filter(file =>
    file.type === "file" &&
    file.name.endsWith(".json") &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(file.name)
  );
  const results = await Promise.all(playerFiles.map(async file => {
    const id = file.name.slice(0, -5);
    const result = await readPlayer(env, id);
    return result.status === 200 ? result.body : null;
  }));
  return {
    status: 200,
    body: results.filter(Boolean).sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)))
  };
}

async function savePlayer(env, id, payload) {
  if (!payload || typeof payload.secret !== "string" || !/^[a-f0-9]{64}$/.test(payload.secret)) {
    return { status: 400, body: { error: "Invalid player key." } };
  }
  const input = payload.record;
  if (!input || input.id !== id || typeof input.name !== "string" || typeof input.usualTime !== "string") {
    return { status: 400, body: { error: "Invalid player profile." } };
  }
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(input.usualTime)) {
    return { status: 400, body: { error: "Invalid usual go time." } };
  }
  if (input.status !== undefined && !["active", "out", "completed"].includes(input.status)) {
    return { status: 400, body: { error: "Invalid player status." } };
  }

  const path = `/contents/data/players/${id}.json?ref=${BRANCH}`;
  const currentResponse = await githubRequest(env, path);
  let current = null;
  let sha = null;

  if (currentResponse.status === 200) {
    const file = await currentResponse.json();
    current = JSON.parse(decodeBase64(file.content));
    sha = file.sha;
    if (!current.authHash) {
      return { status: 409, body: { error: "This public profile has no private player key yet. It must be migrated by the repository owner before writes are enabled." } };
    }
    const suppliedHash = await sha256(payload.secret);
    if (suppliedHash !== current.authHash) {
      return { status: 403, body: { error: "This browser is not linked to that player profile." } };
    }
  } else if (currentResponse.status !== 404) {
    const detail = await currentResponse.text();
    return { status: currentResponse.status, body: { error: "Could not read the player JSON from GitHub.", detail } };
  }

  const authHash = current?.authHash || await sha256(payload.secret);
  const record = {
    schemaVersion: 2,
    id,
    name: input.name.slice(0, 32),
    usualTime: input.usualTime,
    days: mergeDays(current?.days, input.days),
    status: "active",
    createdAt: current?.createdAt || input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authHash
  };

  const body = {
    message: `Go Tracker: update ${id}`,
    branch: BRANCH,
    content: encodeBase64(JSON.stringify(record, null, 2))
  };
  if (sha) body.sha = sha;

  const writeResponse = await githubRequest(env, `/contents/data/players/${id}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!writeResponse.ok) {
    const detail = await writeResponse.text();
    return { status: writeResponse.status, body: { error: "GitHub could not save this player record.", detail } };
  }

  return {
    status: 200,
    body: {
      ok: true,
      id,
      name: record.name,
      updatedAt: record.updatedAt
    }
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    // This read-only health route is public so it can be tested from a browser
    // address bar or Cloudflare's dashboard preview, which may not send the
    // GitHub Pages Origin header. It reveals no credentials or player data.
    if (request.method === "GET" && (url.pathname === "/health" || url.pathname === "/")) {
      if (!env.GH_TOKEN) {
        return json({ ok: false, service: "go-tracker-sync", tokenConfigured: false, error: "Missing GH_TOKEN Worker secret." }, 503, origin, true);
      }
      try {
        const probe = await githubRequest(env, `/contents/data/players/README.md?ref=${BRANCH}`);
        if (!probe.ok) {
          // Surface GitHub's diagnostic message and permission hints, but never
          // return request headers, token material, or the secret itself.
          const responseText = await probe.text();
          let githubBody = {};
          try { githubBody = JSON.parse(responseText); } catch {}
          const acceptedPermissions = probe.headers.get("X-Accepted-GitHub-Permissions");
          const ssoHeader = probe.headers.get("X-GitHub-SSO");
          return json({
            ok: false,
            service: "go-tracker-sync",
            tokenConfigured: true,
            githubAccess: false,
            githubStatus: probe.status,
            githubMessage: githubBody.message || responseText.slice(0, 300) || "GitHub denied the repository read request.",
            requiredPermissions: acceptedPermissions || null,
            ssoRequired: Boolean(ssoHeader && /required/i.test(ssoHeader)),
            githubRequestId: probe.headers.get("X-GitHub-Request-Id") || null,
            rateLimitRemaining: probe.headers.get("X-RateLimit-Remaining") || null,
            error: "GitHub rejected the Worker request. See githubMessage and requiredPermissions for details."
          }, 502, origin, true);
        }
        return json({ ok: true, service: "go-tracker-sync", tokenConfigured: true, githubAccess: true }, 200, origin, true);
      } catch (error) {
        return json({ ok: false, service: "go-tracker-sync", tokenConfigured: true, githubAccess: false, error: error.message || "GitHub health check failed." }, 502, origin, true);
      }
    }

    if (origin !== ALLOWED_ORIGIN) return json({ error: "Origin not allowed." }, 403, origin);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/players") {
      try {
        const result = await readPlayers(env);
        return json(result.body, result.status, origin);
      } catch (error) {
        return json({ error: error.message || "Could not list players." }, 500, origin);
      }
    }

    const match = url.pathname.match(/^\/players\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
    if (!match || !["GET", "PUT"].includes(request.method)) {
      return json({ error: "Use GET /health, GET /players, GET /players/{player-id}, or PUT /players/{player-id}." }, 404, origin);
    }

    const id = match[1];
    if (id.length > 24) return json({ error: "Player ID is too long." }, 400, origin);

    try {
      if (request.method === "GET") {
        const result = await readPlayer(env, id);
        return json(result.body, result.status, origin);
      }

      let payload;
      try {
        payload = await request.json();
      } catch {
        return json({ error: "Request body must be JSON." }, 400, origin);
      }
      const result = await savePlayer(env, id, payload);
      return json(result.body, result.status, origin);
    } catch (error) {
      return json({ error: error.message || "Unexpected sync error." }, 500, origin);
    }
  }
};
