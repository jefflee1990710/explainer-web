"use client";

// Renders a canvas-assistant reply as a compact README on the dark chat dock.

import type { ReactNode } from "react";

type ReadmeBlock =
  | { kind: "h"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "code"; text: string }
  | { kind: "p"; text: string };

const LIST_MARK = /^[-*•]\s+(.*)$/;
const ORDER_MARK = /^\d+\.\s+(.*)$/;
const HEADING_MARK = /^#{1,3}\s+(.*)$/;

function renderInline(text: string): ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  return text.split(tokenRegex).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-white">
          {renderInline(part.slice(2, -2))}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={index} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.92em] text-[#d4f57a]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2];
      const safe = /^https?:\/\//i.test(href);
      if (!safe) return link[1];
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#d4f57a] underline underline-offset-2"
        >
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{renderInline(part.slice(1, -1))}</em>;
    }
    return part;
  });
}

// Splits a reply into README blocks. Plain older replies (• and 1. lines) still become lists.
export function parseAgentReadme(content: string): ReadmeBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReadmeBlock[] = [];
  let paragraph: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;
  let fence: string[] | null = null;

  const flushParagraph = () => {
    const text = paragraph.join("\n").trim();
    if (text) blocks.push({ kind: "p", text });
    paragraph = [];
  };
  const flushList = () => {
    if (list && list.items.length > 0) blocks.push(list);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (fence) {
      if (line.startsWith("```")) {
        blocks.push({ kind: "code", text: fence.join("\n") });
        fence = null;
      } else {
        fence.push(raw);
      }
      continue;
    }
    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      fence = [];
      continue;
    }
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = line.match(HEADING_MARK);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "h", text: heading[1] });
      continue;
    }
    const bullet = line.match(LIST_MARK);
    const ordered = line.match(ORDER_MARK);
    if (bullet || ordered) {
      flushParagraph();
      const kind = bullet ? "ul" : "ol";
      const item = (bullet ?? ordered)?.[1] ?? "";
      if (!list || list.kind !== kind) {
        flushList();
        list = { kind, items: [] };
      }
      list.items.push(item);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  if (fence) blocks.push({ kind: "code", text: fence.join("\n") });
  flushParagraph();
  flushList();
  return blocks;
}

export function CanvasAgentReadme({ text }: { text: string }) {
  const blocks = parseAgentReadme(text);
  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.kind === "h") {
          return (
            <h3 key={index} className="text-[13px] font-bold tracking-tight text-white">
              {renderInline(block.text)}
            </h3>
          );
        }
        if (block.kind === "ul" || block.kind === "ol") {
          const Tag = block.kind === "ul" ? "ul" : "ol";
          return (
            <Tag
              key={index}
              className={`space-y-1 pl-4 ${block.kind === "ul" ? "list-disc" : "list-decimal"}`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </Tag>
          );
        }
        if (block.kind === "code") {
          return (
            <pre
              key={index}
              className="overflow-x-auto rounded-lg bg-black/40 px-2.5 py-2 font-mono text-[11px] leading-4 text-white/80"
            >
              <code>{block.text}</code>
            </pre>
          );
        }
        return (
          <p key={index} className="whitespace-pre-line">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
