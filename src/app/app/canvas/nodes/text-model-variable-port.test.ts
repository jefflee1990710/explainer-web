import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReactFlowProvider } from "@xyflow/react";
import type { CanvasEdge, CanvasNode } from "@/model/canvas";
import { CanvasTextSettings, SettingsInputRow } from "@/app/app/canvas/nodes/canvas-text-dialog-field";
import type { ModelNodeCardView } from "@/app/app/canvas/nodes/model-node-card-view";
import { TextModelNodeCard } from "@/app/app/canvas/nodes/text-model-node-card";
import { TEXT_STATIC_MODELS } from "@/service/canvas/catalog/text-models";

const spec = TEXT_STATIC_MODELS[0];

function shell(child: ReactNode) {
  return createElement(ReactFlowProvider, null, child);
}

function card(isZh: boolean) {
  const view = {
    id: "tm",
    data: { modelId: spec.id, prompt: "hello {{tone}}" },
    selected: false,
    catalog: TEXT_STATIC_MODELS,
    nodes: [],
    edges: [],
    characterOptions: [],
    locale: isZh ? "zh-Hant" : "en",
    projectTitle: "Test",
    isFlowRunning: false,
    onUpdateNodeData: () => {},
    onDeleteNode: () => {},
    onRunNode: () => {},
    onSwapModel: () => {},
    onOpenLightbox: () => {},
    showAdvanced: false,
    setShowAdvanced: () => {},
    swapOpen: false,
    setSwapOpen: () => {},
    promptEditorOpen: false,
    setPromptEditorOpen: () => {},
    isZh,
    spec,
    displayName: spec.name,
    incomingByHandle: new Map(),
    promptPort: spec.inputs[0],
    isPromptWired: false,
    isStartImageWired: false,
    isRefAudioWired: false,
    outputColor: "#c6f24b",
    status: "idle",
    isBusy: false,
    durationSeconds: 5,
    activePreset: "chat",
    missingRequiredLabels: [],
    pendingOutfits: [],
    canRun: true,
    categoryLabel: isZh ? "文字" : "Text",
    outdated: undefined,
    isRerun: false,
    statusBadge: null,
    templateText: "hello {{tone}}",
    templateVars: {},
    toolParams: {},
    updateToolParam: () => {},
  } as ModelNodeCardView;
  return createElement(TextModelNodeCard, view);
}

function variablePort(html: string): string {
  const start = html.indexOf('data-variable-port=""');
  const textarea = html.indexOf("<textarea");
  assert.ok(start >= 0 && textarea > start);
  return html.slice(start, textarea);
}

test("the text-model prompt keeps its textarea and shows Variable on the left", () => {
  const html = renderToStaticMarkup(shell(card(false)));
  const port = variablePort(html);
  assert.match(port, /Variable/);
  assert.match(port, /data-handleid="settings"/);
  assert.match(port, /Optional/);
  assert.doesNotMatch(port, /Setting/);
  assert.equal(html.match(/data-handleid="settings"/g)?.length, 1);
  assert.doesNotMatch(html.slice(0, html.indexOf('data-variable-port=""')), /Setting/);
  assert.match(html, /<textarea/);
  assert.ok(html.indexOf(">Prompt<") < html.indexOf("Variable"));
});

test("the text-model Variable label is 變數 in Chinese", () => {
  const html = renderToStaticMarkup(shell(card(true)));
  const port = variablePort(html);
  assert.match(port, /變數/);
  assert.match(port, /選填/);
  assert.doesNotMatch(html, />設定</);
  assert.doesNotMatch(html, /Setting/);
});

test("a wired Setting still lands on the Variable port and reads Wired", () => {
  const nodes = [
    {
      id: "set-1",
      type: "settings",
      position: { x: 0, y: 0 },
      data: { settings: { vars: { tone: "warm" } } },
    },
  ] as CanvasNode[];
  const edges = [
    { id: "e1", source: "set-1", target: "tm", targetHandle: "settings" },
  ] as CanvasEdge[];
  const html = renderToStaticMarkup(
    shell(
      // eslint-disable-next-line react/no-children-prop -- Next's typecheck requires children on the props object.
      createElement(CanvasTextSettings, {
        nodeId: "tm",
        nodes,
        edges,
        isZh: false,
        children: card(false),
      }),
    ),
  );
  const port = variablePort(html);
  assert.match(port, /Variable/);
  assert.match(port, /Wired/);
  assert.match(port, /data-handleid="settings"/);
  assert.equal(html.match(/data-handleid="settings"/g)?.length, 1);
});

test("other cards that show this input also say Variable", () => {
  const html = renderToStaticMarkup(shell(createElement(SettingsInputRow)));
  assert.match(html, /Variable/);
  assert.match(html, /data-handleid="settings"/);
  assert.doesNotMatch(html, /Setting/);
});
