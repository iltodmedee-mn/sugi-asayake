# Third-party notices

Энэ репозиторт гуравдагч талын эх кодоос ЗӨӨЖ, өөрчилж оруулсан хэсгүүд. npm-ээр суудаг
багцууд (React, framer-motion …) өөрсдийн лицензээ `node_modules`-д агуулдаг тул энд биш.

## mattpocock/skills (AI Hero)

- Эх сурвалж: https://github.com/mattpocock/skills (MIT, "Copyright (c) 2026 Matt Pocock"), https://www.aihero.dev
- Арга: Claude Code plugin — эзний claude.ai бүртгэлд суулгасан (репод идэвхжүүлээгүй), эх кодыг репод ХУУЛААГҮЙ. `docs/agents/*.md` нь plugin-ий `setup-matt-pocock-skills` загвараас үүссэн тохиргоо.

## UI TripleD

- Эх сурвалж: https://ui.tripled.work/ (репозитор: github.com/moumen-soliman/uitripled, `master`)
- Лиценз: MIT — доорх текст
- Арга: registry-ийн JSON (`https://ui.tripled.work/r/<нэр>.json`)-ийг 2026-10-18-нд татаж, эх кодыг
  гараар зөөж өөрчилсөн (shadcn CLI ашиглаагүй). Файл бүрийн толгойд эх URL, sha256-ийн эхний 12 тэмдэгт,
  өөрчлөлтийн товч тайлбар бий. Demo өгөгдөл, Unsplash зураг, brand icon-ыг хассан; бодит өгөгдөл
  props-оор, токен өнгө, монгол текст, ARIA нэмсэн.

| Registry item | sha256 (12) | Хэлбэр | Энэ репод |
|---|---|---|---|
| `animated-pagination-shadcnui` | `499559d73f31` | код, өөрчилсөн | `client/src/components/uitripled/ShopPagination.tsx` |
| `image-slider-card-shadcnui` | `5d035bd70d30` | код, өөрчилсөн | `client/src/components/uitripled/ProductGallery.tsx` |
| `native-tabs-shadcnui` | `fba8fe9da59b` | код, өөрчилсөн | `client/src/components/uitripled/ProductInfoTabs.tsx` |
| `heart-favorite-shadcnui` | `44c5289aea83` | CSS port | `client/src/components/product/WishlistToggle.tsx`, `client/src/styles/primitives.css` (`.sf-wish`) |
| `animated-progress-shadcnui` | `4e8bee1b9f24` | CSS port | `client/src/components/uitripled/ProgressBar.tsx`, `client/src/styles/cart.css` (`.sf-progress`) |
| `password-input-shadcnui` | `a460609d8d03` | код, өөрчилсөн | `client/src/components/uitripled/PasswordInput.tsx` |
| `faq-section-shadcnui` | `cc2cb6831d6a` | CSS port (native `<details>` хэвээр) | `client/src/styles/routes/content.css` |
| `ecommerce-highlight-card-shadcnui` | `a1f2cf03f9c3` | зөвхөн загварын лавлагаа | PDP-ийн худалдан авах хэсэг (`client/src/styles/routes/product.css`) |
| `bottom-modal` | `df094210b167` | зөвхөн загварын лавлагаа | QuickView-ийн утасны доод хуудас (`client/src/styles/routes/shop.css`) |
| `animated-radio-shadcnui` | `a8559f97ca52` | зөвхөн загварын лавлагаа | Checkout-ийн сонголтын карт (`client/src/styles/routes/checkout.css`) |

```
MIT License

Copyright (c) 2026 uitripled

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial
portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN
AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
OR OTHER DEALINGS IN THE SOFTWARE.
```
