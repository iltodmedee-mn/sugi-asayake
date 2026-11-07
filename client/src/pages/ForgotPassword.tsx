import { useState } from "react";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { Link, useLocation } from "wouter";
import { CheckCircle2, LoaderCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import { FieldError, useFieldErrors } from "@/hooks/useFieldErrors";
import CommerceHeader from "@/components/CommerceHeader";
import PhoneVerificationStep from "@/components/PhoneVerificationStep";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";
import { useSiteText } from "@/hooks/useSiteText";
import { brandName } from "@/lib/brand";
import PasswordInput from "@/components/uitripled/PasswordInput";

const messageFrom = (error: unknown) => error instanceof Error ? error.message : "Хүсэлт амжилтгүй боллоо. Дахин оролдоно уу.";

// Tom, 2026-09-05 (explicit): "remove email eer sergeeh!! we do not need
// brevo at all!!" -- the email-code reset path (auth.requestPasswordReset /
// auth.resetPassword) is gone from this page entirely; verify.mn's SMS
// phone verification is now the ONLY password-recovery method here. Those
// 2 procedures still exist server-side (server/routers.ts) since removing
// them is a separate, larger backend decision -- this page just no longer
// calls them or shows a method toggle.
export default function ForgotPassword() {
  const textFor = useSiteText();
  useDocumentMeta(`Нууц үг сэргээх — ${brandName()}`, null);
  const [forgotLine1, forgotLine2] = textFor("forgot-text-heading", "Нууц үгээ\nсэргээх.").split("\n");
  const [, setLocation] = useLocation();
  const [verifiedPhoneSessionId, setVerifiedPhoneSessionId] = useState<string | null>(null);
  const [phonePassword, setPhonePassword] = useState("");
  const { errorFor, fieldProps, clearError, showErrors } = useFieldErrors();
  const [phoneConfirmPassword, setPhoneConfirmPassword] = useState("");
  const resetPasswordViaPhone = trpc.auth.resetPasswordViaPhone.useMutation();

  const submitPhoneReset = async () => {
    if (!verifiedPhoneSessionId) return;
    const nextErrors: Record<string, string> = {};
    if (phonePassword.length < 8) nextErrors["reset-password"] = "Нууц үг дор хаяж 8 тэмдэгт байх ёстой.";
    else if (phonePassword !== phoneConfirmPassword) nextErrors["reset-confirm"] = "Нууц үг таарахгүй байна.";
    if (showErrors(nextErrors)) return;
    try {
      await resetPasswordViaPhone.mutateAsync({ sessionId: verifiedPhoneSessionId, password: phonePassword });
    } catch (error) {
      toast.error(messageFrom(error));
    }
  };

  return (
    <div className="auth-shell">
      <CommerceHeader />
      <main className="auth-main">
        <div className="auth-head">
          <p className="auth-kicker">ACCOUNT RECOVERY</p>
          <h1>{forgotLine1} <em>{forgotLine2}</em></h1>
          <p className="auth-lede">{textFor("forgot-text-lede", "Бүртгэлтэй утасны дугаараа оруулбал SMS-ээр баталгаажуулна.")}</p>
        </div>

        {resetPasswordViaPhone.isSuccess ? (
          <div className="auth-card">
            <div className="auth-status-icon"><CheckCircle2 size={22} aria-hidden="true" /></div>
            <p style={{ color: "#626368", fontSize: "13px", lineHeight: 1.65 }}>Таны нууц үг амжилттай шинэчлэгдлээ. Одоо шинэ нууц үгээрээ нэвтэрч болно.</p>
            <button type="button" onClick={() => setLocation("/login")} className="auth-submit">Нэвтрэх хуудас руу</button>
          </div>
        ) : verifiedPhoneSessionId ? (
          <form onSubmit={event => { event.preventDefault(); submitPhoneReset(); }} className="auth-card">
            <div className="auth-status-icon"><CheckCircle2 size={22} aria-hidden="true" /></div>
            <p style={{ fontSize: "13px", lineHeight: 1.65, color: "#626368" }}>Утасны дугаар баталгаажлаа. Шинэ нууц үгээ оруулна уу.</p>
            <label className="auth-field">
              Шинэ нууц үг
              <div className="auth-field-shell">
                <Lock size={16} aria-hidden="true" />
                <PasswordInput value={phonePassword} onChange={event => { setPhonePassword(event.target.value); clearError("reset-password"); }} placeholder="8-с дээш тэмдэгт" autoComplete="new-password" {...fieldProps("reset-password")} />
              </div>
              <FieldError field="reset-password" message={errorFor("reset-password")} />
            </label>
            <label className="auth-field">
              Шинэ нууц үг давтах
              <div className="auth-field-shell">
                <Lock size={16} aria-hidden="true" />
                <PasswordInput value={phoneConfirmPassword} onChange={event => { setPhoneConfirmPassword(event.target.value); clearError("reset-confirm"); }} placeholder="Дахин оруулна уу" autoComplete="new-password" {...fieldProps("reset-confirm")} />
              </div>
              <FieldError field="reset-confirm" message={errorFor("reset-confirm")} />
            </label>
            {/* 2026-09-23: илгээх явцад түгжинэ — хоёр дахь товшилт ижил нэг
                удаагийн сессээр дахин илгээж, "аль хэдийн ашиглагдсан" алдааг
                амжилтын картын хажууд гаргадаг байв. */}
            <button type="submit" disabled={resetPasswordViaPhone.isPending} className="auth-submit">
              {resetPasswordViaPhone.isPending ? <LoaderCircle className="animate-spin" size={15} /> : null} Нууц үг шинэчлэх
            </button>
          </form>
        ) : (
          <PhoneVerificationStep purpose="password_reset" onVerified={setVerifiedPhoneSessionId} />
        )}

        <Link href="/login" className="auth-switch">Нэвтрэх хуудас руу буцах</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
