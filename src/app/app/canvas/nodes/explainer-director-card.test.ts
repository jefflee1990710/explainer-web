import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReactFlowProvider } from "@xyflow/react";
import type { CanvasNodeData } from "@/model/canvas";
import { CanvasNodeActionsContext, type CanvasNodeActionsContextValue } from "@/app/app/canvas/nodes/port-colors";
import { I18nProvider } from "@/presentation/components/i18n-provider";
import { ExplainerDirectorCard } from "@/app/app/canvas/nodes/explainer-director-card";
import { TalkingHeadDirectorCard } from "@/app/app/canvas/nodes/talking-head-director-card";

function shell(child: ReactNode) {
  return createElement(
    ReactFlowProvider,
    null,
    // eslint-disable-next-line react/no-children-prop -- Next's typecheck requires children on the props object.
    createElement(I18nProvider, {
      initialLocale: "en",
      children: createElement(
        CanvasNodeActionsContext.Provider,
        { value: {} as CanvasNodeActionsContextValue },
        child,
      ),
    }),
  );
}

function card(data: CanvasNodeData, wiredPrompt?: string, isZh = false) {
  return createElement(ExplainerDirectorCard, {
    data,
    isZh,
    selected: false,
    disabled: false,
    characterOptions: [],
    incomingHandles: [],
    wiredPrompt,
    referenceWired: false,
    onUpdate: () => {},
    onPlan: () => {},
    onRemove: () => {},
  });
}

const base: CanvasNodeData = {
  modelId: "scro:explainer",
  prompt: "typed on the card",
  toolParams: { plannerMode: true },
};

test("the Explainer Director card has a topic field and keeps Reference and Variable", () => {
  const html = renderToStaticMarkup(shell(card(base)));
  assert.match(html, /Explainer Director/);
  assert.match(html, /data-handleid="prompt"/);
  assert.match(html, /data-handleid="refImages"/);
  assert.match(html, /data-handleid="settings"/);
  assert.match(html, />Topic</);
  assert.match(html, /Or type/);
  assert.match(html, /Topic \/ script/);
  assert.match(html, /typed on the card/);
  assert.match(html, /Reference/);
  assert.match(html, /Variable/);
  const zh = renderToStaticMarkup(shell(card(base, undefined, true)));
  assert.match(zh, /解說導演/);
  assert.match(zh, /可輸入/);
  assert.match(zh, /主題 \/ 講稿/);
  assert.match(zh, />主題</);
  assert.match(zh, /參考圖/);
  assert.match(zh, /typed on the card/);
});

function planButton(html: string): string {
  const match = html.match(/<button type="button"(?: disabled="")? class="nodrag inline-flex[\s\S]*?Plan<\/button>/);
  assert.ok(match);
  return match[0];
}

test("the reference port is optional and says when an image is connected", () => {
  const empty = renderToStaticMarkup(shell(card(base, undefined, true)));
  assert.match(empty, /data-handleid="refImages"/);
  assert.match(empty, /參考圖/);
  assert.match(empty, /可接/);
  const wired = renderToStaticMarkup(
    shell(
      createElement(ExplainerDirectorCard, {
        data: base,
        isZh: true,
        selected: false,
        disabled: false,
        characterOptions: [],
        incomingHandles: [],
        referenceWired: true,
        onUpdate: () => {},
        onPlan: () => {},
        onRemove: () => {},
      }),
    ),
  );
  assert.match(wired, /已連/);
  assert.match(wired, /data-handleid="prompt"/);
});

test("a wired topic fills the field and enables Plan", () => {
  const html = renderToStaticMarkup(shell(card({ ...base, prompt: "" }, "How compound interest works")));
  assert.match(html, /data-handleid="prompt"/);
  assert.match(html, /How compound interest works/);
  assert.match(html, />Wired</);
  assert.match(html, /Reference/);
  assert.match(html, /Variable/);
  assert.doesNotMatch(planButton(html), /disabled=""/);
});

test("Talking Head still has its script row", () => {
  const html = renderToStaticMarkup(
    shell(
      createElement(TalkingHeadDirectorCard, {
        data: { modelId: "scro:talking-head", prompt: "Hello", toolParams: { plannerMode: true } },
        isZh: false,
        selected: false,
        disabled: false,
        characterOptions: [],
        onUpdate: () => {},
        onPlan: () => {},
        onRemove: () => {},
      }),
    ),
  );
  assert.match(html, />Script</);
  assert.match(html, /Or type/);
  assert.match(html, /Hello/);
});

test("Plan stays off until a topic is typed or connected", () => {
  const html = renderToStaticMarkup(shell(card({ ...base, prompt: "" })));
  assert.match(html, /Topic \/ script/);
  assert.match(planButton(html), /disabled=""/);
});

test("a topic typed on the card enables Plan with no wire", () => {
  const html = renderToStaticMarkup(shell(card(base)));
  assert.match(html, /typed on the card/);
  assert.doesNotMatch(planButton(html), /disabled=""/);
});
