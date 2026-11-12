import { useEffect, useState } from 'react';
import { useApp } from './context/AppContext.jsx';
import { usePwa } from './hooks/usePwa.js';
import { Icon } from './components/ui.jsx';
import AppOverlays from './components/AppOverlays.jsx';
import SocialLinks from './components/SocialLinks.jsx';
import LoginScreen from './features/auth/LoginScreen.jsx';
import WaitingScreen from './features/auth/WaitingScreen.jsx';
import HomePage from './features/home/HomePage.jsx';
import OrdersPage from './features/orders/OrdersPage.jsx';
import ShippingPage from './features/orders/ShippingPage.jsx';
import ServiceSheet from './features/orders/ServiceSheet.jsx';
import MarketPage from './features/market/MarketPage.jsx';
import RewardsPage from './features/rewards/RewardsPage.jsx';
import ProfilePage from './features/profile/ProfilePage.jsx';
import ProfileSheets from './features/profile/ProfileSheets.jsx';
import ProtectedUI from './features/auth/ProtectedUI.jsx';
import { enabled, formatTime, whatsappUrl } from './utils/format.js';

function Splash() {
  const [hidden, setHidden] = useState(false);
  const [finished, setFinished] = useState(false);
  useEffect(() => { const hide = setTimeout(() => setHidden(true), 2200); const finish = setTimeout(() => setFinished(true), 2800); return () => { clearTimeout(hide); clearTimeout(finish); }; }, []);
  return !finished && <div className={`splash ${hidden ? 'hide' : ''}`}><img src="./logo.png" alt="مشوارك" className="splash-logo" /><div className="splash-title">مشوارك</div><div className="splash-sub">خدمات ذكية</div><div className="splash-loader"><div className="splash-dot" /><div className="splash-dot" /><div className="splash-dot" /></div><div className="splash-loading-text">جاري التحميل...</div></div>;
}
function BottomNavigation() {
  const { page, navigate, rewards, areaSettings, preview } = useApp();
  return <nav className="bottom-nav" aria-label="التنقل الرئيسي">{[['home', 'fa-home', 'الرئيسية'], ['orders', 'fa-box', 'طلباتي'], ['shipping', 'fa-shipping-fast', 'الشحن'], ['rewards', 'fa-gift', 'المكافآت']].filter(([key]) => key === 'rewards' ? enabled(rewards.active) : key === 'shipping' ? enabled(areaSettings.shippingEnabled) : true).map(([key, icon, label]) => <button key={key} className={`nav-btn ${page === key ? 'active' : ''}`} data-color={key} onClick={() => navigate(key)} aria-current={page === key ? 'page' : undefined} style={preview && key !== 'home' ? { opacity: 0.4 } : undefined}><Icon name={icon} /><span>{label}</span></button>)}</nav>;
}
export default function App() {
  const { user, pendingId, page, online, preview, suspended, exitPreview, closed, workHours, support, service, closeService, toast } = useApp();
  const pwa = usePwa(toast);
  const screens = { home: HomePage, orders: OrdersPage, shipping: ShippingPage, rewards: RewardsPage, profile: ProfilePage, market: MarketPage };
  const Screen = screens[page] || HomePage;
  return <>
    <Splash /><div className={`offline-banner ${!online ? 'show' : ''}`} role="status"><Icon name="fa-wifi" /> لا يوجد اتصال بالإنترنت</div>
    {pwa.show && <div className="install-banner-top show"><div className="install-banner-inner"><img src="./logo.png" alt="مشوارك" className="install-banner-icon" /><div className="install-banner-text"><div className="install-banner-title">📱 ثبّت تطبيق مشوارك</div><div className="install-banner-sub">افتحه بضغطة واحدة من الشاشة</div></div><button className="install-banner-btn" onClick={pwa.install}><Icon name="fa-download" /> ثبّت</button><button className="install-banner-close" onClick={pwa.close} aria-label="إغلاق"><Icon name="fa-times" /></button></div></div>}
    <ProtectedUI>{closed ? <div className="closed-screen show"><div className="closed-icon">🌙</div><div className="closed-title">الصفحة مقفولة مؤقتاً</div><div className="closed-sub">إحنا بره ساعات العمل دلوقتي. تعال تاني في المواعيد الجاية 🌟</div><div className="closed-hours"><div className="closed-hours-row"><span>🕐 وقت الفتح</span><span>{formatTime(workHours.openTime || '08:00')}</span></div><div className="closed-hours-row"><span>🕐 وقت القفل</span><span>{formatTime(workHours.closeTime || '23:00')}</span></div></div><a className="closed-contact-btn" href={whatsappUrl(workHours.supportPhone || support, 'السلام عليكم 🙏')} target="_blank" rel="noopener noreferrer"><Icon name="fa-whatsapp" brand /> تواصل مع الدعم</a></div> : user ? <div id="appSection" className={suspended ? 'with-suspension' : undefined}>
      {preview && <div className="preview-mode-bar"><Icon name="fa-eye" /> وضع المعاينة — في انتظار موافقة الأدمن<button onClick={exitPreview} style={{ background: 'rgba(255,255,255,.25)', border: 'none', color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 900, fontFamily: "'Cairo',sans-serif", cursor: 'pointer', marginRight: 'auto' }}>خروج</button></div>}
      {suspended && <div className="suspension-banner"><Icon name="fa-pause-circle" /> حسابك معلق مؤقتاً — مش هتقدر تعمل طلبات لحد ما الإدارة تفك التعليق</div>}
      <Screen key={`${user.phone}:${user.area}:${page}`} /><BottomNavigation /><SocialLinks floating />
      {service && <ServiceSheet key={typeof service === 'string' ? service : service.id} service={service} onClose={closeService} />}<ProfileSheets />
    </div> : pendingId ? <WaitingScreen /> : <LoginScreen />}</ProtectedUI>
    <AppOverlays />
  </>;
}
