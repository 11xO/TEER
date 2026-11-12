import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import ThemeToggle from './ThemeToggle.jsx';

export function Icon({ name = 'fa-info-circle', brand = false, ...props }) {
  return <i {...props} className={`${brand ? 'fab' : 'fas'} ${name} ${props.className || ''}`} aria-hidden="true" />;
}
export function Loader({ message = 'جاري التحميل...' }) {
  return <div className="page-loader" role="status"><div className="spin-circle" /><div className="page-loader-text">{message}</div></div>;
}
export function Empty({ icon = 'fa-box', message, children }) {
  return <div className="empty"><Icon name={icon} /><p>{message || children}</p></div>;
}
export function PageHeader({ emoji, title, onBack }) {
  return <div className="app-header" style={{ padding: '16px 20px' }}><div className="header-row">
    {onBack && <button className="profile-back" onClick={onBack} aria-label="رجوع"><Icon name="fa-arrow-right" /></button>}
    <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{emoji}</div><div style={{ fontSize: 22, fontWeight: 900 }}>{title}</div></div>
    <ThemeToggle />
  </div></div>;
}
const dialogs = [];
let savedOverflow = '';
function Dialog({ id, title, subtitle, icon, gradient, onClose, children, center = false, bare = false }) {
  const generatedId = useId();
  const titleId = `${id || generatedId}-title`;
  const dialog = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement;
    if (!dialogs.length) { savedOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    dialogs.push(dialog);
    dialog.current?.focus();
    const keydown = (event) => {
      if (dialogs.at(-1) !== dialog) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current?.(); }
      if (event.key !== 'Tab') return;
      const elements = [...dialog.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled):not([type="hidden"]), select, textarea, [tabindex="0"]')].filter((item) => item.getClientRects().length);
      if (!elements.length) { event.preventDefault(); return; }
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      const index = dialogs.indexOf(dialog);
      if (index >= 0) dialogs.splice(index, 1);
      if (!dialogs.length) document.body.style.overflow = savedOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  const prefix = center ? 'center-modal' : 'sheet';
  return createPortal(<>
    <div className="sheet-overlay show" onClick={onClose} aria-hidden="true" />
    <div className={`${center ? 'center-modal' : 'bottom-sheet'} show`} id={id} ref={dialog} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} aria-label={title ? undefined : 'رسالة'} tabIndex={-1}>
      {!center && <div className="sheet-handle" />}
      {!bare && <div className={`${prefix}-header`}>
        <div className={`${prefix}-icon`} style={gradient ? { background: gradient } : undefined}>{typeof icon === 'string' ? <Icon name={icon} /> : icon}</div>
        <div><div className={`${prefix}-title`} id={titleId}>{title}</div><div className={`${prefix}-sub`}>{subtitle}</div></div>
        <button className={center ? 'center-modal-close' : 'sheet-close'} type="button" onClick={onClose} aria-label="إغلاق"><Icon name="fa-times" /></button>
      </div>}
      <div className={center ? 'center-modal-body' : bare ? undefined : 'sheet-body'}>{children}</div>
    </div>
  </>, document.body);
}
export function Sheet(props) { return <Dialog {...props} />; }
export function Modal(props) { return <Dialog {...props} center />; }
export function SubmitButton({ loading, children, ...props }) {
  return <button {...props} type={props.type || 'submit'} disabled={loading || props.disabled} className={`btn-main ${loading ? 'loading' : ''} ${props.className || ''}`}>
    {loading ? <><Icon name="fa-spinner fa-spin" /> جاري الإرسال...</> : children}
  </button>;
}
