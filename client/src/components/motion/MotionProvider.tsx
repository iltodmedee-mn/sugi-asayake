import { LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** `domAnimation`-ийг тусдаа chunk-аар — эхний зурагдалтын дараа ирнэ. */
const loadFeatures = () => import("./features").then(module => module.default);

/**
 * framer-motion-ийн цорын ганц орох цэг (2026-10-18, UI TripleD бүрэлдэхүүн). `m.*` л ажиллана
 * (`strict` — санамсаргүй `motion.*` нь хөгжүүлэлтэд шууд алдаа заана, бүх feature-ийг үндсэн
 * chunk-д татахгүй). `reducedMotion="user"` — системийн "хөдөлгөөн багасгах" тохиргоог дагана.
 *
 * Зөвхөн lazy хуудас (Shop, ProductDetail …) импортлоно — нүүр/толгой/сагс (eager) БИШ
 * (server/storefront-ui-guard.test.ts тулгана). Feature ачаалагдах хүртэл `m.*` элемент
 * `initial` төлөвөөрөө зурагдана, тиймээс чухал агуулгад `initial` = харагдах төлөв.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
