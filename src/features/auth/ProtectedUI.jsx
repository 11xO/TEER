import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useVerification } from '../../api/useVerification.js';
import { WHATSAPP_VERIFICATION_ENABLED } from '../../api/http.js';
import { Icon, Loader } from '../../components/ui.jsx';
import { FieldError } from '../../api/forms.jsx';
import VerificationCodeForm from './VerificationCodeForm.jsx';

export default function ProtectedUI({ children }) {
  const { user, preview, pending, verificationSession } = useApp();
  const verification = useVerification();
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState(null);
  const phone = user?.phone || (pending?.status === 'approved' ? pending.phone : null);
  if (!WHATSAPP_VERIFICATION_ENABLED || !phone || preview) return children;
  if (verificationSession.isPending) return <Loader message="جاري التحقق من الجلسة..." />;
  if (verificationSession.isError) return <div className="waiting-screen"><div className="waiting-card"><p className="waiting-desc">تعذر التحقق من الجلسة. تأكد من اتصالك.</p><button className="btn-main" onClick={() => verificationSession.refetch()}>إعادة المحاولة</button></div></div>;
  if (verificationSession.data?.verified && verificationSession.data.phone === phone) return children;
  async function send() {
    setError(null);
    try { setChallenge(await verification.sendMutation.mutateAsync({ phone })); }
    catch (error) { if (error.name !== 'AbortError') setError(error.message); }
  }
  return <div className="login-screen"><div className="login-card"><div className="login-logo-wrap"><div className="login-logo-bg" /><img src="./logo.png" alt="teer" className="login-logo" /></div><div className="login-title">تأكيد رقم واتساب</div>
    {challenge ? <VerificationCodeForm challenge={challenge} verification={verification} onVerified={() => verificationSession.refetch()} onResend={send} onBack={() => { verification.reset(); setChallenge(null); setError(null); }} error={error} /> : <><div className="login-sub">أكد رقمك عشان تقدر تستخدم حسابك<br /><b dir="ltr">{phone}</b></div><FieldError error={error} /><button className="btn-whatsapp" disabled={verification.sendMutation.isPending} onClick={send}><Icon name={verification.sendMutation.isPending ? 'fa-spinner fa-spin' : 'fa-whatsapp'} brand={!verification.sendMutation.isPending} /> إرسال كود التحقق</button></>}
  </div></div>;
}
