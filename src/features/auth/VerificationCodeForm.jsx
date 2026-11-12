import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ApiForm, FieldError } from '../../api/forms.jsx';
import { verificationCodeSchema } from '../../api/schemas.js';
import { Icon } from '../../components/ui.jsx';

export default function VerificationCodeForm({ challenge, verification, onVerified, onResend, onBack, submitting = false, error }) {
  const form = useForm({ resolver: zodResolver(z.object({ code: verificationCodeSchema })), defaultValues: { code: '' } });
  const [now, setNow] = useState(Date.now);
  const [confirmedSession, setConfirmedSession] = useState(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const remaining = Math.max(0, Math.ceil((challenge.resendAt - now) / 1000));
  const expired = now >= challenge.expiresAt;
  const busy = submitting || verification.verifyMutation.isPending || verification.sendMutation.isPending;
  async function submit({ code }) {
    if (busy || expired && !confirmedSession) return;
    try {
      const session = confirmedSession || await verification.verifyMutation.mutateAsync({ challengeId: challenge.challengeId, code });
      setConfirmedSession(session);
      await onVerified(session);
    } catch (error) { if (error.name !== 'AbortError') form.setError('root', { message: error.message || 'تعذر تأكيد الكود' }); }
  }
  return <ApiForm form={form} onSubmit={submit}>
    <div className="form-step-label">الخطوة 2 من 2 — تأكيد رقم واتساب</div>
    <div className="login-sub">اكتب الكود اللي وصلك على واتساب<br /><b dir="ltr">{challenge.phone}</b></div>
    <div className="inp-wrap"><input {...form.register('code')} className="verification-code" id="verification-code" aria-label="كود التحقق" aria-invalid={Boolean(form.formState.errors.code)} aria-describedby="verification-error" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" readOnly={Boolean(confirmedSession)} /></div>
    <FieldError id="verification-error" error={form.formState.errors.code} />
    <FieldError error={form.formState.errors.root || error || (expired && !confirmedSession ? 'انتهت صلاحية الكود. اطلب كود جديد.' : null)} />
    <button type="submit" className={`btn-whatsapp ${busy ? 'loading' : ''}`} disabled={busy || expired && !confirmedSession}><Icon name={busy ? 'fa-spinner fa-spin' : 'fa-shield-alt'} /><span>{busy ? 'جاري التحقق...' : confirmedSession ? 'متابعة التسجيل' : 'تأكيد الكود والمتابعة'}</span></button>
    <div className="verification-actions"><button type="button" disabled={busy || remaining > 0 || Boolean(confirmedSession)} onClick={async () => { form.clearErrors(); await onResend(); }}>{confirmedSession ? 'تم تأكيد الرقم' : remaining ? `إعادة الإرسال بعد ${remaining} ثانية` : 'إرسال كود جديد'}</button><button type="button" disabled={busy} onClick={onBack}>تعديل الرقم</button></div>
  </ApiForm>;
}
