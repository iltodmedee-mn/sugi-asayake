/*
 * Adapted from UI TripleD "native-tabs-shadcnui" — https://ui.tripled.work/r/native-tabs-shadcnui.json
 * Retrieved 2026-10-18, sha256 fba8fe9da59b. Copyright (c) 2026 uitripled. MIT — see THIRD_PARTY_NOTICES.md
 * Өөрчлөлт: сайтын одоогийн Radix `ui/tabs.tsx` дээр (шинэ primitive биш), `layoutId` pill
 * (domAnimation-д байхгүй) → CSS доогуур зураас, агуулгын хөдөлгөөн зөвхөн таб СОЛИХОД
 * (эхний зурагдалтад агуулга шууд харагдана), LazyMotion `m.div`, монгол шошго, `sf-` загвар.
 */
import { m } from "framer-motion";
import { useState, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ProductInfoTab = { id: string; label: string; content: ReactNode };

/**
 * PDP-ийн доод мэдээллийн хэсэг. Нэг л хэсэгтэй бол таб зурахгүй — ганц табтай мөр нь
 * дэлгэц уншигчид "1-ээс 1 таб" гэж илүү алхам нэмдэг.
 */
export default function ProductInfoTabs({ items, heading }: { items: ProductInfoTab[]; heading: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const [direction, setDirection] = useState(1);
  const [changed, setChanged] = useState(false);
  if (!items.length) return null;
  if (items.length === 1) {
    return (
      <section className="sf-info" aria-labelledby="sf-info-heading">
        <h2 id="sf-info-heading" className="sf-info-heading">{items[0]!.label}</h2>
        <div className="sf-info-body">{items[0]!.content}</div>
      </section>
    );
  }
  const onValueChange = (value: string) => {
    const from = items.findIndex(item => item.id === active);
    const to = items.findIndex(item => item.id === value);
    setDirection(to >= from ? 1 : -1);
    setChanged(true);
    setActive(value);
  };
  return (
    <section className="sf-info" aria-label={heading}>
      <Tabs value={active} onValueChange={onValueChange} className="sf-info-tabs">
        <TabsList className="sf-info-list">
          {items.map(item => <TabsTrigger key={item.id} value={item.id} className="sf-info-trigger">{item.label}</TabsTrigger>)}
        </TabsList>
        {items.map(item => (
          <TabsContent key={item.id} value={item.id} className="sf-info-body">
            <m.div initial={changed ? { opacity: 0, x: direction * 10 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: .2, ease: [0.23, 1, 0.32, 1] }}>
              {item.content}
            </m.div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
