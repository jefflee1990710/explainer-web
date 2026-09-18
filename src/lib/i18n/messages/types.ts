// Shared message shape — every locale file must satisfy this interface.
export type Messages = {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    projects: string;
    characters: string;
    billing: string;
    pricing: string;
    signIn: string;
    workspace: string;
    language: string;
  };
  common: {
    credits: string;
    perMonth: string;
    cancel: string;
    save: string;
    close: string;
    create: string;
    loading: string;
    popular: string;
    subscribe: string;
  };
  landing: {
    hero: {
      kicker: string;
      title: string;
      subtitle: string;
      ctaStart: string;
      ctaWorkspace: string;
      ctaPricing: string;
      artLabel: string;
    };
    steps: {
      step1Title: string;
      step1Body: string;
      step2Title: string;
      step2Body: string;
      step3Title: string;
      step3Body: string;
    };
    pricing: {
      title: string;
      subtitle: string;
      clipsApprox: string;
      subscribePlan: string;
    };
  };
  dashboard: {
    title: string;
    subscribed: string;
    notSubscribed: string;
    noSubscriptionBanner: string;
    goBilling: string;
  };
  folder: {
    create: string;
    createTitle: string;
    createHint: string;
    createSubmit: string;
    nameLabel: string;
    namePlaceholder: string;
    emptyTitle: string;
    emptyBody: string;
    noMatch: string;
    searchPlaceholder: string;
    searchLabel: string;
    filterLabel: string;
  };
  project: {
    steps: {
      input: string;
      scene: string;
      frames: string;
      video: string;
    };
    status: Record<
      | "draft"
      | "phase_a"
      | "awaiting_approval"
      | "frames_generating"
      | "frames_ready"
      | "approved"
      | "generating"
      | "ready"
      | "failed",
      string
    >;
    filters: {
      all: string;
      action: string;
      active: string;
      ready: string;
      failed: string;
    };
  };
  characters: {
    title: string;
    subtitle: string;
    create: string;
    emptyTitle: string;
    emptyBody: string;
  };
  billing: {
    title: string;
    checkoutSuccess: string;
    currentPlan: string;
    periodInfo: string;
    manageSubscription: string;
    goingToCheckout: string;
    periodLabel: string;
    remainingAria: string;
    remainingSummary: string;
    monthlyAllowance: string;
    bonusUnused: string;
    periodEnds: string;
    clipCostNote: string;
    bonusRollsOver: string;
    subscribeToTopUp: string;
    creditsClips: string;
    subscribePlan: string;
  };
  styles: {
    label: string;
  } & Record<
    | "doodle"
    | "flat-vector"
    | "paper-cutout"
    | "chalkboard"
    | "watercolor"
    | "clay"
    | "pixel"
    | "ink-manga"
    | "realistic",
    string
  >;
  styleDescriptions: Record<
    | "doodle"
    | "flat-vector"
    | "paper-cutout"
    | "chalkboard"
    | "watercolor"
    | "clay"
    | "pixel"
    | "ink-manga"
    | "realistic",
    string
  >;
  plans: {
    starter: { name: string; blurb: string };
    pro: { name: string; blurb: string };
    studio: { name: string; blurb: string };
    scale: { name: string; blurb: string };
  };
};
