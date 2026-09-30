import { TERMS_VERSION } from "@/service/legal/versions";

const CONTACT_EMAIL = "cs@thenovax.com";

// Published Terms. Bump TERMS_VERSION when this text changes.
export function TermsDocument() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Version {TERMS_VERSION}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#12141c]">Terms of Service</h1>
      <div className="mt-8 space-y-8 text-base leading-7 text-zinc-700">
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">The service</h2>
          <p className="mt-2">
            Scro turns an idea into an explainer video: pick a style, create a character, approve a storyboard, then spend credits to render frames and clips. Subscriptions and payments run through Stripe.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">Accounts</h2>
          <p className="mt-2">
            You must give accurate contact details and keep your sign-in safe. You are responsible for projects, characters, and photos on the account.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">Credits and payment</h2>
          <p className="mt-2">
            Storyboard drafts are free until you approve them. Rendering frames or video spends credits. Spent credits are not refunded because you dislike a finished clip, unless that render failed and the product already marked the credits as returned.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">Your content</h2>
          <p className="mt-2">
            You keep rights in what you upload. You license Scro to process it to run the service, including sending it to video-generation providers. You must have the right to upload it.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">AI output</h2>
          <p className="mt-2">
            Images and video are model output. Review them before you publish. Scro does not promise a particular business result.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">Updates</h2>
          <p className="mt-2">
            Terms are versioned. When the version changes, you must accept again after login before the workspace opens.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">Contact</h2>
          <p className="mt-2">
            <a className="font-semibold text-[#12141c] underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </article>
  );
}
