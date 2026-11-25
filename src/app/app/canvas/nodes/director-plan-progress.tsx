// Planning status line on a Director card: what the plan is doing while its rows build.

type Props = {
  isZh: boolean;
  // "locks" while the opening still / reference stills are made, "prompts" while per-clip prompts are written.
  stage?: string;
  // True while the rows on the canvas come from this plan and are still being filled in.
  draft: boolean;
  // True when a finished earlier plan keeps its outputs until this one is done.
  replanning: boolean;
};

export function DirectorPlanProgress({ isZh, stage, draft, replanning }: Props) {
  const keepLast = replanning && !draft;
  const text = (() => {
    if (stage === "locks") {
      return isZh
        ? "節點已建好，正在準備角色靜幀同參考圖，完成後會自動填入提示詞。"
        : "Rows are placed. Preparing the character still and reference stills; prompts fill in when done.";
    }
    if (stage === "prompts") {
      return isZh
        ? "正在寫每段的動作同靜幀提示詞，完成後會自動填入節點。"
        : "Writing each clip's motion and still prompts; they fill into the rows when done.";
    }
    return isZh
      ? "正在寫分段大綱，完成後節點會逐個出現在右邊。"
      : "Writing the clip outline; the rows appear one by one on the right when done.";
  })();
  const suffix = keepLast ? (isZh ? "輸出暫時維持上次的規劃。" : " Outputs keep the last plan meanwhile.") : "";

  return (
    <p className="text-[10.5px] text-white/45">
      {text}
      {suffix}
    </p>
  );
}
