'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'worker', 'index.js'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);

assert.ok(scripts.length >= 1, 'the dashboard must contain its application script');
for (const script of scripts) assert.doesNotThrow(() => new Function(script), 'dashboard script must parse');

const todayDeclaration = html.indexOf('const today=');
const initialHistoryRead = html.indexOf('log=normalizeLog(client.historyByPlayer');
assert.ok(todayDeclaration >= 0 && initialHistoryRead > todayDeclaration,
  'history normalization must run after the Asia/Kolkata date helper is initialized');

const coreStart = html.indexOf('function timestampOf(entry)');
const coreEnd = html.indexOf('function activityMarkup(data)', coreStart);
assert.ok(coreStart >= 0 && coreEnd > coreStart, 'browser date/streak helpers must remain available');
const browser = {
  C: { tz: 'Asia/Kolkata' },
  client: { player: null, history: {}, historyByPlayer: {} },
  log: {},
  today: () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return fields.year + '-' + fields.month + '-' + fields.day;
  },
  dateKey: date => date.toISOString().slice(0, 10),
  addDays: (key, amount) => shiftDay(key, amount)
};
vm.runInNewContext(html.slice(coreStart, coreEnd), browser);

const current = browser.today();
const previous = shiftDay(current, -1);
const older = shiftDay(current, -2);

const cleanPair = browser.normalizeLog({
  [previous]: { answered: true, clean: true, updatedAt: previous + 'T12:00:00.000Z' },
  [current]: { answered: true, clean: true, updatedAt: current + 'T12:00:00.000Z' }
});
assert.equal(browser.streakOf(cleanPair), 2, 'two consecutive clean days must produce a two-day streak');
assert.equal(browser.cleanDays(cleanPair), 2, 'clean-day total must count both green days');
assert.equal(browser.answeredDays(cleanPair), 2, 'check-in total must count both answers');

const yesterdayOnly = browser.normalizeLog({
  [previous]: { answered: true, clean: true, updatedAt: previous + 'T12:00:00.000Z' }
});
assert.equal(browser.streakOf(yesterdayOnly), 1,
  'an unanswered current day should retain yesterday’s active streak');

const positiveToday = browser.normalizeLog({
  [previous]: { answered: true, clean: true, updatedAt: previous + 'T12:00:00.000Z' },
  [current]: { answered: true, updatedAt: current + 'T12:00:00.000Z' }
});
assert.equal(browser.streakOf(positiveToday), 0,
  'an answered non-clean day must end the current streak');

const original = { [current]: { answered: true, clean: true, updatedAt: current + 'T10:00:00.000Z' } };
const staleUpdate = { [current]: { answered: true, updatedAt: current + 'T09:00:00.000Z' } };
assert.equal(browser.merge(original, staleUpdate)[current].clean, true,
  'an older update must not replace a newer daily answer');
const newestUpdate = { [current]: { answered: true, updatedAt: current + 'T11:00:00.000Z' } };
assert.equal(browser.merge(original, newestUpdate)[current].clean, undefined,
  'a newer non-clean update must remove the previous clean mark');

const normalized = browser.normalizeLog({
  [older]: { answered: true, clean: true, updatedAt: 'not-a-timestamp' },
  [shiftDay(current, 1)]: { answered: true, clean: true },
  '2026-02-30': { answered: true, clean: true }
});
assert.ok(normalized[older], 'valid historical days must be retained');
assert.equal(normalized[older].updatedAt, older + 'T12:00:00.000Z',
  'invalid legacy timestamps must receive a deterministic fallback');
assert.equal(normalized[shiftDay(current, 1)], undefined, 'future check-ins must not affect stats');
assert.equal(normalized['2026-02-30'], undefined, 'impossible calendar dates must be rejected');

const loadStart = html.indexOf('function loadClientState()');
const loadEnd = html.indexOf('let client=', loadStart);
assert.ok(loadStart >= 0 && loadEnd > loadStart, 'client migration function must be present');
const oldV4 = {
  version: 4,
  player: { id: 'anand', name: 'Anand', usualTime: '18:00' },
  deviceKey: 'a'.repeat(64),
  today: { date: previous, answered: true, clean: true },
  onboarded: true,
  history: {},
  historyPlayerId: null
};
const migrationContext = {
  localStorage: { getItem: () => JSON.stringify(oldV4) },
  read: (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } },
  CLIENT_VERSION: 5,
  CLIENT_KEY: 'gt.client',
  console: { warn() {} }
};
vm.runInNewContext(html.slice(loadStart, loadEnd) + '\nglobalThis.loaded = loadClientState();', migrationContext);
assert.equal(migrationContext.loaded.deviceKey, 'a'.repeat(64),
  'upgrading an existing profile must preserve its private device key');
assert.equal(migrationContext.loaded.today.date, previous,
  'migration must retain the last one-day answer for archival');
assert.equal(migrationContext.loaded.todayPlayerId, 'anand',
  'migration must bind the saved daily answer to its original player');

const wrongOwner = {
  ...oldV4,
  todayPlayerId: 'someone-else'
};
const wrongOwnerContext = { ...migrationContext,
  localStorage: { getItem: () => JSON.stringify(wrongOwner) }
};
vm.runInNewContext(html.slice(loadStart, loadEnd) + '\nglobalThis.loaded = loadClientState();', wrongOwnerContext);
assert.equal(wrongOwnerContext.loaded.today, null,
  'one player’s today answer must never be loaded for another player');

const storeStart = html.indexOf('const store=()=>');
const storeEnd = html.indexOf('const isEliminated=()=>false;', storeStart);
assert.ok(storeStart >= 0 && storeEnd > storeStart, 'account-scoped store function must be present');
let savedSnapshot = null;
const accountContext = {
  profile: { id: 'player-a', name: 'Player A', usualTime: '18:00' },
  client: {
    player: { id: 'player-a', name: 'Player A', usualTime: '18:00' },
    deviceKey: 'c'.repeat(64),
    deviceKeysByPlayer: {},
    historyByPlayer: {},
    today: { date: current, answered: true, clean: true, updatedAt: current + 'T12:00:00.000Z' },
    todayPlayerId: 'player-a'
  },
  log: {},
  CLIENT_VERSION: 5,
  today: browser.today,
  validDateKey: browser.validDateKey,
  isAnsweredEntry: browser.isAnsweredEntry,
  merge: browser.merge,
  normalizeLog: browser.normalizeLog,
  localStorage: { setItem: (_key, value) => { savedSnapshot = JSON.parse(value); } },
  status() {}
};
vm.runInNewContext(html.slice(storeStart, storeEnd) + '\nglobalThis.persist = store;', accountContext);
accountContext.persist();
assert.ok(accountContext.client.historyByPlayer['player-a'][current].clean,
  'store must archive the current answer before the day field rolls over');

accountContext.profile = { id: 'player-b', name: 'Player B', usualTime: '18:00' };
accountContext.log = {};
accountContext.persist();
assert.equal(savedSnapshot.today, null, 'switching profiles must clear the previous profile’s daily answer');
assert.ok(savedSnapshot.historyByPlayer['player-a'][current].clean,
  'switching profiles must retain the previous player’s archived history');
assert.deepEqual(Object.keys(savedSnapshot.historyByPlayer['player-b']), [],
  'a new profile must not inherit the previous player’s history');
assert.equal(savedSnapshot.deviceKeysByPlayer['player-a'], 'c'.repeat(64),
  'switching profiles must preserve the previous player’s device key');

const helperStart = worker.indexOf('function isValidDayKey(value)');
const helperEnd = worker.indexOf('async function githubRequest', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, 'Worker date merge helpers must be present');
const workerContext = {};
vm.runInNewContext(worker.slice(helperStart, helperEnd), workerContext);
const workerMerged = workerContext.mergeDays(
  { [previous]: { went: false }, [older]: { answered: true, clean: true, updatedAt: 'bad-date' } },
  { [current]: { answered: true, clean: true, updatedAt: current + 'T12:00:00.000Z' },
    [shiftDay(current, 1)]: { answered: true, clean: true } }
);
assert.equal(workerMerged[previous].clean, true, 'legacy went:false entries must remain clean');
assert.equal(workerMerged[older].updatedAt, older + 'T12:00:00.000Z',
  'Worker legacy timestamp fallback must be deterministic');
assert.equal(workerMerged[shiftDay(current, 1)], undefined, 'Worker must reject future date keys');

const saveStart = worker.indexOf('async function savePlayer(env, id, payload)');
const saveEnd = worker.indexOf('\n\nexport default', saveStart);
assert.ok(saveStart >= 0 && saveEnd > saveStart, 'Worker save endpoint must be present');
const saveCode = worker.slice(saveStart, saveEnd);
const hash = 'b'.repeat(64);
let currentRecord = {
  schemaVersion: 2, id: 'sample-player', name: 'Sample Player', usualTime: '18:00',
  days: { [previous]: { answered: true, clean: true, updatedAt: previous + 'T12:00:00.000Z' } },
  createdAt: previous + 'T08:00:00.000Z', authHash: hash
};
let getCount = 0;
let putCount = 0;
const githubRequest = async (_env, _path, options) => {
  if (!options) {
    getCount++;
    return {
      status: 200,
      json: async () => ({ content: JSON.stringify(currentRecord), sha: 'sha-' + getCount })
    };
  }
  putCount++;
  const body = JSON.parse(options.body);
  if (putCount === 1) {
    currentRecord = {
      ...currentRecord,
      days: {
        ...currentRecord.days,
        [older]: { answered: true, clean: true, updatedAt: older + 'T12:00:00.000Z' }
      }
    };
    return { ok: false, status: 409, text: async () => '{"message":"GitHub conflict"}' };
  }
  currentRecord = JSON.parse(body.content);
  return { ok: true, status: 200 };
};
const saveContext = {
  BRANCH: 'main',
  sha256: async () => hash,
  decodeBase64: value => value,
  encodeBase64: value => value,
  mergeDays: workerContext.mergeDays,
  githubRequest,
  Date,
  Object,
  Number,
  String,
  Intl
};
vm.runInNewContext(saveCode + '\nglobalThis.savePlayer = savePlayer;', saveContext);
(async () => {
  const result = await saveContext.savePlayer({}, 'sample-player', {
    secret: 'a'.repeat(64),
    record: {
      id: 'sample-player', name: 'Sample Player', usualTime: '18:00',
      days: { [current]: { answered: true, clean: true, updatedAt: current + 'T12:00:00.000Z' } }
    }
  });
  assert.equal(result.status, 200, 'a concurrent GitHub update should be retried');
  assert.equal(getCount, 2, 'the Worker should re-read after a GitHub SHA conflict');
  assert.equal(putCount, 2, 'the Worker should retry the failed write once');
  assert.ok(currentRecord.days[older] && currentRecord.days[previous] && currentRecord.days[current],
    'retry must preserve remote, existing, and incoming daily history');
  console.log('Goongle regression checks passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

function shiftDay(key, amount) {
  const date = new Date(key + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
