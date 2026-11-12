import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
const MAX_ATTEMPTS = 5;
const CHECK_LEASE_MS = 30000;
export class AuthStoreError extends Error {
  constructor(code, status, message, retryAfterSeconds) { super(message); this.name = 'AuthStoreError'; this.code = code; this.status = status; this.retryAfterSeconds = retryAfterSeconds; }
}
const secondsUntil = (timestamp, now) => Math.max(1, Math.ceil((timestamp - now) / 1000));
export function createAuthStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, phone TEXT NOT NULL, provider_sid TEXT NOT NULL, binding_hash TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', checking_at INTEGER, claim_token TEXT);
    CREATE INDEX IF NOT EXISTS challenges_phone ON challenges(phone);
    CREATE INDEX IF NOT EXISTS challenges_provider ON challenges(provider_sid);
    CREATE INDEX IF NOT EXISTS challenges_expiry ON challenges(expires_at);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, phone TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS phone_sends (phone TEXT PRIMARY KEY, sent_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, hits INTEGER NOT NULL);
  `);
  const columns = db.prepare('PRAGMA table_info(challenges)').all().map((column) => column.name);
  if (!columns.includes('checking_at')) db.exec('ALTER TABLE challenges ADD COLUMN checking_at INTEGER');
  if (!columns.includes('claim_token')) db.exec('ALTER TABLE challenges ADD COLUMN claim_token TEXT');
  function transaction(work) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = work(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function consumeRate(key, limit, windowMs, now) {
    const row = db.prepare('SELECT window_start,hits FROM rate_limits WHERE key=?').get(key);
    if (!row || row.window_start + windowMs <= now) {
      db.prepare('INSERT INTO rate_limits(key,window_start,hits) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start,hits=1').run(key, now); return;
    }
    if (row.hits >= limit) throw new AuthStoreError('TOO_MANY_REQUESTS', 429, 'Too many requests. Please try again later.', secondsUntil(row.window_start + windowMs, now));
    db.prepare('UPDATE rate_limits SET hits=hits+1 WHERE key=?').run(key);
  }
  function recoverChecks(now) {
    db.prepare("UPDATE challenges SET status=CASE WHEN attempts>=? THEN 'blocked' ELSE 'pending' END,checking_at=NULL,claim_token=NULL WHERE status='verifying' AND checking_at<?").run(MAX_ATTEMPTS, now - CHECK_LEASE_MS);
  }
  return {
    close() { db.close(); },
    cleanup(now) {
      const retention = now - 86400000;
      transaction(() => {
        recoverChecks(now);
        db.prepare('DELETE FROM challenges WHERE expires_at<?').run(retention);
        db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
        db.prepare('DELETE FROM phone_sends WHERE sent_at<?').run(retention);
        db.prepare('DELETE FROM rate_limits WHERE window_start<?').run(retention);
      });
    },
    takeRateLimit(key, limit, windowMs, now) { transaction(() => consumeRate(key, limit, windowMs, now)); },
    reserveSend({ phone, ip, now, cooldownMs = 60000 }) {
      return transaction(() => {
        recoverChecks(now);
        if (db.prepare("SELECT id FROM challenges WHERE phone=? AND status='verifying' AND expires_at>? LIMIT 1").get(phone, now)) throw new AuthStoreError('VERIFICATION_IN_PROGRESS', 409, 'A verification check is already in progress.');
        const previous = db.prepare('SELECT sent_at FROM phone_sends WHERE phone=?').get(phone);
        if (previous && previous.sent_at + cooldownMs > now) throw new AuthStoreError('PHONE_COOLDOWN', 429, 'Please wait before requesting another code.', secondsUntil(previous.sent_at + cooldownMs, now));
        consumeRate(`send:${ip}`, 10, 3600000, now);
        db.prepare('INSERT INTO phone_sends(phone,sent_at) VALUES(?,?) ON CONFLICT(phone) DO UPDATE SET sent_at=excluded.sent_at').run(phone, now);
        return now + cooldownMs;
      });
    },
    createChallenge({ id, phone, providerSid, bindingHash, now, expiresAt }) {
      return transaction(() => {
        const previous = db.prepare('SELECT attempts,expires_at,status FROM challenges WHERE provider_sid=? ORDER BY created_at DESC LIMIT 1').get(providerSid);
        const attempts = previous?.attempts ?? 0;
        const effectiveExpiry = previous ? Math.min(expiresAt, previous.expires_at) : expiresAt;
        if (previous?.status === 'consumed') throw new AuthStoreError('INVALID_CHALLENGE', 400, 'Please request a new verification code.');
        if (effectiveExpiry <= now) throw new AuthStoreError('CODE_EXPIRED', 400, 'The verification code has expired.');
        if (attempts >= MAX_ATTEMPTS) throw new AuthStoreError('TOO_MANY_ATTEMPTS', 429, 'Too many verification attempts.', secondsUntil(effectiveExpiry, now));
        db.prepare("UPDATE challenges SET status='superseded' WHERE phone=? AND status IN ('pending','blocked')").run(phone);
        db.prepare("INSERT INTO challenges(id,phone,provider_sid,binding_hash,created_at,expires_at,attempts,status) VALUES(?,?,?,?,?,?,?,'pending')").run(id, phone, providerSid, bindingHash, now, effectiveExpiry, attempts);
        return { expiresAt: effectiveExpiry };
      });
    },
    claimChallenge({ id, bindingHash, now }) {
      return transaction(() => {
        recoverChecks(now);
        const row = db.prepare('SELECT * FROM challenges WHERE id=? AND binding_hash=?').get(id, bindingHash);
        if (!row) throw new AuthStoreError('INVALID_CHALLENGE', 400, 'Please request a new verification code.');
        if (row.expires_at <= now) throw new AuthStoreError('CODE_EXPIRED', 400, 'The verification code has expired.');
        if (row.status === 'verifying') throw new AuthStoreError('VERIFICATION_IN_PROGRESS', 409, 'A verification check is already in progress.');
        if (row.attempts >= MAX_ATTEMPTS || row.status === 'blocked') throw new AuthStoreError('TOO_MANY_ATTEMPTS', 429, 'Too many verification attempts.', secondsUntil(row.expires_at, now));
        if (row.status !== 'pending') throw new AuthStoreError('INVALID_CHALLENGE', 400, 'Please request a new verification code.');
        db.prepare('UPDATE challenges SET attempts=? WHERE provider_sid=?').run(row.attempts + 1, row.provider_sid);
        const claimToken = randomUUID();
        db.prepare("UPDATE challenges SET status='verifying',checking_at=?,claim_token=? WHERE id=?").run(now, claimToken, id);
        return { phone: row.phone, providerSid: row.provider_sid, claimToken };
      });
    },
    rejectChallenge(id, claimToken) { db.prepare("UPDATE challenges SET status=CASE WHEN attempts>=? THEN 'blocked' ELSE 'pending' END,checking_at=NULL,claim_token=NULL WHERE id=? AND claim_token=? AND status='verifying'").run(MAX_ATTEMPTS, id, claimToken); },
    completeChallenge({ id, claimToken, tokenHash, previousTokenHash, now, expiresAt }) {
      return transaction(() => {
        const row = db.prepare("SELECT phone,provider_sid,expires_at FROM challenges WHERE id=? AND claim_token=? AND status='verifying'").get(id, claimToken);
        if (!row) throw new AuthStoreError('INVALID_CHALLENGE', 400, 'Please request a new verification code.');
        if (row.expires_at <= now) throw new AuthStoreError('CODE_EXPIRED', 400, 'The verification code has expired.');
        db.prepare('INSERT INTO sessions(token_hash,phone,created_at,expires_at) VALUES(?,?,?,?)').run(tokenHash, row.phone, now, expiresAt);
        db.prepare("UPDATE challenges SET status='consumed',checking_at=NULL,claim_token=NULL WHERE provider_sid=?").run(row.provider_sid);
        if (previousTokenHash) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(previousTokenHash);
        return { phone: row.phone, expiresAt };
      });
    },
    getSession(tokenHash, now) { return db.prepare('SELECT phone,expires_at AS expiresAt FROM sessions WHERE token_hash=? AND expires_at>?').get(tokenHash, now) ?? null; },
    revokeSession(tokenHash) { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash); },
  };
}
