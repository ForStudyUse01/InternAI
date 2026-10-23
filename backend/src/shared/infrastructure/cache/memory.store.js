const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlSeconds = 3600) {
  store.set(key, {
    value,
    expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null
  });
}

function del(key) {
  store.delete(key);
}

function incr(key, ttlSeconds = 60) {
  const current = Number(get(key) || 0) + 1;
  set(key, current, ttlSeconds);
  return current;
}

module.exports = { get, set, del, incr };
