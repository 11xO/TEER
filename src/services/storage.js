export const storage = {
  get(key, fallback = null) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, String(value)); } catch { /* Private browsing or full storage. */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* Storage is optional. */ }
  },
  json(key, fallback) {
    try { return JSON.parse(storage.get(key)) ?? fallback; } catch { return fallback; }
  },
};
export function storedUser() {
  const name = storage.get('user_name');
  const phone = storage.get('user_phone');
  const area = storage.get('user_area');
  return name && phone && area ? { name, phone, area, address: storage.get('user_address', '') } : null;
}
export function persistUser(user) {
  for (const key of ['name', 'phone', 'area', 'address']) {
    if (user) storage.set(`user_${key}`, user[key] || '');
    else storage.remove(`user_${key}`);
  }
}
