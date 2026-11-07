# sugi-asayake — агентын чиглүүлэгч

Репод хуваалцдаг цорын ганц agent файл (`/CLAUDE.md` нь лаптоп бүрийн хувийн, gitignore-д).

- **Ажил эхлэхэд**: `docs/PROJECT-GUIDE.md` — тохиргоо ба "⛔ Хэзээ ч зөрчиж болохгүй дүрмүүд".
- **Код хаана юу хийдэг**: `docs/CODEBASE.md`. Шийдвэрийн шалтгаан: `HISTORY.md` (гарчгаар хайна).
- **Deploy, backup, мониторинг, DB CA солигдох**: `docs/OPERATIONS.md`; лаптоп бэлэн эсэх `scripts/oci/doctor.ps1`.
- **Storefront толгой/hero-г засах**: серверт ч зурагдана (`server/_core/heroShell.ts` ↔ React, `e2e/hero-shell.spec.ts`); CSS гэрээ `client/src/styles/storefront.css`.
- **Бараа импорт**: `PRODUCT-IMPORT.md`. **Agent skills** тохиргоо: `docs/agents/`.
- **Commit**: монголоор, AI attribution-гүй; өөрчлөлт бүрт `HISTORY.md`-д нэг догол мөр.
