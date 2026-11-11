import { TERMS_VERSION } from "@/service/legal/versions";

const CONTACT_EMAIL = "cs@thenovax.com";
const COMPANY_SITE = "https://www.thenovax.com";

// Published Terms of Service. Bump TERMS_VERSION when this text changes.
export function TermsDocument() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-3xl border border-white/10 bg-white p-6 text-[#12141c] shadow-2xl sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Effective &amp; Last Updated: {TERMS_VERSION} (Version {TERMS_VERSION})
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#12141c] sm:text-4xl">
          Terms of Service &amp; Acceptable Use Policy
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-600">
          Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully before accessing or
          using the Scro platform, studio tools, APIs, or related services (collectively, the
          &ldquo;Service&rdquo;). By creating an account, signing in, or using any part of the
          Service, you agree to be legally bound by these Terms.
        </p>

        <div className="mt-8 space-y-8 text-base leading-7 text-zinc-700">
          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">1. Who We Are</h2>
            <p className="mt-2">
              Scro is a software product owned and operated by <strong>NOVAX Limited</strong>, a
              company incorporated in the Hong Kong Special Administrative Region (&ldquo;NOVAX
              Limited&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). NOVAX
              Limited is the seller, operator, and contracting entity for the Service.{" "}
              <a
                className="font-semibold text-[#12141c] underline"
                href={COMPANY_SITE}
                target="_blank"
                rel="noopener noreferrer"
              >
                thenovax.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              2. Age Eligibility (Strictly 18+)
            </h2>
            <p className="mt-2">
              You must be at least <strong>eighteen (18) years of age</strong> (or the age of legal
              majority in your jurisdiction, whichever is higher) to register an account or use
              Scro. By accessing the Service, you represent and warrant that you are at least 18
              years old and have full legal capacity to enter into a binding contract. Accounts
              registered by or on behalf of minors are strictly prohibited and will be terminated
              immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">3. The Service &amp; Accounts</h2>
            <p className="mt-2">
              Scro provides automated AI creation and editing tools, including AI Influencer
              character creation, Explainer videos, Talking Head videos, Story videos, Scro Swap
              (character and object replacement), Teleport (scene relocation), Life photos, Poster
              generation, and OpenCut timeline editing. You must provide accurate registration
              information, maintain the security of your login credentials, and accept full
              responsibility for all activities, uploads, prompts, and renders performed under your
              account.
            </p>
          </section>

          <section className="rounded-2xl border-2 border-rose-200 bg-rose-50/70 p-5 sm:p-6">
            <h2 className="text-xl font-bold text-rose-950">
              4. Strictly Prohibited Content &amp; Acceptable Use Policy (Zero Tolerance)
            </h2>
            <p className="mt-2 text-sm leading-6 text-rose-900">
              You may use Scro solely for lawful, ethical, and authorized creative or commercial
              purposes. You are <strong>strictly prohibited</strong> from uploading, inputting,
              generating, swapping, editing, storing, or distributing any content that involves or
              attempts to create:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-rose-950">
              <li>
                <strong>
                  (a) NSFW, Pornography &amp; Sexually Explicit Material:
                </strong>{" "}
                Any nudity, sexually explicit acts, pornography, erotic fetish content, or sexually
                suggestive imagery or video, whether involving real persons or fictional characters.
              </li>
              <li>
                <strong>
                  (b) Non-Consensual Intimate Imagery (NCII) &amp; Deepfake Abuse:
                </strong>{" "}
                Using Scro Swap, Teleport, Talking Head, or any other tool to superimpose, swap, or
                synthesize any real person&apos;s face, likeness, body, or voice onto sexually
                explicit, intimate, nude, humiliating, defamatory, or compromising footage.
              </li>
              <li>
                <strong>
                  (c) Child Sexual Abuse Material (CSAM) &amp; Minor Exploitation:
                </strong>{" "}
                Any content depicting, involving, or simulating minors (persons under 18) in any
                sexual, suggestive, abusive, or harmful context, or uploading images/videos of
                minors for face or body swapping. We enforce absolute zero tolerance and immediately
                report any such activity to law enforcement authorities worldwide.
              </li>
              <li>
                <strong>
                  (d) Unauthorized Third-Party Likeness &amp; Impersonation:
                </strong>{" "}
                Uploading or using the photograph, video, or voice of any real individual (including
                private individuals, acquaintances, public figures, celebrities, or politicians)
                without their verifiable, explicit prior consent, or creating deceptive media to
                impersonate, defraud, blackmail, extort, or mislead others.
              </li>
              <li>
                <strong>
                  (e) Harassment, Hate Speech, Violence &amp; Illegal Acts:
                </strong>{" "}
                Content that promotes unlawful violence, self-harm, terrorism, cyberbullying,
                doxxing, defamation, discrimination, financial scams, or infringement of third-party
                copyright, trademark, or privacy rights.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              5. Mandatory Likeness &amp; Third-Party Consent Warranties
            </h2>
            <p className="mt-2">
              You retain ownership of the lawful original content you upload to Scro, and you grant
              NOVAX Limited a worldwide, non-exclusive, royalty-free license solely to host,
              process, transmit to our upstream AI inference providers, and render outputs as
              directed by your account actions.
            </p>
            <p className="mt-2">
              <strong>Express Legal Warranty:</strong> Every time you upload a photo, video clip, or
              audio recording depicting a human face, body, or voice, you expressly represent and
              warrant under penalty of law that:
            </p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-zinc-700">
              <li>
                You are the individual depicted in the media, OR you have obtained{" "}
                <strong>explicit, documented, and verifiable written consent</strong> from the
                depicted individual (who is at least 18 years of age) specifically authorizing the
                AI synthesis, face/character swap, or voice cloning being performed; and
              </li>
              <li>
                Your source media and resulting AI outputs comply with all applicable criminal and
                civil laws, including Hong Kong&apos;s <em>Crimes Ordinance</em> (Cap. 200)
                offences regarding non-consensual intimate images, intellectual property laws, and
                right-of-publicity statutes in your jurisdiction.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              6. Neutral Technology Provider &amp; Sole User Responsibility
            </h2>
            <p className="mt-2">
              Scro operates strictly as an automated, self-service technical tool. Generation jobs
              are executed automatically by machine-learning pipelines in response to user prompts
              and uploads. <strong>NOVAX Limited</strong> does not pre-approve, direct, verify, or
              endorse any user-submitted media or AI-generated output.
            </p>
            <p className="mt-2">
              <strong>You are the sole creator, publisher, and legally responsible party</strong>{" "}
              for all source media you upload and all images, audio, and videos you generate,
              download, or distribute. You must review all outputs for accuracy, legality, and
              appropriateness before publishing or sharing them. NOVAX Limited expressly disclaims
              any and all liability arising from user-generated content or user misuse of the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              7. Violation Enforcement, Account Termination &amp; Forfeiture of Credits
            </h2>
            <p className="mt-2">
              We employ automated safety filters and reserve the right (without assuming the
              obligation) to inspect, flag, block, or remove any upload or generated asset suspected
              of violating these Terms. If we determine or reasonably suspect that you have breached
              Section 4 or Section 5 of these Terms, NOVAX Limited may, in its sole discretion and{" "}
              <strong>without prior notice or liability</strong>:
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-zinc-700">
              <li>Immediately delete the offending uploads, keyframes, and generated videos;</li>
              <li>Suspend or permanently ban your account, email, device, and IP address;</li>
              <li>
                <strong>
                  Permanently forfeit all remaining credits, bonus packs, and active subscription
                  periods with zero refund;
                </strong>{" "}
                and
              </li>
              <li>
                Preserve and disclose your account records, IP address, payment details, uploaded
                media, and generated outputs to law enforcement agencies, regulators, courts, or
                aggrieved third parties.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              8. Credits, Subscriptions &amp; Refund Policy
            </h2>
            <p className="mt-2">
              Storyboard drafts are free until you approve them. Rendering images, frames, audio,
              character swaps, or video clips consumes credits according to the displayed rate.
              Subscriptions and one-time credit packs are processed through Stripe. Spent credits
              are non-refundable once a render completes or if you are dissatisfied with the
              creative style of a model output, except where a technical render failure occurs and
              the system automatically returns the credits. No refunds are provided for accounts
              suspended or terminated for Terms violations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              9. Indemnification (Hold Harmless)
            </h2>
            <p className="mt-2">
              To the fullest extent permitted by applicable law, you agree to defend, indemnify, and
              hold harmless <strong>NOVAX Limited</strong>, its parent and affiliated companies,
              directors, officers, employees, contractors, payment processors, and upstream AI model
              providers from and against any and all claims, demands, lawsuits, investigations,
              damages, fines, penalties, settlements, liabilities, losses, and expenses (including
              full legal and attorneys&apos; fees) arising out of or relating to: (a) any content
              you upload, generate, or distribute using the Service; (b) your breach of these Terms
              or any representation/warranty herein; or (c) your violation of any law or the privacy,
              publicity, likeness, or intellectual property rights of any third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              10. Disclaimer of Warranties &amp; Limitation of Liability
            </h2>
            <p className="mt-2">
              THE SERVICE AND ALL AI OUTPUTS ARE PROVIDED ON AN <strong>&ldquo;AS IS&rdquo;</strong>{" "}
              AND <strong>&ldquo;AS AVAILABLE&rdquo;</strong> BASIS WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
              PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
            </p>
            <p className="mt-2">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL NOVAX LIMITED BE LIABLE FOR
              ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR
              ANY LOSS OF PROFITS, REPUTATION, OR DATA. OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS
              RELATING TO THE SERVICE SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT PAID BY
              YOU TO NOVAX LIMITED IN THE THREE (3) MONTHS IMMEDIATELY PRECEDING THE CLAIM, OR (B)
              HKD $500.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              11. Marketing Communications
            </h2>
            <p className="mt-2">
              Where you have opted in to receive marketing communications, NOVAX Limited may send
              you product updates, AI creation tutorials, feature announcements, and promotional
              offers via email. Marketing consent is optional, and you may opt out at any time via
              your workspace Settings, by clicking the unsubscribe link in any marketing email, or
              by contacting us at{" "}
              <a className="font-semibold text-[#12141c] underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              . Transactional and security emails (such as render completion alerts, billing
              receipts, and policy updates) will still be sent as needed to operate your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#12141c]">
              12. Governing Law, Updates &amp; Abuse Reporting
            </h2>
            <p className="mt-2">
              These Terms are governed by and construed in accordance with the laws of the{" "}
              <strong>Hong Kong Special Administrative Region (HKSAR)</strong>, without regard to
              conflict-of-law principles. Any dispute arising under or in connection with these
              Terms shall be subject to the exclusive jurisdiction of the courts of Hong Kong.
            </p>
            <p className="mt-2">
              These Terms are versioned. When we publish an updated version, you will be prompted to
              review and accept the updated Terms upon login before continuing to use the workspace.
            </p>
            <p className="mt-2">
              To ask questions about these Terms, or to report abuse, unauthorized likeness usage,
              or copyright infringement for immediate takedown, please contact{" "}
              <strong>NOVAX Limited</strong> at{" "}
              <a className="font-semibold text-[#12141c] underline" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
