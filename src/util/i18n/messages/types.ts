import type { BriefMessages } from "@/util/i18n/messages/workspace/brief.en";
import type { DirectorsMessages } from "@/util/i18n/messages/workspace/directors.en";
import type { ErrorsMessages } from "@/util/i18n/messages/workspace/errors.en";
import type { PickersMessages } from "@/util/i18n/messages/workspace/pickers.en";
import type { ProductionMessages } from "@/util/i18n/messages/workspace/production.en";
import type { StylesMessages } from "@/util/i18n/messages/workspace/styles.en";
import type { TasksPageMessages } from "@/util/i18n/messages/workspace/tasks.en";
import type { VideoMessages } from "@/util/i18n/messages/workspace/video.en";

// Shared message shape — every locale file must satisfy this interface.
export type Messages = {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    projects: string;
    directors: string;
    styles: string;
    characters: string;
    tasks: string;
    mcp: string;
    affiliate: string;
    billing: string;
    settings: string;
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
    dismissNotification: string;
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
      cardLabel: string;
      nameLine: string;
      quote: string;
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
    freeCredit: {
      eyebrow: string;
      title: string;
      body: string;
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
    tablePreview: string;
    tableName: string;
    tableVideos: string;
    videoCount: string;
    previewAlt: string;
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
    backToList: string;
    noVersions: string;
    nameAria: string;
    versionCount: string;
    stylesHeading: string;
    addStyle: string;
    styleUsage: string;
    addStyleNeedSubscribe: string;
    addStyleAtLimit: string;
    addStyleTitle: string;
    addStyleBody: string;
    addStyleSubmit: string;
    addStyleEmpty: string;
    styleCount: string;
    deleteCharacter: string;
    modalIntro: string;
    nameLabel: string;
    namePlaceholder: string;
    styleLabel: string;
    describeLabel: string;
    describePlaceholder: string;
    costLine: string;
    subscribeRequired: string;
    generateBlueprint: string;
    referencesTitle: string;
    referencesHint: string;
    referenceAlt: string;
    removeReferenceAria: string;
    addMorePhotos: string;
    chooseOrDropPhotos: string;
    deleteTitle: string;
    deleteBody: string;
    deletePendingNote: string;
    referencesUploadFailed: string;
    cardGenerating: string;
    cardFailed: string;
    blueprintAlt: string;
    versionsHeading: string;
    defaultBadge: string;
    editedFromVersion: string;
    versionOriginal: string;
    versionStatusQueued: string;
    versionStatusInProgress: string;
    versionStatusCompleted: string;
    versionStatusFailed: string;
    versionBlueprintAlt: string;
    blueprintGenerating: string;
    versionFailedFallback: string;
    changeThisRun: string;
    characterDescription: string;
    characterSource: string;
    characterFromReferences: string;
    setDefault: string;
    editFromVersion: string;
    retryCredits: string;
    creditsShortSubscribed: string;
    creditsNeedSubscribe: string;
    creditsRemaining: string;
    editWhatLabel: string;
    editWhatPlaceholder: string;
    editKeepsOriginal: string;
    generateNewVersion: string;
    voiceTitle: string;
    voiceHint: string;
    voiceEnabled: string;
    voiceUnset: string;
    voiceAutoUnset: string;
    voicePreview: string;
    voiceSave: string;
    voiceSaved: string;
    voiceFill: string;
    voiceFilled: string;
    voiceFillNeedsBlueprint: string;
    voiceGender: string;
    voiceAge: string;
    voicePitch: string;
    voiceResonance: string;
    voiceTexture: string;
    voiceWeight: string;
    voicePitchHint: string;
    voiceResonanceHint: string;
    voiceTextureHint: string;
    voiceWeightHint: string;
    voiceNote: string;
    voiceNoteHint: string;
    voiceNotePlaceholder: string;
    voiceGenderMale: string;
    voiceGenderFemale: string;
    voiceAgeYoungAdult: string;
    voiceAgeAdult: string;
    voiceAgeOlder: string;
    voicePitchLow: string;
    voicePitchMidLow: string;
    voicePitchMid: string;
    voicePitchMidHigh: string;
    voicePitchHigh: string;
    voiceResonanceChesty: string;
    voiceResonanceMixed: string;
    voiceResonanceBright: string;
    voiceTextureWarm: string;
    voiceTextureDry: string;
    voiceTextureSoft: string;
    voiceTextureCrisp: string;
    voiceWeightLight: string;
    voiceWeightMedium: string;
    voiceWeightHeavy: string;
  };
  settings: {
    title: string;
    languageHint: string;
  };
  tasksMenu: {
    title: string;
    empty: string;
  };
  billing: {
    title: string;
    checkoutSuccess: string;
    checkoutReturningSuccess: string;
    checkoutReturningCancel: string;
    checkoutReturningWait: string;
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
    videoUpgradeTitle: string;
    videoUpgradeBody: string;
    videoUpgradeCta: string;
    videoUpgradeDismiss: string;
    bonusRollsOver: string;
    subscribeToTopUp: string;
    creditsClips: string;
    subscribePlan: string;
    subscribeTitle: string;
    subscribeBody: string;
    subscribeCta: string;
    topUpTitle: string;
    topUpBody: string;
    choosePlan: string;
    choosePack: string;
    chooseUpgrade: string;
    currentPlanNote: string;
    upgradeCta: string;
    payPack: string;
    waitingCheckout: string;
    popupBlocked: string;
    checkoutPending: string;
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
  styles: StylesMessages;
  styleDescriptions: Record<
    | "doodle"
    | "flat-vector"
    | "paper-cutout"
    | "chalkboard"
    | "chalkboard-color"
    | "watercolor"
    | "clay"
    | "pixel"
    | "ink-manga"
    | "realistic"
    | "low-poly"
    | "colored-pencil"
    | "dark-tech"
    | "cave-painting"
    | "egyptian-wall"
    | "attic-black-figure"
    | "roman-mosaic"
    | "gothic-illumination"
    | "high-renaissance"
    | "ukiyo-e"
    | "impressionism"
    | "post-impressionism"
    | "art-nouveau"
    | "cubism"
    | "bauhaus"
    | "pop-art"
    | "eight-bit"
    | "ray-traced"
    | "flat-illustration",
    string
  >;
  plans: {
    starter: { name: string; blurb: string };
    pro: { name: string; blurb: string };
    studio: { name: string; blurb: string };
    scale: { name: string; blurb: string };
  };
  brief: BriefMessages;
  video: VideoMessages;
  production: ProductionMessages;
  tasksPage: TasksPageMessages;
  pickers: PickersMessages;
  errors: ErrorsMessages;
  directors: DirectorsMessages;
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
