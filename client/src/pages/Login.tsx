import { useEffect, useState } from "react";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { Link, useLocation, useSearch } from "wouter";
import { LoaderCircle, Lock, LogIn, Phone, User as UserIcon, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { FieldError, useFieldErrors } from "@/hooks/useFieldErrors";
import CommerceHeader from "@/components/CommerceHeader";
import PhoneVerificationStep from "@/components/PhoneVerificationStep";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";
import { useSiteText } from "@/hooks/useSiteText";
import { useAuth } from "@/_core/hooks/useAuth";
import { isValidPhoneInput } from "@/lib/clientValidation";
import { brandName } from "@/lib/brand";
import PasswordInput from "@/components/uitripled/PasswordInput";

const messageFrom = (error: unknown) => error instanceof Error ? error.message : "Хүсэлт амжилтгүй боллоо. Дахин оролдоно уу.";

// Tom, 2026-09-06 (explicit, after seeing an unverified registration accept
// his wife's phone number with zero proof of ownership: "verify.mn geed
// ajilahgui baina shww!!! ... not just only used for forgot-password!! also
// create account!!!!"): registration is a real 2-step verify.mn flow now --
// (1) PhoneVerificationStep sends a real SMS and waits for it to come back
// VERIFIED (same shared component ForgotPassword.tsx already uses), THEN
// (2) a short name+password form actually creates the account
// (auth.completeRegistration). No account exists until step 2 succeeds, so
// there is no way to register with a number you can't actually text from.
// Login itself is still one-step phone+password (unchanged).
export default function Login() {
  const textFor = useSiteText();
  useDocumentMeta(textFor("seo-text-login-title", `Нэвтрэх — ${brandName()}`), null);
  const [verifyLine1, verifyLine2] = textFor("login-text-verify-heading", "Утасны дугаараа\nбаталгаажуулах.").split("\n");
  const [loginLine1, loginLine2] = textFor("login-text-heading", "Дахин\nтавтай морил.").split("\n");
  const [registerLine1, registerLine2] = textFor("login-text-register-heading", "Бүртгэл\nүүсгэх.").split("\n");
  const search = useSearch();
  // Lets an outside link (e.g. the homepage membership strip) land the
  // shopper directly on the registration step instead of login — same
  // read-once-at-mount pattern as redirectTarget below.
  const [mode, setMode] = useState<"login" | "register">(() => new URLSearchParams(search).get("mode") === "register" ? "register" : "login");
  const [phone, setPhone] = useState("");
  const { errorFor, fieldProps, clearError, showErrors } = useFieldErrors();
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  // Set the instant PhoneVerificationStep reports "verified" -- its presence
  // is what switches the register form from "step 1: verify" to "step 2:
  // set a name + password".
  const [verifiedSessionId, setVerifiedSessionId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const providers = trpc.auth.socialProviders.useQuery(undefined, { staleTime: 5 * 60_000 });
  // Callback failures land back here as /login?error=facebook&reason=...
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("error") !== "facebook") return;
    const reason = params.get("reason");
    toast.error(reason === "denied" ? "Facebook нэвтрэлтийг цуцаллаа." : reason === "suspended" ? "Таны эрх түр хаагдсан байна." : reason === "linked-elsewhere" ? "Энэ Facebook данс өөр бүртгэлтэй холбогдсон байна." : "Facebook-ээр нэвтрэх боломжгүй боллоо. Утасны дугаараар нэвтэрнэ үү.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redirectTarget = (() => {
    const params = new URLSearchParams(search);
    const target = params.get("redirect");
    // Same-site paths only. "//evil.example" also starts with "/" and is a
    // protocol-relative URL to another host -- wouter would refuse it (a
    // cross-origin pushState throws), but the guard should not rely on that.
    // 2026-09-23: `\` БАС хаана. Хөтөч тусгай схемийн URL-д `\`-ийг `/` гэж
    // задалдаг тул `/\evil.com` нь энэ шалгалтыг давж, `pushState` нь
    // cross-origin болж SecurityError шиддэг — нэвтрэлт АМЖИЛТТАЙ болсон
    // байхад хэрэглэгч англи алдааны toast хараад нэвтрэх маягт дээрээ
    // үлддэг байв (server/_core/facebookAuth.ts-ийн `safeRedirect` аль
    // хэдийн ижил хэв маягтай).
    return target && /^\/(?![/\\])/.test(target) ? target : "/";
  })();

  // 2026-09-27: аль хэдийн нэвтэрсэн хэрэглэгч /login дээр (жишээ нь товч
  // хойшоо дарж эсвэл хуучин холбоосоор) орвол дахин маягт харах шаардлагагүй
  // -- шууд redirectTarget-руу нь явуулна (sanitised, дээрх шалгалттай ижил).
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    // `replace: true` (2026-09-27): a pushState here would leave /login
    // itself in history -- Back from redirectTarget would bounce straight
    // back to this auto-redirect and instantly forward again.
    if (isAuthenticated) setLocation(redirectTarget, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const loginMutation = trpc.auth.login.useMutation();
  const completeRegistration = trpc.auth.completeRegistration.useMutation();
  const isSubmitting = loginMutation.isPending || completeRegistration.isPending;

  const submitLogin = async () => {
    // 2026-09-27: сервер `phoneSchema`-ийг мөрддөг (auth.login) -- зөвхөн
    // хоосон эсэхийг шалгахаас гадна форматыг нь ч client дээр урьдчилан шалгана.
    const nextErrors: Record<string, string> = {};
    if (!phone.trim()) nextErrors["login-phone"] = "Утасны дугаараа оруулна уу.";
    else if (!isValidPhoneInput(phone)) nextErrors["login-phone"] = "Утасны дугаараа зөв оруулна уу.";
    if (!password) nextErrors["login-password"] = "Нууц үгээ оруулна уу.";
    if (showErrors(nextErrors)) return;
    try {
      await loginMutation.mutateAsync({ phone: phone.trim(), password });
      await utils.auth.me.invalidate();
      setLocation(redirectTarget);
    } catch (error) {
      toast.error(messageFrom(error));
    }
  };

  const submitRegistration = async () => {
    if (!verifiedSessionId) return;
    // 2026-09-27: сервер `auth.completeRegistration`-д нууц үг ≥8 тэмдэгт
    // шаарддаг (min(8)) -- энд зөвхөн хоосон эсэхийг шалгадаг байсан тул
    // 5 тэмдэгттэй нууц үг серверт очиход л татгалздаг байв.
    if (showErrors(!password ? { "register-password": "Нууц үгээ оруулна уу." } : password.length < 8 ? { "register-password": "Нууц үг дор хаяж 8 тэмдэгт байх ёстой." } : {})) return;
    try {
      await completeRegistration.mutateAsync({ sessionId: verifiedSessionId, password, name: name.trim() || undefined });
      await utils.auth.me.invalidate();
      setLocation(redirectTarget);
    } catch (error) {
      toast.error(messageFrom(error));
    }
  };

  if (mode === "register" && !verifiedSessionId) {
    return (
      <div className="auth-shell">
        <CommerceHeader />
        <main className="auth-main">
          <div className="auth-head">
            <h1>{verifyLine1} <em>{verifyLine2}</em></h1>
            <p className="auth-lede">{textFor("login-text-verify-lede", "Бүртгэл үүсгэхийн тулд эхлээд утасны дугаараа SMS-ээр баталгаажуулна уу.")}</p>
          </div>
          <PhoneVerificationStep purpose="register" onVerified={setVerifiedSessionId} />
          <button type="button" onClick={() => setMode("login")} className="auth-switch">Бүртгэлтэй юу? Нэвтрэх</button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <CommerceHeader />
      <main className="auth-main">
        <div className="auth-head">
          <h1>{mode === "login" ? <>{loginLine1} <em>{loginLine2}</em></> : <>{registerLine1} <em>{registerLine2}</em></>}</h1>
        </div>

        {mode === "login" ? (
          <form onSubmit={event => { event.preventDefault(); submitLogin(); }} className="auth-card">
            <label className="auth-field">
              Утасны дугаар
              <div className="auth-field-shell">
                <Phone size={16} aria-hidden="true" />
                <input type="tel" inputMode="tel" value={phone} onChange={event => { setPhone(event.target.value); clearError("login-phone"); }} placeholder="9911 2233" autoComplete="tel" {...fieldProps("login-phone")} />
              </div>
              <FieldError field="login-phone" message={errorFor("login-phone")} />
            </label>
            <label className="auth-field">
              Нууц үг
              <div className="auth-field-shell">
                <Lock size={16} aria-hidden="true" />
                <PasswordInput value={password} onChange={event => { setPassword(event.target.value); clearError("login-password"); }} placeholder="••••••••" autoComplete="current-password" {...fieldProps("login-password")} />
              </div>
              <FieldError field="login-password" message={errorFor("login-password")} />
            </label>
            <div style={{ textAlign: "right" }}>
              <Link href="/forgot-password" className="auth-quiet" style={{ display: "inline" }}>Нууц үгээ мартсан уу?</Link>
            </div>

            <button type="submit" disabled={isSubmitting} className="auth-submit">
              {isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <LogIn size={16} />}
              Нэвтрэх
            </button>
          </form>
        ) : (
          <form onSubmit={event => { event.preventDefault(); submitRegistration(); }} className="auth-card">
            <div className="auth-note success" style={{ marginBottom: "16px" }}>Утасны дугаар баталгаажлаа. Одоо нэр (сонголтоор) болон нууц үгээ тохируулаад бүртгэлээ дуусгана уу.</div>
            <label className="auth-field">
              Нэр (сонголтоор)
              <div className="auth-field-shell">
                <UserIcon size={16} aria-hidden="true" />
                <input value={name} onChange={event => setName(event.target.value)} placeholder="Таны нэр" />
              </div>
            </label>
            <label className="auth-field">
              Нууц үг
              <div className="auth-field-shell">
                <Lock size={16} aria-hidden="true" />
                <PasswordInput value={password} onChange={event => { setPassword(event.target.value); clearError("register-password"); }} placeholder="8-с дээш тэмдэгт" autoComplete="new-password" {...fieldProps("register-password")} />
              </div>
              <FieldError field="register-password" message={errorFor("register-password")} />
            </label>

            <button type="submit" disabled={isSubmitting} className="auth-submit">
              {isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <UserPlus size={16} />}
              Бүртгэл дуусгах
            </button>
          </form>
        )}

        {providers.data?.facebook && (
          <a href={`/api/auth/facebook?redirect=${encodeURIComponent(redirectTarget)}`} className="auth-social auth-social--facebook">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07"/></svg>
            Facebook-ээр үргэлжлүүлэх
          </a>
        )}
        <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setVerifiedSessionId(null); }} className="auth-switch">
          {mode === "login" ? "Шинэ хэрэглэгч үү? Бүртгүүлэх" : "Бүртгэлтэй юу? Нэвтрэх"}
        </button>
      </main>
      <SiteFooter />
    </div>
  );
}
