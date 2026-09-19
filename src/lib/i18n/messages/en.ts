import type { Messages } from "./types";

export const en: Messages = {
  meta: {
    title: "Explainer — Explainer videos",
    description:
      "Turn concepts into Reels, marketing clips, and presentation videos. Pick a style, approve storyboards, export clips.",
  },
  nav: {
    projects: "Projects",
    characters: "Characters",
    billing: "Billing",
    pricing: "Pricing",
    signIn: "Sign in",
    workspace: "Workspace",
    language: "Language",
  },
  common: {
    credits: "credits",
    perMonth: "/ mo",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    create: "Create",
    loading: "Loading…",
    popular: "Most popular",
    subscribe: "Subscribe",
  },
  landing: {
    hero: {
      kicker: "Explainer",
      title: "Explain ideas clearly as Reels, marketing, and deck videos.",
      subtitle:
        "Pick a style, approve storyboards, export clips—for short video, product marketing, and presentations.",
      ctaStart: "Get started",
      ctaWorkspace: "Open workspace",
      ctaPricing: "See plans",
      artLabel: "Storyboard and editing concept illustration",
    },
    steps: {
      step1Title: "Pick a style",
      step1Body:
        "Choose a director style for short video, marketing, presentations, and more.",
      step2Title: "Approve storyboards",
      step2Body:
        "AI proposes titles, hooks, scenes, and voiceover. Edit until you are happy.",
      step3Title: "Export video",
      step3Body:
        "After approval we generate character stills and clips for Reels, ads, and decks.",
    },
    pricing: {
      title: "Subscribe to render videos",
      subtitle:
        "Each clip costs 3 credits (start frame, end frame, render). Storyboards are free until you approve.",
      clipsApprox: "clips",
      subscribePlan: "Subscribe {plan}",
    },
  },
  dashboard: {
    title: "Projects",
    subscribed: "Your plan can render videos. {credits} credits left.",
    notSubscribed:
      "No active subscription. You can draft storyboards; a plan is required before rendering.",
    noSubscriptionBanner: "No active subscription.",
    goBilling: "Go to billing",
  },
  folder: {
    create: "New project",
    createTitle: "New project",
    createHint: "Name it first, then add videos inside.",
    createSubmit: "Create project",
    nameLabel: "Project name",
    namePlaceholder: "e.g. Q4 product launch",
    emptyTitle: "No projects yet",
    emptyBody: "Name this campaign first, then add videos inside.",
    noMatch: "No projects match. Try another filter or keyword.",
    searchPlaceholder: "Search project name or topic…",
    searchLabel: "Search project name or topic",
    filterLabel: "Status filter",
  },
  project: {
    steps: {
      input: "Input",
      scene: "Scene",
      production: "Production",
    },
    status: {
      draft: "Draft",
      phase_a: "Writing storyboard",
      awaiting_approval: "Storyboard review",
      production: "In production",
      ready: "Done",
      failed: "Failed",
    },
    filters: {
      all: "All",
      action: "Needs action",
      active: "In progress",
      ready: "Done",
      failed: "Failed",
    },
  },
  characters: {
    title: "Characters",
    subtitle:
      "Build reusable character blueprints. Each version costs 1 credit; edit from any version.",
    create: "New character",
    emptyTitle: "No characters yet",
    emptyBody: "Create a character blueprint to reuse across every video.",
  },
  billing: {
    title: "Billing & credits",
    checkoutSuccess:
      "Payment complete. If credits have not updated yet, wait for the webhook to sync.",
    currentPlan: "Current plan: {plan} ({status})",
    periodInfo: "{monthly} credits per month · period ends {date}",
    manageSubscription: "Manage subscription",
    goingToCheckout: "Redirecting to checkout…",
    periodLabel: "Credits this period",
    remainingAria: "Remaining credits",
    remainingSummary: "{remaining} credits left",
    monthlyAllowance: " · monthly allowance {monthly}",
    bonusUnused: " · unused top-up {bonus}",
    periodEnds: " · period ends {date}",
    clipCostNote: "Each clip costs 3 credits (2 storyboard frames + 1 render).",
    bonusRollsOver: "Unused top-up credits roll over to the next period.",
    subscribeToTopUp: "Subscribe to a plan before topping up credits.",
    creditsClips: "{credits} credits · ~{clips} clips",
    subscribePlan: "Subscribe {plan}",
  },
  styles: {
    label: "Visual style",
    doodle: "Whiteboard doodle",
    "flat-vector": "Flat vector",
    "paper-cutout": "Paper cut-out",
    chalkboard: "Chalkboard",
    watercolor: "Watercolour storybook",
    clay: "Claymation",
    pixel: "Pixel art",
    "ink-manga": "Ink manga",
    realistic: "Cinematic realistic",
  },
  styleDescriptions: {
    doodle: "Black marker lines and flat colour — whiteboard explainer feel.",
    "flat-vector": "Borderless geometric shapes and corporate palette — clean and crisp.",
    "paper-cutout": "Layered coloured paper, torn edges, and soft shadows — stop-motion look.",
    chalkboard: "Dark green board with white and pastel chalk hand-drawn art.",
    watercolor: "Soft washes and pencil sketch — storybook atmosphere.",
    clay: "Hand-sculpted clay and soft studio lighting — claymation stop-motion.",
    pixel: "16-bit square pixels and retro console palette.",
    "ink-manga": "Brush ink lines, screentone, and speed lines — manga energy.",
    realistic: "Realistic light and 35 mm lens — cinematic still.",
  },
  plans: {
    starter: {
      name: "Starter",
      blurb: "30 credits/mo (~10 clips / 2 short videos). Good for trying Reels.",
    },
    pro: {
      name: "Pro",
      blurb: "90 credits/mo (~30 clips). Steady marketing and deck output.",
    },
    studio: {
      name: "Studio",
      blurb: "200 credits/mo (~66 clips). Small teams shipping weekly.",
    },
    scale: {
      name: "Scale",
      blurb: "400 credits/mo (~133 clips). High-volume production.",
    },
  },
};

