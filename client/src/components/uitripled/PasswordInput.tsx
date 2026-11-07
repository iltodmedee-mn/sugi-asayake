/*
 * Adapted from UI TripleD "password-input-shadcnui" — https://ui.tripled.work/r/password-input-shadcnui.json
 * Retrieved 2026-10-18, sha256 a460609d8d03. Copyright (c) 2026 uitripled. MIT — see THIRD_PARTY_NOTICES.md
 * Өөрчлөлт: framer-motion-гүй (whileFocus/rotate хөдөлгөөн, хүч чадлын demo зурвасыг хассан —
 * бодит нууц үгийн бодлогыг сервер шалгадаг), дотоод төлөвгүй controlled `<input>`, бүх `input`
 * props (useFieldErrors-ийн `fieldProps`, `autoComplete`) дамжина, харуулах товч `aria-pressed`
 * + монгол нэр, сайтын `.auth-field-shell` дотор зурагдана.
 */
import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";

/** `type="password"` талбар + "харуулах" товч. Талбарын id/aria-* нь дуудагчийнх хэвээр. */
export default function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <input {...props} type={visible ? "text" : "password"} />
      <button type="button" className="sf-password-toggle" aria-pressed={visible} aria-label="Нууц үгийг харуулах" onClick={() => setVisible(current => !current)}>
        {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
      </button>
    </>
  );
}
