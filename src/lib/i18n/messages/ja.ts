import type { Messages } from "./types";

export const ja: Partial<Messages> = {
  meta: { title: "Explainer — 解説動画", description: "アイデアを Reels、マーケティング用 clips、プレゼン動画に変換。スタイルを選び、絵コンテを承認して clips を書き出せます。" },
  nav: { projects: "プロジェクト", characters: "キャラクター", billing: "請求", pricing: "料金", signIn: "ログイン", workspace: "ワークスペース", language: "言語" },
  common: { credits: "credits", perMonth: "/ 月", cancel: "キャンセル", save: "保存", close: "閉じる", create: "作成", loading: "読み込み中…", popular: "一番人気", subscribe: "登録する" },
  landing: {
    hero: {
      kicker: "Explainer",
      title: "アイデアを Reels、マーケティング、プレゼン動画で分かりやすく。",
      subtitle: "スタイルを選び、絵コンテを承認して clips を書き出すだけ。ショート動画、商品マーケティング、プレゼンに活用できます。",
      ctaStart: "始める",
      ctaWorkspace: "ワークスペースを開く",
      ctaPricing: "プランを見る",
      artLabel: "絵コンテと編集のコンセプトイラスト",
    },
    steps: {
      step1Title: "スタイルを選ぶ",
      step1Body: "ショート動画、マーケティング、プレゼンなど、用途に合う演出スタイルを選びます。",
      step2Title: "絵コンテを承認",
      step2Body: "AI がタイトル、フック、シーン、ナレーションを提案。納得できるまで編集できます。",
      step3Title: "動画を書き出す",
      step3Body: "承認後、Reels、広告、スライド向けのキャラクター静止画と clips を生成します。",
    },
    pricing: {
      title: "登録して動画をレンダリング",
      subtitle: "1 clip につき 3 credits（開始フレーム、終了フレーム、レンダリング）。絵コンテは承認するまで無料です。",
      clipsApprox: "clips",
      subscribePlan: "{plan} に登録",
    },
  },
  dashboard: {
    title: "プロジェクト",
    subscribed: "現在のプランで動画をレンダリングできます。残り {credits} credits。",
    notSubscribed: "有効な登録がありません。絵コンテは作成できますが、レンダリング前にプランへの登録が必要です。",
    noSubscriptionBanner: "有効な登録がありません。",
    goBilling: "請求ページへ",
  },
  folder: {
    create: "新規プロジェクト", createTitle: "新規プロジェクト", createHint: "まず名前を付けてから、動画を追加します。", createSubmit: "プロジェクトを作成", nameLabel: "プロジェクト名", namePlaceholder: "例：第4四半期の商品発売",
    emptyTitle: "プロジェクトはまだありません", emptyBody: "まずキャンペーン名を付けてから、動画を追加しましょう。",
    noMatch: "一致するプロジェクトがありません。別のフィルターやキーワードをお試しください。",
    searchPlaceholder: "プロジェクト名またはトピックを検索…", searchLabel: "プロジェクト名またはトピックを検索", filterLabel: "ステータスフィルター",
  },
  project: {
    steps: { input: "入力", scene: "シーン", frames: "フレーム", video: "動画" },
    status: { draft: "下書き", phase_a: "絵コンテを作成中", awaiting_approval: "絵コンテの確認", frames_generating: "フレームをレンダリング中", frames_ready: "フレームの確認", approved: "レンダリングを準備中", generating: "レンダリング中", ready: "完了", failed: "失敗" },
    filters: { all: "すべて", action: "要対応", active: "進行中", ready: "完了", failed: "失敗" },
  },
  characters: { title: "キャラクター", create: "新規キャラクター", empty: "キャラクターはまだありません。" },
  billing: { title: "請求" },
  styles: { doodle: "ホワイトボード風落書き", "flat-vector": "フラットベクター", "paper-cutout": "切り絵", chalkboard: "黒板アート", watercolor: "水彩絵本", clay: "クレイアニメ", pixel: "ピクセルアート", "ink-manga": "墨絵漫画", realistic: "シネマティック・リアル" },
  plans: {
    starter: { name: "スターター", blurb: "月 30 credits（約 10 clips / ショート動画 2 本）。Reels を試すのに最適。" },
    pro: { name: "プロ", blurb: "月 90 credits（約 30 clips）。マーケティングやプレゼンを継続的に制作。" },
    studio: { name: "スタジオ", blurb: "月 200 credits（約 66 clips）。毎週制作する小規模チーム向け。" },
    scale: { name: "スケール", blurb: "月 400 credits（約 133 clips）。大規模な制作向け。" },
  },
} as unknown as Messages;
