import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { Icon, Modal, Sheet, SubmitButton } from './ui.jsx';

function Confetti() {
  const [pieces] = useState(() => Array.from({ length: 40 }, (_, id) => ({ id, left: `${Math.random() * 100}%`, background: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'][id % 5], width: Math.random() * 8 + 6, height: Math.random() * 8 + 6, borderRadius: Math.random() > 0.5 ? '50%' : '2px', animationDuration: `${Math.random() * 2 + 2}s` })));
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setVisible(false), 4000); return () => clearTimeout(timer); }, []);
  return visible && pieces.map(({ id, ...style }) => <div className="confetti-piece" key={id} style={style} aria-hidden="true" />);
}
function Confirmation() {
  const { confirmation, closeConfirm, toast } = useApp();
  const [loading, setLoading] = useState(false);
  const lock = useRef(false);
  async function accept() {
    if (lock.current) return;
    lock.current = true; setLoading(true);
    try { await confirmation.action(); closeConfirm(); } catch (error) { toast(error.message || 'تعذر تنفيذ الطلب', 'error'); }
    finally { lock.current = false; setLoading(false); }
  }
  return <Sheet bare id="confirmSheet" onClose={() => !loading && closeConfirm()}><div style={{ padding: 20, textAlign: 'center' }}><div style={{ width: 70, height: 70, borderRadius: 24, background: 'linear-gradient(135deg,var(--warning),#d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff', margin: '0 auto 18px', boxShadow: '0 10px 25px rgba(245,158,11,.3)' }}><Icon name="fa-question" /></div><div style={{ fontSize: 19, fontWeight: 900, color: 'var(--text)', marginBottom: 10 }}>{confirmation.title}</div><div style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.8, marginBottom: 24 }}>{confirmation.message}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><SubmitButton type="button" loading={loading} onClick={accept} style={{ marginTop: 0, background: 'linear-gradient(135deg,var(--success),#059669)' }}>تأكيد</SubmitButton><button className="btn-main" disabled={loading} onClick={closeConfirm} style={{ marginTop: 0, background: 'var(--bg-soft)', color: 'var(--text-soft)', boxShadow: 'none', border: '1px solid var(--border)' }}>إلغاء</button></div></div></Sheet>;
}
export default function AppOverlays() {
  const { confirmation, success, closeSuccess, celebration, notice, notification, closeNotification, forcedMessage, dismissForcedMessage } = useApp();
  const popupColors = { info: '#06b6d4', success: '#10b981', warning: '#f59e0b', error: '#ef4444' };
  return <>
    {success && <Sheet bare id="successSheet" onClose={closeSuccess}><div style={{ padding: 20, textAlign: 'center' }}><div style={{ width: 90, height: 90, borderRadius: 30, background: 'linear-gradient(135deg,var(--success),#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, color: '#fff', margin: '0 auto 20px', boxShadow: '0 15px 40px rgba(16,185,129,.35)' }}><Icon name="fa-check" /></div><div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text)', marginBottom: 8 }}>تم بنجاح! 🎉</div><div style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.8, marginBottom: 24 }}>{success.message}{success.trackingCode && <div style={{ background: 'rgba(14,165,233,.1)', border: '1px dashed #0ea5e9', borderRadius: 12, padding: 12, marginTop: 12 }}><div style={{ fontSize: 11, color: '#0369a1', marginBottom: 4 }}>كود التتبع:</div><div style={{ fontSize: 18, fontWeight: 900, color: '#0891b2', letterSpacing: 2 }}>{success.trackingCode}</div></div>}</div><button className="btn-main" onClick={closeSuccess} style={{ background: 'linear-gradient(135deg,var(--success),#059669)' }}><Icon name="fa-check" /> تمام</button></div></Sheet>}
    {confirmation && <Confirmation />}
    {forcedMessage && <Modal bare id="forceLogoutScreen" onClose={dismissForcedMessage}><div style={{ textAlign: 'center', padding: '40px 24px' }}><div style={{ width: 90, height: 90, borderRadius: 30, background: 'linear-gradient(135deg,#ef4444,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, color: '#fff', margin: '0 auto 20px', boxShadow: '0 15px 40px rgba(239,68,68,.35)' }}><Icon name="fa-sign-out-alt" /></div><div style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>🔴 تم إنهاء الجلسة</div><div style={{ fontSize: 13.5, color: 'var(--text-soft)', lineHeight: 1.8, marginBottom: 24 }}>{forcedMessage}</div><button className="btn-main" onClick={dismissForcedMessage} style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}><Icon name="fa-redo" /> تسجيل دخول من جديد</button></div></Modal>}
    {notice && <div className={`toast show ${notice.type}`} role="status"><Icon name={notice.type === 'success' ? 'fa-check-circle' : notice.type === 'error' ? 'fa-times-circle' : 'fa-info-circle'} /><span>{notice.message}</span></div>}
    {notification && <div className="notification-popup" style={{ background: popupColors[notification.type] || popupColors.info }} role="status"><div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}><Icon name="fa-info-circle" /></div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 900, marginBottom: 4 }}>{notification.title}</div><div style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.95 }}>{notification.body}</div></div><button onClick={closeNotification} aria-label="إغلاق الإشعار" style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,.2)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}><Icon name="fa-times" /></button></div></div>}
    {celebration > 0 && <Confetti key={celebration} />}
  </>;
}
