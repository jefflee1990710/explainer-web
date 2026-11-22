// OpenRouter image and video SKUs fetched from the public catalog on 2026-11-22.
// User charges are these provider amounts times OPENROUTER_PRICE_MARKUP (1.5).
// Models absent from the catalog that day: alibaba/wan-2.6, alibaba/wan-2.7, black-forest-labs/flux-video-upscale, kwaivgi/kling-v3.0-pro, kwaivgi/kling-v3.0-std, kwaivgi/kling-video-o1, meta/muse-image.

export type OpenRouterImageSku =
  | {
      unit: "image";
      outputUsd: number;
      byResolution?: Record<string, number>;
      inputImageUsd: number;
    }
  | { unit: "megapixel"; usd: number }
  | {
      unit: "token";
      outputTokenUsd: number;
      tokens?: { "1K": number; "2K": number; "4K": number };
    };

export type OpenRouterVideoSku = {
  perSecondUsd?: number;
  perSecondByResolution?: Record<string, number>;
  referenceImageUsd?: number;
  videoTokenUsd?: number;
  videoTokenUsdByResolution?: Record<string, number>;
  minimumUsd?: number;
};

export const OPENROUTER_IMAGE_SKUS: Record<string, OpenRouterImageSku> = {
  "microsoft/mai-image-2.7-flash": {
    "unit": "token",
    "outputTokenUsd": 0.00001
  },
  "microsoft/mai-image-2.7": {
    "unit": "token",
    "outputTokenUsd": 0.000034
  },
  "recraft/recraft-v4.1-flash-v2": {
    "unit": "image",
    "outputUsd": 0.007,
    "inputImageUsd": 0
  },
  "tencent/hy-world-2.1-panorama": {
    "unit": "token",
    "outputTokenUsd": 0.0000016
  },
  "bytedance-seed/seedream-5-5": {
    "unit": "image",
    "outputUsd": 0.02,
    "byResolution": {
      "2K": 0.035
    },
    "inputImageUsd": 0.008
  },
  "minimax/minimax-h3-image-highspeed": {
    "unit": "token",
    "outputTokenUsd": 0.0000076
  },
  "minimax/minimax-h3-image": {
    "unit": "token",
    "outputTokenUsd": 0.0000038
  },
  "sourceful/riverflow-v2.6-pro": {
    "unit": "image",
    "outputUsd": 0.13,
    "byResolution": {
      "2K": 0.15,
      "4K": 0.17
    },
    "inputImageUsd": 0
  },
  "qwen/qwen-image-2.1-turbo": {
    "unit": "image",
    "outputUsd": 0.0184,
    "byResolution": {
      "1K": 0.0184,
      "2K": 0.0184
    },
    "inputImageUsd": 0
  },
  "qwen/qwen-image-2.1-pro": {
    "unit": "image",
    "outputUsd": 0.046,
    "byResolution": {
      "1K": 0.046,
      "2K": 0.046
    },
    "inputImageUsd": 0
  },
  "krea/k3-edit": {
    "unit": "image",
    "outputUsd": 0.03,
    "byResolution": {
      "2K": 0.06
    },
    "inputImageUsd": 0.02
  },
  "black-forest-labs/flux-3-image-klein": {
    "unit": "image",
    "outputUsd": 0.008,
    "byResolution": {
      "768": 0.008,
      "1K": 0.009,
      "1.5K": 0.011,
      "2K": 0.014,
      "4K": 0.036
    },
    "inputImageUsd": 0
  },
  "google/gemini-nano-banana-2.1": {
    "unit": "token",
    "outputTokenUsd": 0.00003,
    "tokens": {
      "1K": 1120,
      "2K": 1680,
      "4K": 3780
    }
  },
  "tencent/hy-image-v3.5-preview": {
    "unit": "token",
    "outputTokenUsd": 0.0000016
  },
  "bytedance-seed/seedream-5-0-flash": {
    "unit": "image",
    "outputUsd": 0.018,
    "inputImageUsd": 0
  },
  "black-forest-labs/flux-3-image": {
    "unit": "image",
    "outputUsd": 0.041,
    "byResolution": {
      "768": 0.041,
      "1K": 0.048,
      "1.5K": 0.07,
      "2K": 0.1,
      "4K": 0.607
    },
    "inputImageUsd": 0
  },
  "recraft/recraft-v4.1-flash": {
    "unit": "image",
    "outputUsd": 0.007,
    "inputImageUsd": 0
  },
  "microsoft/mai-image-2.6": {
    "unit": "token",
    "outputTokenUsd": 0.000038
  },
  "microsoft/mai-image-2.6-flash": {
    "unit": "token",
    "outputTokenUsd": 0.000019
  },
  "recraft/recraft-v4-styles-pro": {
    "unit": "image",
    "outputUsd": 0.1,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4-styles-vector": {
    "unit": "image",
    "outputUsd": 0.05,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4-styles-pro-vector": {
    "unit": "image",
    "outputUsd": 0.12,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4-styles": {
    "unit": "image",
    "outputUsd": 0.035,
    "inputImageUsd": 0
  },
  "bytedance-seed/seedream-5-0-lite": {
    "unit": "image",
    "outputUsd": 0.035,
    "inputImageUsd": 0
  },
  "bytedance-seed/seedream-5-0-pro": {
    "unit": "image",
    "outputUsd": 0.045,
    "byResolution": {
      "2K": 0.09
    },
    "inputImageUsd": 0.003
  },
  "x-ai/grok-imagine-image-2.0": {
    "unit": "image",
    "outputUsd": 0.04,
    "byResolution": {
      "LOW_1K": 0.04,
      "LOW_2K": 0.06,
      "MEDIUM_1K": 0.06,
      "MEDIUM_2K": 0.08
    },
    "inputImageUsd": 0.01
  },
  "qwen/qwen-image-3-pro": {
    "unit": "image",
    "outputUsd": 0.04,
    "byResolution": {
      "1K": 0.04,
      "2K": 0.075
    },
    "inputImageUsd": 0.003
  },
  "qwen/qwen-image-3": {
    "unit": "image",
    "outputUsd": 0.03,
    "byResolution": {
      "1K": 0.03,
      "2K": 0.03
    },
    "inputImageUsd": 0.003
  },
  "microsoft/mai-image-2.5-pro": {
    "unit": "token",
    "outputTokenUsd": 0.000108
  },
  "krea/krea-2-large": {
    "unit": "image",
    "outputUsd": 0.06,
    "byResolution": {
      "STYLE_REFERENCES": 0.065,
      "MOODBOARDS": 0.07
    },
    "inputImageUsd": 0
  },
  "krea/krea-2-medium": {
    "unit": "image",
    "outputUsd": 0.03,
    "byResolution": {
      "STYLE_REFERENCES": 0.035,
      "MOODBOARDS": 0.04
    },
    "inputImageUsd": 0
  },
  "krea/krea-2-medium-turbo": {
    "unit": "image",
    "outputUsd": 0.015,
    "byResolution": {
      "STYLE_REFERENCES": 0.0175,
      "MOODBOARDS": 0.02
    },
    "inputImageUsd": 0
  },
  "sourceful/riverflow-v2.5-pro": {
    "unit": "image",
    "outputUsd": 0.13,
    "byResolution": {
      "2K": 0.15,
      "4K": 0.17
    },
    "inputImageUsd": 0
  },
  "sourceful/riverflow-v2.5-fast": {
    "unit": "image",
    "outputUsd": 0.019,
    "byResolution": {
      "2K": 0.021
    },
    "inputImageUsd": 0
  },
  "microsoft/mai-image-2.5": {
    "unit": "token",
    "outputTokenUsd": 0.000047
  },
  "recraft/recraft-v4.1-pro-vector": {
    "unit": "image",
    "outputUsd": 0.3,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4.1-vector": {
    "unit": "image",
    "outputUsd": 0.08,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4.1-utility-pro": {
    "unit": "image",
    "outputUsd": 0.21,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4.1-utility": {
    "unit": "image",
    "outputUsd": 0.035,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4.1-pro": {
    "unit": "image",
    "outputUsd": 0.21,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4.1": {
    "unit": "image",
    "outputUsd": 0.035,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4-pro-vector": {
    "unit": "image",
    "outputUsd": 0.3,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4-vector": {
    "unit": "image",
    "outputUsd": 0.08,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4-pro": {
    "unit": "image",
    "outputUsd": 0.25,
    "inputImageUsd": 0
  },
  "recraft/recraft-v4": {
    "unit": "image",
    "outputUsd": 0.04,
    "inputImageUsd": 0
  },
  "recraft/recraft-v3": {
    "unit": "image",
    "outputUsd": 0.04,
    "inputImageUsd": 0
  },
  "sourceful/riverflow-v2-pro": {
    "unit": "image",
    "outputUsd": 0.15,
    "byResolution": {
      "2K": 0.15,
      "4K": 0.33
    },
    "inputImageUsd": 0
  },
  "sourceful/riverflow-v2-fast": {
    "unit": "image",
    "outputUsd": 0.02,
    "byResolution": {
      "2K": 0.04
    },
    "inputImageUsd": 0
  },
  "black-forest-labs/flux.2-klein-4b": {
    "unit": "megapixel",
    "usd": 0.014
  },
  "bytedance-seed/seedream-4.5": {
    "unit": "image",
    "outputUsd": 0.04,
    "inputImageUsd": 0
  },
  "black-forest-labs/flux.2-max": {
    "unit": "megapixel",
    "usd": 0.07
  },
  "black-forest-labs/flux.2-flex": {
    "unit": "megapixel",
    "usd": 0.06
  },
  "black-forest-labs/flux.2-pro": {
    "unit": "megapixel",
    "usd": 0.03
  }
};

export const OPENROUTER_VIDEO_SKUS: Record<string, OpenRouterVideoSku> = {
  "heygen/heygen-avatar-6-turbo": {
    "perSecondByResolution": {
      "2k": 0.0875,
      "1080p": 0.05
    }
  },
  "heygen/heygen-avatar-6": {
    "perSecondByResolution": {
      "2k": 0.145,
      "1080p": 0.1
    }
  },
  "bytedance/seedance-2.5-flash": {
    "videoTokenUsd": 0.000007
  },
  "tbc/mischief-1": {
    "perSecondByResolution": {
      "480p": 0.005,
      "720p": 0.01
    }
  },
  "x-ai/grok-imagine-video-1.5-lite": {
    "perSecondByResolution": {
      "480p": 0.02,
      "720p": 0.03,
      "1080p": 0.14
    }
  },
  "heygen/heygen-video-1": {
    "referenceImageUsd": 0.04,
    "perSecondByResolution": {
      "2k": 0.1,
      "480p": 0.02,
      "768p": 0.036,
      "1080p": 0.1
    }
  },
  "black-forest-labs/flux-video-edit": {
    "perSecondUsd": 0.03
  },
  "minimax/hailuo-3-max": {
    "perSecondUsd": 0.08,
    "perSecondByResolution": {
      "480p": 0.05,
      "768p": 0.08
    }
  },
  "alibaba/wan-3.0-prime": {
    "perSecondByResolution": {
      "480p": 0.068,
      "720p": 0.14,
      "1080p": 0.28
    }
  },
  "alibaba/wan-3.0": {
    "perSecondByResolution": {
      "480p": 0.05,
      "720p": 0.1,
      "1080p": 0.2
    }
  },
  "heygen/avatar-iv": {
    "perSecondUsd": 0.05
  },
  "bytedance/seedance-2.0-mini": {
    "videoTokenUsd": 0.0000035
  },
  "bytedance/seedance-2.5": {
    "videoTokenUsd": 0.0000107,
    "videoTokenUsdByResolution": {
      "1080p": 0.0000117
    }
  },
  "black-forest-labs/flux-3-video": {
    "perSecondUsd": 0.17,
    "perSecondByResolution": {
      "2k": 0.28,
      "4k": 0.41,
      "720p": 0.17,
      "1080p": 0.29
    }
  },
  "minimax/hailuo-3": {
    "perSecondUsd": 0.13,
    "referenceImageUsd": 0.04
  },
  "runway/aleph-2": {
    "perSecondUsd": 0.28,
    "minimumUsd": 0.56
  },
  "runway/gen-4.5": {
    "perSecondUsd": 0.12
  },
  "x-ai/grok-imagine-video-1.5": {
    "perSecondByResolution": {
      "480p": 0.08,
      "720p": 0.14,
      "1080p": 0.25
    }
  },
  "alibaba/happyhorse-1.1": {
    "perSecondByResolution": {
      "720p": 0.0988,
      "1080p": 0.1278
    }
  },
  "alibaba/happyhorse-1.0": {
    "perSecondByResolution": {
      "720p": 0.0988,
      "1080p": 0.1694
    }
  },
  "x-ai/grok-imagine-video": {
    "perSecondByResolution": {
      "480p": 0.05,
      "720p": 0.07
    }
  },
  "minimax/hailuo-2.3": {
    "perSecondUsd": 0.0817
  },
  "bytedance/seedance-2.0": {
    "videoTokenUsd": 0.000007,
    "videoTokenUsdByResolution": {
      "4k": 0.000004,
      "1080p": 0.0000077
    }
  },
  "bytedance/seedance-2.0-fast": {
    "videoTokenUsd": 0.0000056
  }
};
