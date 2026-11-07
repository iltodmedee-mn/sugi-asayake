import { Clock, Mail, MapPin, MessageCircle, Phone, Search } from "lucide-react";
import { Facebook, Instagram } from "@/components/icons/BrandIcons";
import { Link } from "wouter";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import SiteFooter from "@/components/SiteFooter";
import CommerceHeader from "@/components/CommerceHeader";
import { trpc } from "@/lib/trpc";
import { useShopContact } from "@/hooks/useShopContact";
import { useT } from "@/hooks/useLocale";
import { HELP_FAQ } from "@shared/help-faq";
import "@/styles/routes/content.css";
import { brandName } from "@/lib/brand";

/**
 * /help -- contact, stores and FAQ on one public page (2026-09-14).
 *
 * The same facts were already on the site, but scattered: the phone in the
 * footer, the FAQ inside the signed-in profile's "Тусламж" tab, the stores
 * on the homepage locator. A shopper with a question before buying had no
 * single place to go, and the footer had no "help" link at all. Everything
 * here comes from what the admin already edits (store settings for contact,
 * the branches table, shared/help-faq.ts for the questions) -- nothing is
 * typed a second time.
 *
 * The Messenger button is derived from the Facebook page URL
 * (facebook.com/<page> -> m.me/<page>), the one channel Mongolian shoppers
 * reach for first; it disappears when no page is set.
 */
const messengerFor = (facebookUrl: string | null) => {
  if (!facebookUrl) return null;
  const match = facebookUrl.match(/facebook\.com\/([^/?#]+)/i);
  return match && !/^(profile\.php|pages|people|groups)$/i.test(match[1]) ? `https://m.me/${match[1]}` : null;
};

export default function Help() {
  const t = useT();
  const contact = useShopContact();
  const branches = trpc.content.branches.useQuery();
  const messenger = messengerFor(contact.facebookUrl);
  useDocumentMeta(`${t("Тусламж, холбоо барих")} — ${brandName()}`, null);

  return (
    <div className="doc-shell">
      {/* 2026-09-21: site header like every storefront page (was footer-only). */}
      <CommerceHeader />
      <main className="doc-main help-main">
        <div className="doc-head">
          <p className="doc-kicker">{`${brandName().toUpperCase()} MONGOLIA`}</p>
          <h1>Тусламж, холбоо барих</h1>
          <p>Захиалга, хүргэлт, буцаалтын талаар асуух зүйл байвал шууд холбогдоорой — ажлын цагаар хариулна.</p>
        </div>

        <section className="help-contact" aria-label={t("Холбоо барих")}>
          <a className="help-card" href={`tel:${contact.phoneHref}`}>
            <Phone size={20} aria-hidden="true" />
            <span className="help-card-label">Утсаар залгах</span>
            <strong>{contact.phone}</strong>
          </a>
          {messenger && (
            <a className="help-card" href={messenger} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={20} aria-hidden="true" />
              <span className="help-card-label">Messenger-ээр бичих</span>
              <strong>m.me</strong>
            </a>
          )}
          <a className="help-card" href={`mailto:${contact.email}`}>
            <Mail size={20} aria-hidden="true" />
            <span className="help-card-label">Имэйл бичих</span>
            <strong>{contact.email}</strong>
          </a>
          <div className="help-card help-card-static">
            <Clock size={20} aria-hidden="true" />
            <span className="help-card-label">Ажлын цаг</span>
            <strong>{contact.hours}</strong>
          </div>
        </section>

        <section className="help-section" aria-labelledby="help-stores">
          <h2 id="help-stores">Салбарууд</h2>
          {branches.isLoading ? <p className="help-muted">Ачааллаж байна…</p> : (
            <ul className="help-stores">
              {(branches.data ?? []).map(branch => (
                <li key={branch.id} className="help-store">
                  <MapPin size={16} aria-hidden="true" />
                  <div>
                    <strong>{branch.name}</strong>
                    {branch.address && <span>{branch.address}</span>}
                    <span className="help-store-links">
                      {branch.phone && <a href={`tel:${branch.phone.replace(/\D/g, "")}`}>{branch.phone}</a>}
                      {branch.mapUrl && <a href={branch.mapUrl} target="_blank" rel="noopener noreferrer">Газрын зураг дээр харах</a>}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="help-section" aria-labelledby="help-faq">
          <h2 id="help-faq">Түгээмэл асуултууд</h2>
          <div className="help-faq">
            {HELP_FAQ.map(item => (
              <details key={item.q} className="help-faq-item">
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="help-section help-links" aria-label={t("Холбоотой хуудсууд")}>
          <Link href="/track-order"><Search size={15} aria-hidden="true" />Захиалгаа хянах</Link>
          <Link href="/returns">Буцаалт, солилцоо</Link>
          <Link href="/terms">Үйлчилгээний нөхцөл</Link>
          <Link href="/privacy">Хувийн нууцлал</Link>
          {contact.facebookUrl && <a href={contact.facebookUrl} target="_blank" rel="noopener noreferrer"><Facebook size={15} aria-hidden="true" />Facebook</a>}
          {contact.instagramUrl && <a href={contact.instagramUrl} target="_blank" rel="noopener noreferrer"><Instagram size={15} aria-hidden="true" />Instagram</a>}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
