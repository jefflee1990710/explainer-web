"use client";

import { useState, type FormEvent } from "react";
import { submitContact, type ContactResult } from "@/presentation/actions/contact";
import { useI18n } from "@/presentation/components/i18n-provider";
import { CONTACT_TOPICS, type ContactTopic } from "@/service/contact/message";

const inputClass =
  "mt-2 w-full rounded-xl border border-[#e4e4e7] bg-white px-4 py-3 text-sm text-[#12141c] outline-none transition focus:border-[#12141c]";

// Contact page: two inboxes plus a form that emails the operator.
export function ContactView({ supportEmail, salesEmail }: { supportEmail: string; salesEmail: string }) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<ContactTopic>("support");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ContactResult | null>(null);

  const errorText = (error: Exclude<ContactResult, { ok: true }>["error"]) => {
    if (error === "name") return t("contactPage.errorName");
    if (error === "email") return t("contactPage.errorEmail");
    if (error === "message") return t("contactPage.errorMessage");
    return t("contactPage.errorSend");
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    const next = await submitContact({ name, email, topic, message, company });
    setResult(next);
    setPending(false);
    if (next.ok) {
      setName("");
      setEmail("");
      setMessage("");
    }
  }

  const mailto = `mailto:${topic === "enterprise" ? salesEmail : supportEmail}?subject=${encodeURIComponent("Scro")}`;

  return (
    <>
      <section className="border-b border-black/40 bg-[#0a0c10] px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center rounded-full border border-[#c6f24b]/35 bg-[#12141c] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#c6f24b]">
            {t("contactPage.eyebrow")}
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
            {t("contactPage.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/70">{t("contactPage.body")}</p>
        </div>
      </section>

      <section className="bg-[#fafafa] px-4 py-16 md:px-8 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,18rem)_1fr] lg:items-start">
          <div className="grid gap-4">
            <a href={`mailto:${supportEmail}`} className="rounded-2xl border border-[#e4e4e7] bg-white p-6 transition-shadow hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5c6170]">{t("contactPage.supportTitle")}</p>
              <p className="mt-2 font-display text-lg font-semibold text-[#12141c]">{supportEmail}</p>
              <p className="mt-2 text-sm leading-6 text-[#5c6170]">{t("contactPage.supportBody")}</p>
            </a>
            <a href={`mailto:${salesEmail}`} className="rounded-2xl border border-[#e4e4e7] bg-white p-6 transition-shadow hover:shadow-[0_8px_24px_rgba(22,24,35,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5c6170]">{t("contactPage.salesTitle")}</p>
              <p className="mt-2 font-display text-lg font-semibold text-[#12141c]">{salesEmail}</p>
              <p className="mt-2 text-sm leading-6 text-[#5c6170]">{t("contactPage.salesBody")}</p>
            </a>
          </div>

          <form onSubmit={onSubmit} className="rounded-2xl border border-[#e4e4e7] bg-white p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-[#12141c]">{t("contactPage.formTitle")}</h2>
            <label className="mt-6 block text-sm font-semibold text-[#12141c]">
              {t("contactPage.name")}
              <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} name="name" autoComplete="name" required />
            </label>
            <label className="mt-4 block text-sm font-semibold text-[#12141c]">
              {t("contactPage.email")}
              <input className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} name="email" type="email" autoComplete="email" required />
            </label>
            <label className="mt-4 block text-sm font-semibold text-[#12141c]">
              {t("contactPage.topic")}
              <select className={inputClass} value={topic} onChange={(event) => setTopic(event.target.value as ContactTopic)}>
                {CONTACT_TOPICS.map((item) => (
                  <option key={item} value={item}>
                    {item === "support" ? t("contactPage.topicSupport") : item === "enterprise" ? t("contactPage.topicEnterprise") : t("contactPage.topicOther")}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 block text-sm font-semibold text-[#12141c]">
              {t("contactPage.message")}
              <textarea className={`${inputClass} min-h-36 resize-y`} value={message} onChange={(event) => setMessage(event.target.value)} name="message" required />
            </label>
            {/* Honeypot. People never see it; bots that fill every field are dropped. */}
            <input className="hidden" tabIndex={-1} autoComplete="off" value={company} onChange={(event) => setCompany(event.target.value)} aria-hidden />
            {result?.ok ? <p className="mt-4 text-sm font-medium text-[#12141c]">{t("contactPage.success")}</p> : null}
            {result && !result.ok ? <p className="mt-4 text-sm font-medium text-red-700">{errorText(result.error)}</p> : null}
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={pending}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#12141c] px-7 py-3 text-sm font-semibold text-[#c6f24b] transition-colors hover:bg-black disabled:opacity-60"
              >
                {pending ? t("contactPage.sending") : t("contactPage.submit")}
              </button>
              <a href={mailto} className="text-sm font-semibold text-[#12141c] underline-offset-4 hover:underline">
                {t("contactPage.mailInstead")}
              </a>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
