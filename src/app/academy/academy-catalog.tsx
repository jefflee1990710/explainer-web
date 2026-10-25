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

// Top tabs: the free course catalog, or the reference databases.
export function AcademyCatalog({
  courseLabel,
  databaseLabel,
  hookLabel,
  postTypeLabel,
  creatorLabel,
  course,
  hook,
  postType,
  creator,
}: {
  courseLabel: string;
  databaseLabel: string;
  hookLabel: string;
  postTypeLabel: string;
  creatorLabel: string;
  course: ReactNode;
  hook: ReactNode;
  postType: ReactNode;
  creator: ReactNode;
}) {
  const [tab, setTab] = useState<"course" | "database">("course");
  const [section, setSection] = useState<AcademyDatabaseSection>("hooks");

  useEffect(() => {
    function readHash() {
      const next = sectionFromHash(window.location.hash);
      if (!next) {
        setTab("course");
        return;
      }
      setTab("database");
      setSection(next);
    }
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  function showCourse() {
    window.history.replaceState(null, "", "/academy");
    setTab("course");
  }

  function showSection(next: AcademyDatabaseSection) {
    window.history.replaceState(null, "", `/academy#${next}`);
    setTab("database");
    setSection(next);
  }

  const menu: Array<{ id: AcademyDatabaseSection; label: string }> = [
    { id: "hooks", label: hookLabel },
    { id: "post-types", label: postTypeLabel },
    { id: "creators", label: creatorLabel },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="Academy">
        <TabButton active={tab === "course"} label={courseLabel} onSelect={showCourse} />
        <TabButton
          active={tab === "database"}
          label={databaseLabel}
          onSelect={() => showSection(section)}
        />
      </div>
      {tab === "course" ? (
        <div role="tabpanel">{course}</div>
      ) : (
        <div
          role="tabpanel"
          className="grid gap-8 lg:grid-cols-[minmax(15.5rem,17.5rem)_minmax(0,1fr)] lg:items-start lg:gap-12"
        >
          <nav
            aria-label={databaseLabel}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5 lg:sticky lg:top-24"
          >
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {databaseLabel}
            </h2>
            <ol className="mt-4 space-y-0.5">
              {menu.map((item) => {
                const current = section === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-current={current ? "page" : undefined}
                      onClick={() => showSection(item.id)}
                      className={
                        current
                          ? "flex w-full cursor-pointer rounded-xl bg-white px-2 py-1.5 text-left text-sm font-semibold text-[#12141c] shadow-xs"
                          : "flex w-full cursor-pointer rounded-xl px-2 py-1.5 text-left text-sm text-zinc-700 transition-colors hover:bg-white hover:text-[#12141c]"
                      }
                    >
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="min-w-0">
            {section === "hooks" ? hook : null}
            {section === "post-types" ? postType : null}
            {section === "creators" ? creator : null}
          </div>
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
