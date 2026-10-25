"use client";

import { useEffect, useState, type ReactNode } from "react";

export type AcademyDatabaseSection = "hooks" | "post-types" | "creators";

const DATABASE_SECTIONS: AcademyDatabaseSection[] = ["hooks", "post-types", "creators"];

function sectionFromHash(hash: string): AcademyDatabaseSection | null {
  const id = hash.replace(/^#/, "");
  return DATABASE_SECTIONS.includes(id as AcademyDatabaseSection)
    ? (id as AcademyDatabaseSection)
    : null;
}

// Top tabs: the free course catalog, or the Hooks reference list.
export function AcademyCatalog({
  courseLabel,
  databaseLabel,
  course,
  hook,
}: {
  courseLabel: string;
  databaseLabel: string;
  course: ReactNode;
  hook: ReactNode;
}) {
  const [tab, setTab] = useState<"course" | "database">("course");

  useEffect(() => {
    function readHash() {
      const next = sectionFromHash(window.location.hash);
      setTab(next ? "database" : "course");
    }
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  function showCourse() {
    window.history.replaceState(null, "", "/academy");
    setTab("course");
  }

  function showHooks() {
    window.history.replaceState(null, "", "/academy#hooks");
    setTab("database");
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Academy">
        <TabButton active={tab === "course"} label={courseLabel} onSelect={showCourse} />
        <TabButton
          active={tab === "database"}
          label={databaseLabel}
          onSelect={showHooks}
        />
      </div>
      {tab === "course" ? (
        <div role="tabpanel">{course}</div>
      ) : (
        <div role="tabpanel" className="min-w-0">
          {hook}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={
        active
          ? "cursor-pointer rounded-full bg-[#12141c] px-4 py-2 text-sm font-semibold text-white"
          : "cursor-pointer rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-zinc-400"
      }
    >
      {label}
    </button>
  );
}
