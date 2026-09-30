// Shared message shape — every locale file must satisfy this interface.
export type Messages = {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    projects: string;
    characters: string;
    tasks: string;
    mcp: string;
    affiliate: string;
    billing: string;
    examples: string;
    home: string;
    pricing: string;
    signIn: string;
    workspace: string;
    language: string;
  };
  common: {
    credits: string;
    pending: string;
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
    enterprise: {
      title: string;
      body: string;
      cta: string;
    };
    showcase: {
      title: string;
      subtitle: string;
      reel: string;
      deck: string;
      marketing: string;
      scro: string;
      product: string;
      story: string;
    };
    cast: {
      eyebrow: string;
      title: string;
      body: string;
      product: string;
      service: string;
      knowledge: string;
      cta: string;
    };
    persona: {
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
    };
    director: {
      eyebrow: string;
      title: string;
      body: string;
      idea: string;
      takes: string;
      cost: string;
      cta: string;
    };
  };
  examples: {
    title: string;
    heroTitle: string;
    subtitle: string;
    cta: string;
    scroReel: { title: string; body: string };
    scroDeck: { title: string; body: string };
    productMarketing: { title: string; body: string };
    productReel: { title: string; body: string };
  };
  legal: {
    terms: string;
    privacy: string;
    rights: string;
    acceptTerms: string;
    acceptPrivacy: string;
    mustAccept: string;
    agree: string;
    firstTitle: string;
    firstBody: string;
    updatedTitle: string;
    updatedBody: string;
    version: string;
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
      production: string;
      export: string;
    };
    status: Record<
      | "draft"
      | "phase_a"
      | "awaiting_approval"
      | "production"
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
  mcp: {
    title: string;
    subtitle: string;
    installTitle: string;
    installCursor: string;
    installClaudeDesktop: string;
    installClaudeCode: string;
    keysTitle: string;
    keysEmpty: string;
    createKey: string;
    revokeKey: string;
    keyOnce: string;
    keyCopied: string;
    copyKey: string;
    lastUsed: string;
    neverUsed: string;
    dashboardTitle: string;
    calls30d: string;
    credits30d: string;
    errorRate: string;
    byTool: string;
    noUsage: string;
  };
  affiliatePage: {
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
    ctaSignedIn: string;
    secondary: string;
    step1Title: string;
    step1Body: string;
    step2Title: string;
    step2Body: string;
    step3Title: string;
    step3Body: string;
    ratesTitle: string;
    ratesBody: string;
    l1Title: string;
    l2Title: string;
    l3Title: string;
    levelBody: string;
    whoTitle: string;
    whoBody: string;
  };
  affiliate: {
    title: string;
    subtitle: string;
    codeTitle: string;
    copyCode: string;
    copyLink: string;
    copied: string;
    walletTitle: string;
    pending: string;
    paid: string;
    thisMonth: string;
    ratesTitle: string;
    rateBuy: string;
    rateConsume: string;
    rateTotal: string;
    downlineTitle: string;
    downlineEmpty: string;
    colUser: string;
    colBought: string;
    colConsumed: string;
    colEarned: string;
    payoutTitle: string;
    payoutHint: string;
    payoutRequest: string;
    payoutPending: string;
    payoutMin: string;
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
  auth: {
    signInTitle: string;
    signUpTitle: string;
    signInSubmit: string;
    signUpSubmit: string;
    signOut: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    google: string;
    or: string;
    needAccount: string;
    haveAccount: string;
    emailInUse: string;
    weakPassword: string;
    invalidEmail: string;
    invalidCredential: string;
    unauthorizedDomain: string;
    popupBlocked: string;
    genericError: string;
  };
};
