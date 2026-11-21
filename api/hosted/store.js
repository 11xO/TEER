const CLAIM_LEASE_MS = 30000;
export class AuthStoreError extends Error {
  constructor(code, status, message, retryAfterSeconds) { super(message); this.name = 'AuthStoreError'; this.code = code; this.status = status; this.retryAfterSeconds = retryAfterSeconds; }
}
const retryAfter = (deadline, now) => Math.max(1, Math.ceil((deadline - now) / 1000));
const invalid = () => new AuthStoreError('INVALID_CHALLENGE', 400, 'اطلب كود تحقق جديد.');
const expired = () => new AuthStoreError('CODE_EXPIRED', 400, 'انتهت صلاحية كود التحقق.');
const exhausted = () => new AuthStoreError('TOO_MANY_ATTEMPTS', 429, 'وصلت للحد الأقصى لمحاولات التحقق.');

export function createD1AuthStore(db) {
  if (!db?.prepare) throw new AuthStoreError('STORAGE_UNAVAILABLE', 503, 'خدمة التحقق غير متاحة مؤقتاً.');
  const sql = (query, ...values) => db.prepare(query).bind(...values);
  return {
    async cleanup(now) {
      const retention = now - 86400000;
      await db.batch([
        sql('DELETE FROM hosted_sessions WHERE expires_at<=?', now),
        sql('DELETE FROM hosted_challenges WHERE expires_at<=?', retention),
        sql('DELETE FROM hosted_phone_sends WHERE sent_at<=?', retention),
        sql('DELETE FROM hosted_rate_limits WHERE window_start<=?', retention),
      ]);
    },
    async takeRateLimit(key, limit, windowMs, now) {
      const row = await sql(`INSERT INTO hosted_rate_limits(key,window_start,hits) VALUES(?,?,1)
        ON CONFLICT(key) DO UPDATE SET
          hits=CASE WHEN hosted_rate_limits.window_start<=? THEN 1 ELSE hosted_rate_limits.hits+1 END,
          window_start=CASE WHEN hosted_rate_limits.window_start<=? THEN excluded.window_start ELSE hosted_rate_limits.window_start END
        WHERE hosted_rate_limits.window_start<=? OR hosted_rate_limits.hits<? RETURNING window_start,hits`, key, now, now - windowMs, now - windowMs, now - windowMs, limit).first();
      if (!row) {
        const current = await sql('SELECT window_start FROM hosted_rate_limits WHERE key=?', key).first();
        throw new AuthStoreError('TOO_MANY_REQUESTS', 429, 'طلبات كثيرة. حاول بعد شوية.', retryAfter((current?.window_start ?? now) + windowMs, now));
      }
      return { remaining: limit - row.hits, resetAt: row.window_start + windowMs };
    },
    async reserveSend({ phone, now, cooldownMs = 60000 }) {
      const row = await sql(`INSERT INTO hosted_phone_sends(phone,sent_at)
        SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM hosted_challenges WHERE phone=? AND status='checking' AND expires_at>? AND checking_at>?)
        ON CONFLICT(phone) DO UPDATE SET sent_at=excluded.sent_at WHERE hosted_phone_sends.sent_at<=? RETURNING sent_at`, phone, now, phone, now, now - CLAIM_LEASE_MS, now - cooldownMs).first();
      if (!row) {
        const active = await sql("SELECT id FROM hosted_challenges WHERE phone=? AND status='checking' AND expires_at>? AND checking_at>? LIMIT 1", phone, now, now - CLAIM_LEASE_MS).first();
        if (active) throw new AuthStoreError('VERIFICATION_IN_PROGRESS', 409, 'جاري التحقق بالفعل.');
        const previous = await sql('SELECT sent_at FROM hosted_phone_sends WHERE phone=?', phone).first();
        throw new AuthStoreError('PHONE_COOLDOWN', 429, 'انتظر قبل طلب كود جديد.', retryAfter((previous?.sent_at ?? now) + cooldownMs, now));
      }
      return row.sent_at + cooldownMs;
    },
    async createChallenge({ id, phone, providerSid, bindingHash, now, expiresAt }) {
      const results = await db.batch([
        sql(`INSERT INTO hosted_challenges(id,phone,provider_sid,binding_hash,created_at,expires_at,attempts,status,checking_at,claim_token)
          SELECT ?,?,?,?,?,MIN(?,COALESCE(prior.expires_at,?)),prior.attempts,'pending',NULL,NULL
          FROM(SELECT COALESCE(MAX(attempts),0) AS attempts,MIN(expires_at) AS expires_at,
            COALESCE(MAX(CASE WHEN status='consumed' THEN 1 ELSE 0 END),0) AS consumed
            FROM hosted_challenges WHERE phone=? AND provider_sid=?) AS prior
          WHERE prior.attempts<5 AND prior.consumed=0 AND MIN(?,COALESCE(prior.expires_at,?))>?
            AND NOT EXISTS(SELECT 1 FROM hosted_challenges WHERE phone=? AND status='checking' AND expires_at>? AND checking_at>?)
          RETURNING expires_at`, id, phone, providerSid, bindingHash, now, expiresAt, expiresAt, phone, providerSid, expiresAt, expiresAt, now, phone, now, now - CLAIM_LEASE_MS),
        sql(`UPDATE hosted_challenges SET status='superseded',checking_at=NULL,claim_token=NULL
          WHERE phone=? AND id<>? AND status IN('pending','checking') AND EXISTS(SELECT 1 FROM hosted_challenges WHERE id=?)`, phone, id, id),
      ]);
      const row = results[0].results?.[0];
      if (row) return { expiresAt: row.expires_at };
      const previous = await sql("SELECT MAX(attempts) AS attempts,MIN(expires_at) AS expires_at,MAX(CASE WHEN status='consumed' THEN 1 ELSE 0 END) AS consumed FROM hosted_challenges WHERE phone=? AND provider_sid=?", phone, providerSid).first();
      if (previous?.consumed) throw invalid();
      if ((previous?.expires_at ?? expiresAt) <= now) throw expired();
      if (previous?.attempts >= 5) throw exhausted();
      throw new AuthStoreError('VERIFICATION_IN_PROGRESS', 409, 'جاري التحقق بالفعل.', 30);
    },
    async claimChallenge({ id, bindingHash, now }) {
      const claimToken = crypto.randomUUID();
      const row = await sql(`UPDATE hosted_challenges SET status='checking',checking_at=?,claim_token=?,attempts=attempts+1
        WHERE id=? AND binding_hash=? AND expires_at>? AND attempts<5 AND(status='pending' OR(status='checking' AND checking_at<=?))
        RETURNING phone,provider_sid`, now, claimToken, id, bindingHash, now, now - CLAIM_LEASE_MS).first();
      if (row) return { phone: row.phone, providerSid: row.provider_sid, claimToken };
      const current = await sql('SELECT binding_hash,status,expires_at,attempts,checking_at FROM hosted_challenges WHERE id=?', id).first();
      if (!current || current.binding_hash !== bindingHash) throw invalid();
      if (current.expires_at <= now) throw expired();
      if (['consumed', 'superseded'].includes(current.status)) throw invalid();
      if (current.attempts >= 5) throw exhausted();
      throw new AuthStoreError('VERIFICATION_IN_PROGRESS', 409, 'جاري التحقق بالفعل.', retryAfter(current.checking_at + CLAIM_LEASE_MS, now));
    },
    async rejectChallenge(id, claimToken) {
      await sql("UPDATE hosted_challenges SET status=CASE WHEN attempts>=5 THEN 'exhausted' ELSE 'pending' END,checking_at=NULL,claim_token=NULL WHERE id=? AND status='checking' AND claim_token=?", id, claimToken).run();
    },
    async completeChallenge({ id, claimToken, tokenHash, previousTokenHash, now, expiresAt }) {
      if (expiresAt <= now) throw expired();
      const results = await db.batch([
        sql(`INSERT INTO hosted_sessions(token_hash,phone,created_at,expires_at) SELECT ?,phone,?,? FROM hosted_challenges
          WHERE id=? AND status='checking' AND claim_token=? AND expires_at>? AND checking_at>?`, tokenHash, now, expiresAt, id, claimToken, now, now - CLAIM_LEASE_MS),
        sql(`UPDATE hosted_challenges SET status='consumed',claim_token=?,checking_at=NULL
          WHERE id=? AND status='checking' AND claim_token=? AND expires_at>? AND checking_at>? RETURNING phone`, tokenHash, id, claimToken, now, now - CLAIM_LEASE_MS),
        sql(`DELETE FROM hosted_sessions WHERE token_hash=? AND token_hash<>?
          AND EXISTS(SELECT 1 FROM hosted_challenges AS challenge JOIN hosted_sessions AS session ON session.token_hash=?
            WHERE challenge.id=? AND challenge.status='consumed' AND challenge.claim_token=session.token_hash)`, previousTokenHash || '', tokenHash, tokenHash, id),
      ]);
      const row = results[1].results?.[0];
      if (!row) throw invalid();
      return { phone: row.phone, expiresAt };
    },
    async getSession(tokenHash, now) {
      if (!tokenHash) return null;
      const row = await sql('SELECT phone,expires_at FROM hosted_sessions WHERE token_hash=? AND expires_at>?', tokenHash, now).first();
      return row ? { phone: row.phone, expiresAt: row.expires_at } : null;
    },
    async revokeSession(tokenHash) { if (tokenHash) await sql('DELETE FROM hosted_sessions WHERE token_hash=?', tokenHash).run(); },
  };
}
