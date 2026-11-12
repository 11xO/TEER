export const entries = (value) => Object.entries(value || {}).map(([id, item]) => ({ ...item, id }));
export const enabled = (value) => value !== false && value !== 'false';
export const ordered = (items) => [...items].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
export const cleanPhone = (value = '') => String(value).replace(/\D/g, '');
export const validPhone = (value) => /^01\d{9}$/.test(value);
export function whatsappUrl(phone, message = 'السلام عليكم، محتاج مساعدة 🙏') {
  let number = cleanPhone(phone);
  if (number.startsWith('0')) number = `2${number}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
export function safeUrl(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export function escapeText(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
export function weekKey(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date - start) / 86400000);
  return `${date.getFullYear()}-W${Math.ceil((days + start.getDay() + 1) / 7)}`;
}
export function withinWorkHours(open, close, now = new Date()) {
  if (!open || !close) return true;
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);
  const start = oh * 60 + om;
  const end = ch * 60 + cm || 1440;
  const current = now.getHours() * 60 + now.getMinutes();
  return end > start ? current >= start && current < end : current >= start || current < end;
}
export function formatTime(time) {
  if (!time) return '-';
  const [hour, minute] = time.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'مساءً' : 'صباحاً'}`;
}
export function shadeColor(color, percent = -25) {
  const value = parseInt(String(color).replace('#', ''), 16);
  if (!Number.isFinite(value)) return '#7c3aed';
  const amount = Math.round(2.55 * percent);
  return '#' + [value >> 16, (value >> 8) & 255, value & 255].map((item) => Math.max(0, Math.min(255, item + amount)).toString(16).padStart(2, '0')).join('');
}
export function orderAppearance(type = '') {
  if (type === 'مشوار') return { color: '#8b5cf6', image: true };
  if (type.includes('ماركت')) return { color: '#f59e0b', icon: 'fa-shopping-basket' };
  if (type.includes('صيدلية')) return { color: '#06b6d4', icon: 'fa-pills' };
  if (type.includes('خضار')) return { color: '#10b981', icon: 'fa-carrot' };
  if (type.includes('حاجة')) return { color: '#a855f7', icon: 'fa-magic' };
  return { color: '#8b5cf6', icon: 'fa-box' };
}
