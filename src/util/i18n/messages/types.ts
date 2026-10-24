import type { LifePoseLabels } from "@/util/i18n/messages/life-poses";
import type { LifeTemplateLabels } from "@/util/i18n/messages/life-templates";
import type { BriefMessages } from "@/util/i18n/messages/workspace/brief.en";
import type { DirectorsMessages } from "@/util/i18n/messages/workspace/directors.en";
import type { ErrorsMessages } from "@/util/i18n/messages/workspace/errors.en";
import type { PickersMessages } from "@/util/i18n/messages/workspace/pickers.en";
import type { ProductionMessages } from "@/util/i18n/messages/workspace/production.en";
import type { StylesMessages } from "@/util/i18n/messages/workspace/styles.en";
import type { TasksPageMessages } from "@/util/i18n/messages/workspace/tasks.en";
import type { VideoMessages } from "@/util/i18n/messages/workspace/video.en";
import type { PostMessages } from "@/util/i18n/messages/workspace/post.en";
import type { ProductsMessages } from "@/util/i18n/messages/workspace/products.en";
import type { WardrobeMessages } from "@/util/i18n/messages/workspace/wardrobe.en";

// One landing use-case row: label, headline, pitch, three bullets, and a button.
export type LandingUseCaseMessages = {
  eyebrow: string;
  title: string;
  body: string;
  point1: string;
  point2: string;
  point3: string;
  cta: string;
};

// Four pictured examples under one feature-page heading.
export type FeaturePostCopy = {
  title: string;
  lede: string;
  p1: string;
  p2: string;
  p3: string;
};

export type FeatureExampleSet = {
  title: string;
  body: string;
  e1Title: string;
  e1Body: string;
  e2Title: string;
  e2Body: string;
  e3Title: string;
  e3Body: string;
  e4Title: string;
  e4Body: string;
};

// Feature marketing pages used for SEO + Google Ads landings.
export type MarketingSeoMessages = {
  title: string;
  description: string;
};

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
    posts: string;
    blog: string;
    products: string;
    textStyles: string;
    life: string;
    room: string;
    wardrobe: string;
    rightTool: string;
    talkingHead: string;
    cantonese: string;
    explainer: string;
    aiInfluencer: string;
    productPromo: string;
    features: string;
    featuresRightTool: string;
    featuresTalkingHead: string;
    featuresCantonese: string;
    featuresExplainer: string;
    featuresAiInfluencer: string;
    featuresProductPromo: string;
  };
  persona: {
    title: string;
    city: string;
    cityPlaceholder: string;
    summary: string;
    summaryPlaceholder: string;
    interests: string;
    interestsPlaceholder: string;
    warmth: string;
    pace: string;
    humor: string;
    random: string;
    save: string;
    saved: string;
    lifeLink: string;
    warmthWarm: string;
    warmthDirect: string;
    warmthSharp: string;
    paceSlow: string;
    paceEven: string;
    paceQuick: string;
    humorStraight: string;
    humorPlayful: string;
    humorTeasing: string;
  };
  life: {
    title: string;
    subtitle: string;
    character: string;
    place: string;
    placePlaceholder: string;
    kindLabel: string;
    selfie: string;
    food: string;
    street: string;
    hobby: string;
    search: string;
    upload: string;
    searchAction: string;
    searching: string;
    generate: string;
    generating: string;
    emptyCharacters: string;
    emptyShots: string;
    needBlueprint: string;
    needScene: string;
    cost: string;
    uploadHint: string;
    recent: string;
    presetHeading: string;
    defaultLook: string;
    selectedLook: string;
    manageDress: string;
    presetsEmpty: string;
    templates: LifeTemplateLabels;
    poses: LifePoseLabels;
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
      ctaUseCases: string;
      platformReels: string;
      platformShorts: string;
      platformTiktok: string;
      artLabel: string;
    };
    useCases: {
      eyebrow: string;
      title: string;
      subtitle: string;
      explain: LandingUseCaseMessages;
      saas: LandingUseCaseMessages;
      product: LandingUseCaseMessages;
      tutorial: LandingUseCaseMessages;
      virtualYou: LandingUseCaseMessages;
    };
    steps: {
      eyebrow: string;
      title: string;
      step1Title: string;
      step1Body: string;
      step2Title: string;
      step2Body: string;
      step3Title: string;
      step3Body: string;
    };
    pricing: {
      eyebrow: string;
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
      ctaPricing: string;
    };
    kol: {
      eyebrow: string;
      title: string;
      body: string;
      posts: string;
      followers: string;
      notifications: string;
      cta: string;
    };
    // Brand IP: many outfits + Life posts, daily refresh, custom fashion.
    ip: {
      eyebrow: string;
      title: string;
      body: string;
      wardrobeLabel: string;
      postsLabel: string;
      dailyLabel: string;
      customLabel: string;
      p1Title: string;
      p1Body: string;
      p2Title: string;
      p2Body: string;
      p3Title: string;
      p3Body: string;
      cta: string;
    };
    // Built-in wardrobe / pose / post-type database as a product pillar.
    catalog: {
      eyebrow: string;
      title: string;
      body: string;
      statLooks: string;
      statPoses: string;
      statPosts: string;
      statTags: string;
      footnote: string;
      cta: string;
      ctaSecondary: string;
    };
  };
  examples: {
    title: string;
    heroTitle: string;
    subtitle: string;
    cta: string;
    galleryTitle: string;
    galleryBody: string;
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
      video: string;
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
    createSimple: string;
    createSimpleHint: string;
    createGenerator: string;
    createGeneratorHint: string;
    generatorTitle: string;
    generatorIntro: string;
    poseGenerate: string;
    poseGenerating: string;
    poseEmpty: string;
    poseCommentLabel: string;
    poseCommentPlaceholder: string;
    poseUpdate: string;
    poseUpdating: string;
    look: {
      hair: string;
      face: string;
      body: string;
      top: string;
      pants: string;
      shoes: string;
      accessory: string;
      expression: string;
      crazyMix: string;
      surpriseMe: string;
      lockPart: string;
      unlockPart: string;
      exaggerationLabel: string;
      exaggeration1x: string;
      exaggeration3x: string;
      exaggeration10x: string;
      genderLabel: string;
      genderFemale: string;
      genderMale: string;
      presetsLabel: string;
      presets: {
        skyscraperDiva: string;
        muscleTitan: string;
        bugeyeHype: string;
        ramenGremlin: string;
      };
      tabs: {
        all: string;
        extreme: string;
        stylized: string;
        classic: string;
      };
      extremeBadge: string;
      searchPlaceholder: string;
      searchLabel: string;
      tagsLabel: string;
      tags: {
        casual: string;
        athletic: string;
        yoga: string;
        tennis: string;
        pickleball: string;
        street: string;
        heritage: string;
        editorial: string;
        formal: string;
        lounge: string;
        summer: string;
        winter: string;
      };
      favourites: string;
      favouriteAdd: string;
      favouriteRemove: string;
      emptySearch: string;
      emptyFavourites: string;
      options: {
        hair: Record<string, string>;
        face: Record<string, string>;
        body: Record<string, string>;
        top: Record<string, string>;
        pants: Record<string, string>;
        shoes: Record<string, string>;
        accessory: Record<string, string>;
        expression: Record<string, string>;
      };
    };
    emptyTitle: string;
    emptyBody: string;
    backToList: string;
    noVersions: string;
    nameAria: string;
    versionCount: string;
    outlookHeading: string;
    stylesHeading: string;
    addStyle: string;
    styleUsage: string;
    addStyleNeedSubscribe: string;
    addStyleAtLimit: string;
    characterUsage: string;
    characterNeedSubscribe: string;
    characterAtLimit: string;
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
    useCamera: string;
    referenceGuideFront: string;
    referenceGuideSide: string;
    referenceGuideFaceOnly: string;
    referenceGuideLight: string;
    checkingReferences: string;
    // Reference coverage check (AI reads the uploads before generating)
    coverageTitle: string;
    coverageIntro: string;
    coverageFrontFaceTitle: string;
    coverageFrontFaceBody: string;
    coverageCloseupTitle: string;
    coverageCloseupBody: string;
    coverageSideFaceTitle: string;
    coverageSideFaceBody: string;
    coverageWarnPrefix: string;
    coverageWarnBlurry: string;
    coverageWarnDark: string;
    coverageWarnOccluded: string;
    coverageWarnMultiple: string;
    coverageWarnNoFace: string;
    coverageAddMore: string;
    coverageUseCamera: string;
    coverageSkip: string;
    // Guided camera capture
    cameraTitle: string;
    cameraIntro: string;
    cameraUnsupported: string;
    cameraDenied: string;
    cameraNotFound: string;
    cameraFailed: string;
    cameraStarting: string;
    cameraSwitch: string;
    cameraAutoHint: string;
    cameraShutter: string;
    cameraTimer: string;
    cameraSkipStep: string;
    cameraAtLimit: string;
    cameraRetake: string;
    cameraUse: string;
    cameraShotAlt: string;
    cameraProgressAria: string;
    cameraDoneTitle: string;
    cameraDoneHint: string;
    cameraStepFront: string;
    cameraStepLeft: string;
    cameraStepRight: string;
    cameraHintFront: string;
    cameraHintLeft: string;
    cameraHintRight: string;
    // Blueprint board (portrait + full body) and appearance notes
    boardPortrait: string;
    boardFullBody: string;
    boardPortraitAlt: string;
    boardFullBodyAlt: string;
    boardPortraitGenerating: string;
    boardFullBodyGenerating: string;
    boardFullBodyWaiting: string;
    specHeading: string;
    specIdentity: string;
    specFace: string;
    specHair: string;
    specSkinTone: string;
    specBody: string;
    specMarks: string;
    specOutfit: string;
    specNotes: string;
    specPalette: string;
    deleteTitle: string;
    deleteBody: string;
    deletePendingNote: string;
    selectMode: string;
    cancelSelect: string;
    selectAll: string;
    deselectAll: string;
    selectedCount: string;
    deleteSelected: string;
    selectCardAria: string;
    bulkDeleteTitle: string;
    bulkDeleteBody: string;
    bulkDeletePendingNote: string;
    referencesUploadFailed: string;
    cardGenerating: string;
    cardFailed: string;
    blueprintAlt: string;
    profileAlt: string;
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
    savePresetButton: string;
    savePresetTitle: string;
    savePresetHint: string;
    savePresetPlaceholder: string;
    savePresetSubmit: string;
    savePresetSaving: string;
    savePresetSaved: string;
    presetsHeading: string;
    presetsEmpty: string;
    deletePresetAria: string;
    versionsAndPresetsHeading: string;
    historyButton: string;
    historyTitle: string;
    historySubtitle: string;
    historyUseButton: string;
    historyActiveBadge: string;
    historyPageLabel: string;
    historyPrevPage: string;
    historyNextPage: string;
    roomTitle: string;
    roomSubtitle: string;
    roomSelectAndBack: string;
    roomSwitchCharacter: string;
    roomWardrobeHeading: string;
    roomWardrobeWaiting: string;
    roomTabPresets: string;
    roomTabHistory: string;
    roomHistoryLimit: string;
    roomPresetsEmpty: string;
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
    voiceSampleTitle: string;
    voiceSampleHint: string;
    voiceSampleUpload: string;
    voiceSampleReplace: string;
    voiceSampleRemove: string;
    voiceSampleSeconds: string;
    voiceSampleSaved: string;
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
  // Marketing page: pick the right tool vs courses + blind AI retries.
  rightTool: {
    seo: MarketingSeoMessages;
    hero: {
      brand: string;
      kicker: string;
      title: string;
      subtitle: string;
      ctaStart: string;
      ctaWorkspace: string;
      ctaSecondary: string;
    };
    pain: {
      eyebrow: string;
      title: string;
      body: string;
      diyLabel: string;
      diy1: string;
      diy2: string;
      diy3: string;
      scroLabel: string;
      scro1: string;
      scro2: string;
      scro3: string;
    };
    directors: {
      eyebrow: string;
      title: string;
      body: string;
      d1Title: string;
      d1Body: string;
      d2Title: string;
      d2Body: string;
      d3Title: string;
      d3Body: string;
      d4Title: string;
      d4Body: string;
      d5Title: string;
      d5Body: string;
      d6Title: string;
      d6Body: string;
    };
    influencer: {
      eyebrow: string;
      title: string;
      body: string;
      f1Title: string;
      f1Body: string;
      f2Title: string;
      f2Body: string;
      f3Title: string;
      f3Body: string;
    };
    // Built-in editor after generation — one pipeline to the final cut.
    edit: {
      eyebrow: string;
      title: string;
      body: string;
      p1Title: string;
      p1Body: string;
      p2Title: string;
      p2Body: string;
      p3Title: string;
      p3Body: string;
      deskLabel: string;
      timelineLabel: string;
    };
    cta: {
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
      ctaPricing: string;
    };
  };
  // Marketing: talking-head clips with captions, then human finish in editor.
  talkingHeadPage: {
    seo: MarketingSeoMessages;
    hero: {
      brand: string;
      kicker: string;
      title: string;
      subtitle: string;
      ctaStart: string;
      ctaWorkspace: string;
      ctaSecondary: string;
    };
    steps: {
      eyebrow: string;
      title: string;
      body: string;
      s1Title: string;
      s1Body: string;
      s2Title: string;
      s2Body: string;
      s3Title: string;
      s3Body: string;
    };
    finish: {
      eyebrow: string;
      title: string;
      body: string;
      p1Title: string;
      p1Body: string;
      p2Title: string;
      p2Body: string;
      p3Title: string;
      p3Body: string;
      deskLabel: string;
    };
    cta: {
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
      ctaCantonese: string;
      ctaPricing: string;
    };
  };
  // Marketing: upload product, virtual host promotes anywhere (iceberg → Mars).
  productPromoPage: {
    seo: MarketingSeoMessages;
    hero: {
      brand: string;
      kicker: string;
      title: string;
      subtitle: string;
      ctaStart: string;
      ctaWorkspace: string;
      ctaSecondary: string;
    };
    cost: {
      eyebrow: string;
      title: string;
      body: string;
    };
    flow: {
      eyebrow: string;
      title: string;
      body: string;
      s1Title: string;
      s1Body: string;
      s2Title: string;
      s2Body: string;
      s3Title: string;
      s3Body: string;
    };
    wild: {
      eyebrow: string;
      title: string;
      body: string;
      w1Title: string;
      w1Body: string;
      w2Title: string;
      w2Body: string;
      w3Title: string;
      w3Body: string;
    };
    cta: {
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
      ctaPricing: string;
    };
  };
  // Marketing: your experience is the soul of an AI Influencer.
  aiInfluencerPage: {
    seo: MarketingSeoMessages;
    hero: {
      brand: string;
      kicker: string;
      title: string;
      subtitle: string;
      ctaStart: string;
      ctaWorkspace: string;
      ctaSecondary: string;
    };
    soul: {
      eyebrow: string;
      title: string;
      body: string;
      p1Title: string;
      p1Body: string;
      p2Title: string;
      p2Body: string;
      p3Title: string;
      p3Body: string;
    };
    // Brand IP: many outfits + Life posts, daily refresh, custom fashion.
    ip: {
      eyebrow: string;
      title: string;
      body: string;
      wardrobeLabel: string;
      postsLabel: string;
      dailyLabel: string;
      customLabel: string;
      p1Title: string;
      p1Body: string;
      p2Title: string;
      p2Body: string;
      p3Title: string;
      p3Body: string;
      cta: string;
    };
    earn: {
      eyebrow: string;
      title: string;
      body: string;
      e1Title: string;
      e1Body: string;
      e2Title: string;
      e2Body: string;
      e3Title: string;
      e3Body: string;
    };
    shift: {
      eyebrow: string;
      title: string;
      body: string;
      oldLabel: string;
      oldBody: string;
      newLabel: string;
      newBody: string;
    };
    cta: {
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
      ctaPricing: string;
    };
  };
  // Marketing: whiteboard explainer director for product concepts.
  explainerPage: {
    seo: MarketingSeoMessages;
    hero: {
      brand: string;
      kicker: string;
      title: string;
      subtitle: string;
      ctaStart: string;
      ctaWorkspace: string;
      ctaSecondary: string;
    };
    style: {
      eyebrow: string;
      title: string;
      body: string;
    };
    uses: {
      eyebrow: string;
      title: string;
      body: string;
      u1Title: string;
      u1Body: string;
      u2Title: string;
      u2Body: string;
      u3Title: string;
      u3Body: string;
    };
    flow: {
      eyebrow: string;
      title: string;
      body: string;
      s1Title: string;
      s1Body: string;
      s2Title: string;
      s2Body: string;
      s3Title: string;
      s3Body: string;
    };
    cta: {
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
      ctaFeatures: string;
      ctaPricing: string;
    };
  };
  // Marketing: HK Cantonese talking-head for SME / solo founders.
  cantonesePage: {
    seo: MarketingSeoMessages;
    hero: {
      brand: string;
      kicker: string;
      title: string;
      subtitle: string;
      ctaStart: string;
      ctaWorkspace: string;
      ctaSecondary: string;
    };
    fit: {
      eyebrow: string;
      title: string;
      body: string;
      f1Title: string;
      f1Body: string;
      f2Title: string;
      f2Body: string;
      f3Title: string;
      f3Body: string;
    };
    flow: {
      eyebrow: string;
      title: string;
      body: string;
      s1Title: string;
      s1Body: string;
      s2Title: string;
      s2Body: string;
      s3Title: string;
      s3Body: string;
    };
    cta: {
      eyebrow: string;
      title: string;
      body: string;
      cta: string;
      ctaTalkingHead: string;
      ctaPricing: string;
    };
  };
  // One editorial post on each feature landing.
  featurePosts: {
    eyebrow: string;
    igLabel: string;
    ai: FeaturePostCopy;
    promo: FeaturePostCopy;
    tool: FeaturePostCopy;
    talk: FeaturePostCopy;
    canto: FeaturePostCopy;
    explain: FeaturePostCopy;
  };
  // Extra example stills shown on each feature landing.
  featureExamples: {
    eyebrow: string;
    ai: FeatureExampleSet;
    promo: FeatureExampleSet;
    tool: FeatureExampleSet;
    talk: FeatureExampleSet;
    canto: FeatureExampleSet;
    explain: FeatureExampleSet;
  };
  contactPage: {
    navLabel: string;
    seoTitle: string;
    seoDescription: string;
    eyebrow: string;
    title: string;
    body: string;
    supportTitle: string;
    supportBody: string;
    salesTitle: string;
    salesBody: string;
    formTitle: string;
    name: string;
    email: string;
    topic: string;
    topicSupport: string;
    topicEnterprise: string;
    topicOther: string;
    message: string;
    submit: string;
    sending: string;
    success: string;
    errorName: string;
    errorEmail: string;
    errorMessage: string;
    errorSend: string;
    mailInstead: string;
  };
  blogPage: {
    seoTitle: string;
    seoDescription: string;
    notFoundTitle: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    emptyTitle: string;
    emptyBody: string;
    readArticle: string;
    backToPosts: string;
    prevPage: string;
    nextPage: string;
    pageOf: string;
    recommendedHeading: string;
    allPosts: string;
    ctaEyebrow: string;
    ctaTitleSidebar: string;
    ctaTitleInline: string;
    ctaBodySidebar: string;
    ctaBodyInline: string;
    ctaPrimarySignedIn: string;
    ctaPrimarySignedOut: string;
    ctaSecondary: string;
    ctaBullet1: string;
    ctaBullet2: string;
    ctaBullet3: string;
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
    | "flat-illustration"
    | "cream-poster"
    | "highlighter-notes"
    | "grid-icons"
    | "proof-poster"
    | "data-ring"
    | "wireframe-breakdown",
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
  post: PostMessages;
  products: ProductsMessages;
  wardrobe: WardrobeMessages;
  textStyles: {
    title: string;
    subtitle: string;
    systemSection: string;
    mineSection: string;
    mineEmpty: string;
    create: string;
    createSubmit: string;
    createFromLookTitle: string;
    createFromLookIntro: string;
    useTemplate: string;
    name: string;
    namePlaceholder: string;
    image: string;
    imageHint: string;
    replaceImage: string;
    delete: string;
    deleteConfirm: string;
    systemBadge: string;
    saving: string;
    saved: string;
    open: string;
    updated: string;
    backToList: string;
    templateBadge: string;
    lookLineLabel: string;
    lookLineHint: string;
    generateSample: string;
    previewGenerating: string;
    chatTitle: string;
    chatEmpty: string;
    chatLocked: string;
    chatLockedCta: string;
  };
  production: ProductionMessages;
  tasksPage: TasksPageMessages;
  pickers: PickersMessages;
  errors: ErrorsMessages;
  directors: DirectorsMessages;
  signupPromo: {
    badge: string;
    banner: string;
    locked: string;
    cta: string;
    ctaPricing: string;
    ctaBilling: string;
    giftBadge: string;
    packBonus: string;
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
