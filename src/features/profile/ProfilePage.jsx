import { useApp } from '../../context/AppContext.jsx';
import { Icon, PageHeader } from '../../components/ui.jsx';
import SocialLinks from '../../components/SocialLinks.jsx';

export function ProfileAction({ icon, colors, title, subtitle, onClick, href }) {
  const Tag = href ? 'a' : 'button';
  return <Tag className="profile-list-item" onClick={onClick} href={href} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} style={href ? { textDecoration: 'none' } : undefined}><div className="pli-icon" style={{ background: `linear-gradient(135deg,${colors})` }}><Icon name={icon} brand={icon === 'fa-whatsapp'} /></div><div className="pli-text">{title}{subtitle && <small>{subtitle}</small>}</div><Icon name="fa-chevron-left" /></Tag>;
}
export default function ProfilePage() {
  const { user, points, navigate, setProfileSheet, supportUrl, logout, socialLinks } = useApp();
  return <div className="page active" id="page-profile"><PageHeader emoji="👤" title="حسابي" onBack={() => navigate('home')} />
    <div className="profile-card" style={{ marginTop: 18 }}><div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div><div className="profile-name">{user.name}</div><div className="profile-phone">{user.phone}</div><div className="profile-area"><Icon name="fa-map-marker-alt" /><span>{user.area}</span></div><div className="profile-btn-row"><button className="profile-action-btn" onClick={() => navigate('rewards')}><Icon name="fa-coins" /><span>{points} نقطة</span></button></div><div className="profile-btn-row" style={{ marginTop: 12 }}><button className="profile-action-btn green" onClick={() => setProfileSheet('address')}><Icon name="fa-home" /><span>تعديل العنوان</span></button></div></div>
    {socialLinks.length > 0 && <div className="social-contact-card"><div className="social-contact-title"><Icon name="fa-headset" /><span>تواصل معانا</span></div><div className="social-contact-sub">إحنا هنا لو محتاج أي مساعدة 💬</div><SocialLinks /></div>}
    <div className="profile-list"><ProfileAction icon="fa-gift" colors="var(--warning),#d97706" title="رصيد نقاطي" subtitle={`${points} نقطة`} onClick={() => navigate('rewards')} /><ProfileAction icon="fa-receipt" colors="var(--primary),var(--primary-dark)" title="طلباتي" onClick={() => navigate('orders')} /><ProfileAction icon="fa-shipping-fast" colors="#0ea5e9,#06b6d4" title="طلبات الشحن" onClick={() => navigate('shipping')} /><ProfileAction icon="fa-whatsapp" colors="#25D366,#128C7E" title="مساعدة ودعم" href={supportUrl} /><ProfileAction icon="fa-sign-out-alt" colors="var(--danger),#b91c1c" title="تسجيل الخروج" onClick={logout} /></div>
  </div>;
}
