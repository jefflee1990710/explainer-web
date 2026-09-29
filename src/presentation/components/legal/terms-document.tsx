import { salesEmail } from "@/service/billing/plans";
import { TERMS_VERSION } from "@/service/legal/versions";

// Published Terms. Bump TERMS_VERSION when this text changes.
export function TermsDocument() {
  const email = salesEmail();

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Version {TERMS_VERSION}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-[#12141c]">服務條款</h1>
      <div className="mt-8 space-y-8 text-base leading-7 text-zinc-700">
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">服務是什麼</h2>
          <p className="mt-2">
            Scro 幫你把想法做成解說影片：選擇風格、建立角色、核准分鏡，再用 credits 產生畫格與影片。訂閱、點數與付款由
            Stripe 處理。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">帳號</h2>
          <p className="mt-2">
            你必須提供真實的聯絡資料，並保管登入方式。帳號裡的專案、角色與上傳的照片由你負責。不得把帳號交給沒有權利使用服務的人。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">點數與付款</h2>
          <p className="mt-2">
            分鏡草稿在核准前不扣點。產生畫格或影片會消耗方案裡的 credits。點數用完後，未完成的產生會停住，直到你升級或購買點數。已消耗的點數不會因為你不滿意成片而自動退回，除非該次產生失敗且系統已標明退回。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">你的內容</h2>
          <p className="mt-2">
            你保留對上傳照片、文字與品牌素材的權利。你授權 Scro 在提供服務所需的範圍內處理這些內容，包括交給產生影片的模型供應商。你必須擁有上傳內容的權利，不得上傳違法、侵權或你無權使用的素材。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">AI 產出</h2>
          <p className="mt-2">
            影片與圖片由模型產生，可能不準確或不適合公開。你要在發布前自己檢查。Scro 不保證產出符合特定商業結果。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">條款更新</h2>
          <p className="mt-2">
            我們會以版本號標示條款。版本更新後，你必須在登入後重新同意，才能繼續使用工作台。
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-[#12141c]">聯絡</h2>
          <p className="mt-2">
            <a className="font-semibold text-[#12141c] underline" href={`mailto:${email}`}>
              {email}
            </a>
          </p>
        </section>
      </div>

      <h2 className="mt-16 text-3xl font-bold tracking-tight text-[#12141c]">Terms of Service</h2>
      <div className="mt-8 space-y-8 text-base leading-7 text-zinc-700">
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">The service</h3>
          <p className="mt-2">
            Scro turns an idea into an explainer video: pick a style, create a character, approve a storyboard, then spend credits to render frames and clips. Subscriptions and payments run through Stripe.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">Accounts</h3>
          <p className="mt-2">
            You must give accurate contact details and keep your sign-in safe. You are responsible for projects, characters, and photos on the account.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">Credits and payment</h3>
          <p className="mt-2">
            Storyboard drafts are free until you approve them. Rendering frames or video spends credits. Spent credits are not refunded because you dislike a finished clip, unless that render failed and the product already marked the credits as returned.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">Your content</h3>
          <p className="mt-2">
            You keep rights in what you upload. You license Scro to process it to run the service, including sending it to video-generation providers. You must have the right to upload it.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">AI output</h3>
          <p className="mt-2">
            Images and video are model output. Review them before you publish. Scro does not promise a particular business result.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">Updates</h3>
          <p className="mt-2">
            Terms are versioned. When the version changes, you must accept again after login before the workspace opens.
          </p>
        </section>
        <section>
          <h3 className="text-xl font-semibold text-[#12141c]">Contact</h3>
          <p className="mt-2">
            <a className="font-semibold text-[#12141c] underline" href={`mailto:${email}`}>
              {email}
            </a>
          </p>
        </section>
      </div>
    </article>
  );
}
