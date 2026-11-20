import type { AspectRatio } from "@/model/project";

// Snapshot of this OpenRouter account's image and video generation models.
// Taken from GET /api/v1/images/models and GET /api/v1/videos/models.
// openai/gpt-5-image and openai/gpt-5-image-mini are omitted on purpose.

export type OpenRouterAccountImageModel = {
  id: string;
  name: string;
  refMin: number;
  refMax: number;
  aspects: string[];
  resolutions: string[];
};

export type OpenRouterAccountVideoModel = {
  id: string;
  name: string;
  resolutions: string[];
  aspects: string[];
  durations: number[];
  frames: Array<"first_frame" | "last_frame">;
  /** Lip-sync avatar: portrait plus a voice track. */
  avatar: boolean;
  /** Edits or upscales an input video instead of a start frame. */
  videoIn: boolean;
};

export const OPENROUTER_ACCOUNT_IMAGE_MODELS: readonly OpenRouterAccountImageModel[] = [
  {
    "id": "microsoft/mai-image-2.7-flash",
    "name": "Microsoft AI: MAI-Image-2.7 Flash",
    "refMin": 0,
    "refMax": 5,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "3:2",
      "2:3"
    ],
    "resolutions": []
  },
  {
    "id": "microsoft/mai-image-2.7",
    "name": "Microsoft AI: MAI-Image-2.7",
    "refMin": 0,
    "refMax": 5,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "3:2",
      "2:3"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4.1-flash-v2",
    "name": "Recraft: Recraft V4.1 Flash V2",
    "refMin": 0,
    "refMax": 0,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "tencent/hy-world-2.1-panorama",
    "name": "Tencent: HY-World 2.1 Panorama",
    "refMin": 0,
    "refMax": 0,
    "aspects": [],
    "resolutions": []
  },
  {
    "id": "bytedance-seed/seedream-5-5",
    "name": "ByteDance Seed: Seedream 5.5",
    "refMin": 0,
    "refMax": 10,
    "aspects": [
      "1:1",
      "1:2",
      "2:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "9:19.5",
      "19.5:9",
      "9:20",
      "20:9",
      "9:21",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "1.5K",
      "2K"
    ]
  },
  {
    "id": "minimax/minimax-h3-image-highspeed",
    "name": "MiniMax: MiniMax H3 Image Highspeed",
    "refMin": 0,
    "refMax": 16,
    "aspects": [
      "1:1",
      "1:2",
      "1:3",
      "2:1",
      "2:3",
      "3:1",
      "2.35:1",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:2",
      "5:4",
      "5:7",
      "7:5",
      "9:16",
      "16:9",
      "9:19.5",
      "19.5:9",
      "9:20",
      "20:9",
      "9:21",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "minimax/minimax-h3-image",
    "name": "MiniMax: MiniMax H3 Image",
    "refMin": 0,
    "refMax": 16,
    "aspects": [
      "1:1",
      "1:2",
      "1:3",
      "2:1",
      "2:3",
      "3:1",
      "2.35:1",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:2",
      "5:4",
      "5:7",
      "7:5",
      "9:16",
      "16:9",
      "9:19.5",
      "19.5:9",
      "9:20",
      "20:9",
      "9:21",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "openai/gpt-image-2.6-sunburst",
    "name": "OpenAI: GPT Image 2.6 Sunburst",
    "refMin": 0,
    "refMax": 16,
    "aspects": [
      "1:1",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "21:9",
      "4:5",
      "5:4",
      "2:1",
      "1:2",
      "3:1",
      "1:3"
    ],
    "resolutions": []
  },
  {
    "id": "openai/gpt-image-2.6-flare",
    "name": "OpenAI: GPT Image 2.6 Flare",
    "refMin": 0,
    "refMax": 16,
    "aspects": [
      "1:1",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "21:9",
      "4:5",
      "5:4",
      "2:1",
      "1:2",
      "3:1",
      "1:3"
    ],
    "resolutions": []
  },
  {
    "id": "sourceful/riverflow-v2.6-pro",
    "name": "Sourceful: Riverflow V2.6 Pro",
    "refMin": 0,
    "refMax": 10,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3",
      "5:4",
      "4:5",
      "16:9",
      "9:16",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "qwen/qwen-image-2.1-turbo",
    "name": "Qwen: Qwen Image 2.1 Turbo",
    "refMin": 0,
    "refMax": 10,
    "aspects": [
      "1:1",
      "1:2",
      "1:4",
      "2:1",
      "2:3",
      "3:2",
      "3:4",
      "4:1",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9",
      "9:21"
    ],
    "resolutions": [
      "1K",
      "2K"
    ]
  },
  {
    "id": "qwen/qwen-image-2.1-pro",
    "name": "Qwen: Qwen Image 2.1 Pro",
    "refMin": 0,
    "refMax": 10,
    "aspects": [
      "1:1",
      "1:2",
      "1:4",
      "2:1",
      "2:3",
      "3:2",
      "3:4",
      "4:1",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9",
      "9:21"
    ],
    "resolutions": [
      "1K",
      "2K"
    ]
  },
  {
    "id": "krea/k3-edit",
    "name": "Krea: K3 Edit",
    "refMin": 1,
    "refMax": 8,
    "aspects": [
      "1:1",
      "4:3",
      "3:2",
      "16:9",
      "4:5",
      "2:3",
      "9:16"
    ],
    "resolutions": [
      "1K",
      "2K"
    ]
  },
  {
    "id": "black-forest-labs/flux-3-image-klein",
    "name": "Black Forest Labs: FLUX 3 Image Klein",
    "refMin": 0,
    "refMax": 10,
    "aspects": [
      "21:9",
      "2:1",
      "16:9",
      "3:2",
      "7:5",
      "4:3",
      "5:4",
      "1:1",
      "4:5",
      "3:4",
      "5:7",
      "2:3",
      "9:16",
      "1:2",
      "9:21"
    ],
    "resolutions": [
      "768",
      "1K",
      "1.5K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "google/gemini-nano-banana-2.1",
    "name": "Google: Nano Banana 2.1",
    "refMin": 0,
    "refMax": 14,
    "aspects": [
      "1:1",
      "1:4",
      "1:8",
      "2:3",
      "3:2",
      "3:4",
      "4:1",
      "4:3",
      "4:5",
      "5:4",
      "8:1",
      "9:16",
      "16:9",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "tencent/hy-image-v3.5-preview",
    "name": "Tencent: Hy Image 3.5 Preview",
    "refMin": 0,
    "refMax": 20,
    "aspects": [
      "1:1",
      "1:2",
      "1:4",
      "2:1",
      "2:3",
      "3:2",
      "3:4",
      "4:1",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9"
    ],
    "resolutions": [
      "1K",
      "1.5K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "bytedance-seed/seedream-5-0-flash",
    "name": "ByteDance Seed: Seedream 5.0 Flash",
    "refMin": 0,
    "refMax": 14,
    "aspects": [
      "1:1",
      "1:2",
      "2:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "9:19.5",
      "19.5:9",
      "9:20",
      "20:9",
      "9:21",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "1.5K",
      "2K"
    ]
  },
  {
    "id": "black-forest-labs/flux-3-image",
    "name": "Black Forest Labs: FLUX 3 Image",
    "refMin": 0,
    "refMax": 10,
    "aspects": [
      "21:9",
      "2:1",
      "16:9",
      "3:2",
      "7:5",
      "4:3",
      "5:4",
      "1:1",
      "4:5",
      "3:4",
      "5:7",
      "2:3",
      "9:16",
      "1:2",
      "9:21"
    ],
    "resolutions": [
      "768",
      "1K",
      "1.5K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "recraft/recraft-v4.1-flash",
    "name": "Recraft: Recraft V4.1 Flash",
    "refMin": 0,
    "refMax": 0,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "openai/gpt-image-2.5-sunburst",
    "name": "OpenAI: GPT Image 2.5 Sunburst",
    "refMin": 0,
    "refMax": 16,
    "aspects": [
      "1:1",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "21:9",
      "4:5",
      "5:4",
      "2:1",
      "1:2",
      "3:1",
      "1:3"
    ],
    "resolutions": []
  },
  {
    "id": "openai/gpt-image-2.5-flare",
    "name": "OpenAI: GPT Image 2.5 Flare",
    "refMin": 0,
    "refMax": 16,
    "aspects": [
      "1:1",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "21:9",
      "4:5",
      "5:4",
      "2:1",
      "1:2",
      "3:1",
      "1:3"
    ],
    "resolutions": []
  },
  {
    "id": "microsoft/mai-image-2.6",
    "name": "Microsoft AI: MAI-Image-2.6",
    "refMin": 0,
    "refMax": 5,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "3:2",
      "2:3"
    ],
    "resolutions": []
  },
  {
    "id": "microsoft/mai-image-2.6-flash",
    "name": "Microsoft AI: MAI-Image-2.6 Flash",
    "refMin": 0,
    "refMax": 5,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "3:2",
      "2:3"
    ],
    "resolutions": []
  },
  {
    "id": "meta/muse-image",
    "name": "Meta: Muse Image",
    "refMin": 0,
    "refMax": 0,
    "aspects": [],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4-styles-pro",
    "name": "Recraft: Recraft V4 Styles Pro",
    "refMin": 1,
    "refMax": 10,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4-styles-vector",
    "name": "Recraft: Recraft V4 Styles Vector",
    "refMin": 1,
    "refMax": 10,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4-styles-pro-vector",
    "name": "Recraft: Recraft V4 Styles Pro Vector",
    "refMin": 1,
    "refMax": 10,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4-styles",
    "name": "Recraft: Recraft V4 Styles",
    "refMin": 1,
    "refMax": 10,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "bytedance-seed/seedream-5-0-lite",
    "name": "ByteDance Seed: Seedream 5.0 Lite",
    "refMin": 0,
    "refMax": 14,
    "aspects": [
      "1:1",
      "1:2",
      "2:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "9:19.5",
      "19.5:9",
      "9:20",
      "20:9",
      "9:21",
      "21:9"
    ],
    "resolutions": [
      "2K",
      "4K"
    ]
  },
  {
    "id": "bytedance-seed/seedream-5-0-pro",
    "name": "ByteDance Seed: Seedream 5.0 Pro",
    "refMin": 0,
    "refMax": 14,
    "aspects": [
      "1:1",
      "1:2",
      "2:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "9:19.5",
      "19.5:9",
      "9:20",
      "20:9",
      "9:21",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "1.5K",
      "2K"
    ]
  },
  {
    "id": "x-ai/grok-imagine-image-2.0",
    "name": "xAI: Grok Imagine Image 2.0",
    "refMin": 0,
    "refMax": 5,
    "aspects": [
      "1:1",
      "3:4",
      "4:3",
      "9:16",
      "16:9",
      "2:3",
      "3:2",
      "9:19.5",
      "19.5:9",
      "9:20",
      "20:9",
      "1:2",
      "2:1",
      "21:9",
      "5:2"
    ],
    "resolutions": [
      "1K",
      "2K"
    ]
  },
  {
    "id": "qwen/qwen-image-3-pro",
    "name": "Qwen: Qwen Image 3 Pro",
    "refMin": 0,
    "refMax": 3,
    "aspects": [
      "1:1",
      "1:2",
      "1:4",
      "2:1",
      "2:3",
      "3:2",
      "3:4",
      "4:1",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9"
    ],
    "resolutions": [
      "1K",
      "2K"
    ]
  },
  {
    "id": "qwen/qwen-image-3",
    "name": "Qwen: Qwen Image 3",
    "refMin": 0,
    "refMax": 3,
    "aspects": [
      "1:1",
      "1:2",
      "1:4",
      "2:1",
      "2:3",
      "3:2",
      "3:4",
      "4:1",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9"
    ],
    "resolutions": [
      "1K",
      "2K"
    ]
  },
  {
    "id": "microsoft/mai-image-2.5-pro",
    "name": "Microsoft AI: MAI-Image-2.5 Pro",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "3:2",
      "2:3"
    ],
    "resolutions": []
  },
  {
    "id": "krea/krea-2-large",
    "name": "Krea: Krea 2 Large",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "4:3",
      "3:2",
      "16:9",
      "2.35:1",
      "4:5",
      "3:4",
      "2:3",
      "9:16"
    ],
    "resolutions": [
      "1K"
    ]
  },
  {
    "id": "krea/krea-2-medium",
    "name": "Krea: Krea 2 Medium",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "4:3",
      "3:2",
      "16:9",
      "2.35:1",
      "4:5",
      "3:4",
      "2:3",
      "9:16"
    ],
    "resolutions": [
      "1K"
    ]
  },
  {
    "id": "krea/krea-2-medium-turbo",
    "name": "Krea: Krea 2 Medium Turbo",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "4:3",
      "3:2",
      "16:9",
      "2.35:1",
      "4:5",
      "3:4",
      "2:3",
      "9:16"
    ],
    "resolutions": [
      "1K"
    ]
  },
  {
    "id": "google/gemini-3.1-flash-lite-image",
    "name": "Google: Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)",
    "refMin": 0,
    "refMax": 14,
    "aspects": [
      "1:1",
      "1:4",
      "1:8",
      "2:3",
      "3:2",
      "3:4",
      "4:1",
      "4:3",
      "4:5",
      "5:4",
      "8:1",
      "9:16",
      "16:9",
      "21:9"
    ],
    "resolutions": [
      "1K"
    ]
  },
  {
    "id": "openai/gpt-image-2",
    "name": "OpenAI: GPT Image 2",
    "refMin": 0,
    "refMax": 16,
    "aspects": [
      "1:1",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "21:9",
      "4:5",
      "5:4",
      "2:1",
      "1:2",
      "3:1",
      "1:3"
    ],
    "resolutions": []
  },
  {
    "id": "openai/gpt-image-1-mini",
    "name": "OpenAI: GPT Image 1 Mini",
    "refMin": 0,
    "refMax": 16,
    "aspects": [
      "1:1",
      "3:2",
      "2:3"
    ],
    "resolutions": []
  },
  {
    "id": "openai/gpt-image-1",
    "name": "OpenAI: GPT Image 1",
    "refMin": 0,
    "refMax": 16,
    "aspects": [
      "1:1",
      "3:2",
      "2:3"
    ],
    "resolutions": []
  },
  {
    "id": "google/gemini-3.1-flash-image",
    "name": "Google: Nano Banana 2 (Gemini 3.1 Flash Image)",
    "refMin": 0,
    "refMax": 14,
    "aspects": [
      "1:1",
      "1:4",
      "1:8",
      "2:3",
      "3:2",
      "3:4",
      "4:1",
      "4:3",
      "4:5",
      "5:4",
      "8:1",
      "9:16",
      "16:9",
      "21:9"
    ],
    "resolutions": [
      "512",
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "google/gemini-3-pro-image",
    "name": "Google: Nano Banana Pro (Gemini 3 Pro Image)",
    "refMin": 0,
    "refMax": 14,
    "aspects": [
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "sourceful/riverflow-v2.5-pro",
    "name": "Sourceful: Riverflow V2.5 Pro",
    "refMin": 0,
    "refMax": 10,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3",
      "16:9",
      "9:16",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "sourceful/riverflow-v2.5-fast",
    "name": "Sourceful: Riverflow V2.5 Fast",
    "refMin": 0,
    "refMax": 4,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3",
      "16:9",
      "9:16",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "2K"
    ]
  },
  {
    "id": "microsoft/mai-image-2.5",
    "name": "Microsoft AI: MAI-Image-2.5",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "3:2",
      "2:3"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4.1-pro-vector",
    "name": "Recraft: Recraft V4.1 Pro Vector",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4.1-vector",
    "name": "Recraft: Recraft V4.1 Vector",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4.1-utility-pro",
    "name": "Recraft: Recraft V4.1 Utility Pro",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4.1-utility",
    "name": "Recraft: Recraft V4.1 Utility",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4.1-pro",
    "name": "Recraft: Recraft V4.1 Pro",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4.1",
    "name": "Recraft: Recraft V4.1",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4-pro-vector",
    "name": "Recraft: Recraft V4 Pro Vector",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4-vector",
    "name": "Recraft: Recraft V4 Vector",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4-pro",
    "name": "Recraft: Recraft V4 Pro",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v4",
    "name": "Recraft: Recraft V4",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "5:4",
      "4:5",
      "16:9",
      "9:16"
    ],
    "resolutions": []
  },
  {
    "id": "recraft/recraft-v3",
    "name": "Recraft: Recraft V3",
    "refMin": 0,
    "refMax": 1,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "2:1",
      "1:2",
      "3:2",
      "2:3",
      "5:4",
      "4:5"
    ],
    "resolutions": []
  },
  {
    "id": "openai/gpt-5.4-image-2",
    "name": "OpenAI: GPT-5.4 Image 2",
    "refMin": 0,
    "refMax": 16,
    "aspects": [
      "1:1",
      "3:2",
      "2:3",
      "4:3",
      "3:4",
      "16:9",
      "9:16",
      "21:9",
      "4:5",
      "5:4"
    ],
    "resolutions": []
  },
  {
    "id": "google/gemini-3.1-flash-image-preview",
    "name": "Google: Nano Banana 2 (Gemini 3.1 Flash Image Preview)",
    "refMin": 0,
    "refMax": 14,
    "aspects": [
      "1:1",
      "1:4",
      "1:8",
      "2:3",
      "3:2",
      "3:4",
      "4:1",
      "4:3",
      "4:5",
      "5:4",
      "8:1",
      "9:16",
      "16:9",
      "21:9"
    ],
    "resolutions": [
      "512",
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "sourceful/riverflow-v2-pro",
    "name": "Sourceful: Riverflow V2 Pro",
    "refMin": 0,
    "refMax": 10,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3",
      "16:9",
      "9:16",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "sourceful/riverflow-v2-fast",
    "name": "Sourceful: Riverflow V2 Fast",
    "refMin": 0,
    "refMax": 4,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3",
      "16:9",
      "9:16",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "black-forest-labs/flux.2-klein-4b",
    "name": "Black Forest Labs: FLUX.2 Klein 4B",
    "refMin": 0,
    "refMax": 4,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3",
      "16:9",
      "9:16",
      "21:9"
    ],
    "resolutions": []
  },
  {
    "id": "bytedance-seed/seedream-4.5",
    "name": "ByteDance Seed: Seedream 4.5",
    "refMin": 0,
    "refMax": 14,
    "aspects": [
      "1:1",
      "1:2",
      "2:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "9:19.5",
      "19.5:9",
      "9:20",
      "20:9",
      "9:21",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "black-forest-labs/flux.2-max",
    "name": "Black Forest Labs: FLUX.2 Max",
    "refMin": 0,
    "refMax": 8,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3",
      "16:9",
      "9:16",
      "21:9"
    ],
    "resolutions": []
  },
  {
    "id": "black-forest-labs/flux.2-flex",
    "name": "Black Forest Labs: FLUX.2 Flex",
    "refMin": 0,
    "refMax": 8,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3",
      "16:9",
      "9:16",
      "21:9"
    ],
    "resolutions": []
  },
  {
    "id": "black-forest-labs/flux.2-pro",
    "name": "Black Forest Labs: FLUX.2 Pro",
    "refMin": 0,
    "refMax": 8,
    "aspects": [
      "1:1",
      "4:3",
      "3:4",
      "4:5",
      "3:2",
      "2:3",
      "16:9",
      "9:16",
      "21:9"
    ],
    "resolutions": []
  },
  {
    "id": "google/gemini-3-pro-image-preview",
    "name": "Google: Nano Banana Pro (Gemini 3 Pro Image Preview)",
    "refMin": 0,
    "refMax": 14,
    "aspects": [
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9"
    ],
    "resolutions": [
      "1K",
      "2K",
      "4K"
    ]
  },
  {
    "id": "google/gemini-2.5-flash-image",
    "name": "Google: Nano Banana (Gemini 2.5 Flash Image)",
    "refMin": 0,
    "refMax": 3,
    "aspects": [
      "1:1",
      "2:3",
      "3:2",
      "3:4",
      "4:3",
      "4:5",
      "5:4",
      "9:16",
      "16:9",
      "21:9"
    ],
    "resolutions": []
  }
];

export const OPENROUTER_ACCOUNT_VIDEO_MODELS: readonly OpenRouterAccountVideoModel[] = [
  {
    "id": "heygen/heygen-avatar-6-turbo",
    "name": "HeyGen: Avatar 6 Turbo",
    "resolutions": [
      "1080p",
      "2K"
    ],
    "aspects": [],
    "durations": [],
    "frames": [],
    "avatar": true,
    "videoIn": false
  },
  {
    "id": "heygen/heygen-avatar-6",
    "name": "HeyGen: Avatar 6",
    "resolutions": [
      "1080p",
      "2K"
    ],
    "aspects": [],
    "durations": [],
    "frames": [],
    "avatar": true,
    "videoIn": false
  },
  {
    "id": "bytedance/seedance-2.5-flash",
    "name": "ByteDance: Seedance 2.5 Flash",
    "resolutions": [
      "480p",
      "720p"
    ],
    "aspects": [
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16",
      "21:9"
    ],
    "durations": [
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "google/gemini-omni-1.2-flash",
    "name": "Google: Gemini Omni 1.2 Flash",
    "resolutions": [
      "720p",
      "1080p",
      "4K",
      "360p"
    ],
    "aspects": [
      "16:9",
      "9:16"
    ],
    "durations": [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "google/gemini-omni-1.1-flash",
    "name": "Google: Gemini Omni 1.1 Flash",
    "resolutions": [
      "720p",
      "1080p",
      "4K",
      "360p"
    ],
    "aspects": [
      "16:9",
      "9:16"
    ],
    "durations": [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "tbc/mischief-1",
    "name": "TBC: mischief 1",
    "resolutions": [
      "480p",
      "720p"
    ],
    "aspects": [
      "16:9"
    ],
    "durations": [
      3,
      5
    ],
    "frames": [
      "first_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "x-ai/grok-imagine-video-1.5-lite",
    "name": "SpaceXSI: Grok Imagine Video 1.5 Lite",
    "resolutions": [
      "480p",
      "720p",
      "1080p"
    ],
    "aspects": [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3",
      "21:9",
      "5:2"
    ],
    "durations": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "heygen/heygen-video-1",
    "name": "HeyGen: HeyGen Video",
    "resolutions": [
      "480p",
      "768p",
      "1080p",
      "2K"
    ],
    "aspects": [
      "21:9",
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],
    "durations": [
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30
    ],
    "frames": [
      "first_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "black-forest-labs/flux-video-edit",
    "name": "Black Forest Labs: FLUX Video Edit",
    "resolutions": [],
    "aspects": [],
    "durations": [],
    "frames": [],
    "avatar": false,
    "videoIn": true
  },
  {
    "id": "minimax/hailuo-3-max",
    "name": "MiniMax: H3 Max",
    "resolutions": [
      "768p",
      "480p"
    ],
    "aspects": [
      "21:9",
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],
    "durations": [
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "alibaba/wan-3.0-prime",
    "name": "Alibaba: Wan 3.0 Prime",
    "resolutions": [
      "480p",
      "720p",
      "1080p"
    ],
    "aspects": [
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16",
      "21:9"
    ],
    "durations": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "alibaba/wan-3.0",
    "name": "Alibaba: Wan 3.0",
    "resolutions": [
      "480p",
      "720p",
      "1080p"
    ],
    "aspects": [
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16",
      "21:9"
    ],
    "durations": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "heygen/avatar-iv",
    "name": "HeyGen: Avatar IV",
    "resolutions": [
      "720p",
      "1080p"
    ],
    "aspects": [
      "16:9",
      "9:16",
      "1:1"
    ],
    "durations": [],
    "frames": [],
    "avatar": true,
    "videoIn": false
  },
  {
    "id": "black-forest-labs/flux-video-upscale",
    "name": "Black Forest Labs: FLUX Video Upscale",
    "resolutions": [],
    "aspects": [],
    "durations": [],
    "frames": [],
    "avatar": false,
    "videoIn": true
  },
  {
    "id": "bytedance/seedance-2.0-mini",
    "name": "ByteDance: Seedance 2.0 Mini",
    "resolutions": [
      "480p",
      "720p"
    ],
    "aspects": [
      "1:1",
      "3:4",
      "9:16",
      "4:3",
      "16:9",
      "21:9",
      "9:21"
    ],
    "durations": [
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "bytedance/seedance-2.5",
    "name": "ByteDance: Seedance 2.5",
    "resolutions": [
      "480p",
      "720p",
      "1080p"
    ],
    "aspects": [
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16",
      "21:9"
    ],
    "durations": [
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
      21,
      22,
      23,
      24,
      25,
      26,
      27,
      28,
      29,
      30
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "black-forest-labs/flux-3-video",
    "name": "Black Forest Labs: FLUX 3 Video",
    "resolutions": [
      "720p",
      "1080p",
      "2K",
      "4K"
    ],
    "aspects": [
      "21:9",
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16",
      "2:1",
      "9:21"
    ],
    "durations": [
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "minimax/hailuo-3",
    "name": "MiniMax: H3",
    "resolutions": [
      "2K"
    ],
    "aspects": [
      "21:9",
      "16:9",
      "4:3",
      "1:1",
      "3:4",
      "9:16"
    ],
    "durations": [
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "runway/aleph-2",
    "name": "Runway: Aleph 2.0",
    "resolutions": [],
    "aspects": [
      "16:9",
      "4:3",
      "3:2",
      "1:1",
      "2:3",
      "3:4",
      "9:16",
      "21:9"
    ],
    "durations": [],
    "frames": [],
    "avatar": false,
    "videoIn": true
  },
  {
    "id": "runway/gen-4.5",
    "name": "Runway: Gen-4.5",
    "resolutions": [
      "720p"
    ],
    "aspects": [
      "16:9",
      "9:16"
    ],
    "durations": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10
    ],
    "frames": [
      "first_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "x-ai/grok-imagine-video-1.5",
    "name": "SpaceXSI: Grok Imagine Video 1.5",
    "resolutions": [
      "480p",
      "720p",
      "1080p"
    ],
    "aspects": [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3",
      "21:9",
      "5:2"
    ],
    "durations": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "alibaba/happyhorse-1.1",
    "name": "Alibaba: HappyHorse 1.1",
    "resolutions": [
      "720p",
      "1080p"
    ],
    "aspects": [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4",
      "21:9",
      "9:21"
    ],
    "durations": [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "alibaba/happyhorse-1.0",
    "name": "Alibaba: HappyHorse 1.0",
    "resolutions": [
      "720p",
      "1080p"
    ],
    "aspects": [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4",
      "21:9",
      "9:21"
    ],
    "durations": [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "x-ai/grok-imagine-video",
    "name": "SpaceXSI: Grok Imagine Video",
    "resolutions": [
      "480p",
      "720p"
    ],
    "aspects": [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4",
      "3:2",
      "2:3"
    ],
    "durations": [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "kwaivgi/kling-v3.0-pro",
    "name": "Kling: Video v3.0 Pro",
    "resolutions": [
      "720p"
    ],
    "aspects": [
      "16:9",
      "9:16",
      "1:1"
    ],
    "durations": [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "kwaivgi/kling-v3.0-std",
    "name": "Kling: Video v3.0 Standard",
    "resolutions": [
      "720p"
    ],
    "aspects": [
      "16:9",
      "9:16",
      "1:1"
    ],
    "durations": [
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "google/veo-3.1-fast",
    "name": "Google: Veo 3.1 Fast",
    "resolutions": [
      "720p",
      "1080p",
      "4K"
    ],
    "aspects": [
      "16:9",
      "9:16"
    ],
    "durations": [
      4,
      6,
      8
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "google/veo-3.1-lite",
    "name": "Google: Veo 3.1 Lite",
    "resolutions": [
      "720p",
      "1080p"
    ],
    "aspects": [
      "16:9",
      "9:16"
    ],
    "durations": [
      8,
      4,
      6
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "kwaivgi/kling-video-o1",
    "name": "Kling: Video O1",
    "resolutions": [
      "720p"
    ],
    "aspects": [
      "16:9",
      "9:16",
      "1:1"
    ],
    "durations": [
      5,
      10
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "minimax/hailuo-2.3",
    "name": "MiniMax: Hailuo 2.3",
    "resolutions": [
      "1080p"
    ],
    "aspects": [
      "16:9"
    ],
    "durations": [
      6,
      10
    ],
    "frames": [
      "first_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "bytedance/seedance-2.0-fast",
    "name": "ByteDance: Seedance 2.0 Fast",
    "resolutions": [
      "480p",
      "720p"
    ],
    "aspects": [
      "1:1",
      "3:4",
      "9:16",
      "4:3",
      "16:9",
      "21:9",
      "9:21"
    ],
    "durations": [
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "bytedance/seedance-2.0",
    "name": "ByteDance: Seedance 2.0",
    "resolutions": [
      "480p",
      "720p",
      "1080p",
      "4K"
    ],
    "aspects": [
      "1:1",
      "3:4",
      "9:16",
      "4:3",
      "16:9",
      "21:9",
      "9:21"
    ],
    "durations": [
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "alibaba/wan-2.7",
    "name": "Alibaba: Wan 2.7",
    "resolutions": [
      "720p",
      "1080p"
    ],
    "aspects": [
      "16:9",
      "9:16",
      "1:1",
      "4:3",
      "3:4"
    ],
    "durations": [
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "alibaba/wan-2.6",
    "name": "Alibaba: Wan 2.6",
    "resolutions": [
      "720p",
      "1080p"
    ],
    "aspects": [
      "16:9",
      "9:16"
    ],
    "durations": [
      5,
      10
    ],
    "frames": [
      "first_frame"
    ],
    "avatar": false,
    "videoIn": false
  },
  {
    "id": "google/veo-3.1",
    "name": "Google: Veo 3.1",
    "resolutions": [
      "720p",
      "1080p",
      "4K"
    ],
    "aspects": [
      "16:9",
      "9:16"
    ],
    "durations": [
      4,
      6,
      8
    ],
    "frames": [
      "first_frame",
      "last_frame"
    ],
    "avatar": false,
    "videoIn": false
  }
];

const RESOLUTION_PREFERENCE = ["720p", "1080p", "2K", "768p", "480p", "4K", "360p"];

function videoModel(model: string): OpenRouterAccountVideoModel | undefined {
  return OPENROUTER_ACCOUNT_VIDEO_MODELS.find((row) => row.id === model);
}

// Picks a resolution the model lists. Returns undefined when the model is not in the snapshot.
export function openRouterAccountVideoResolution(
  model: string,
  configured: string,
): string | undefined {
  const row = videoModel(model);
  if (!row || row.resolutions.length === 0) return undefined;
  if (row.resolutions.includes(configured)) return configured;
  return (
    RESOLUTION_PREFERENCE.find((value) => row.resolutions.includes(value)) ??
    row.resolutions[0]
  );
}

// Snaps a requested duration onto a value the model accepts.
export function openRouterAccountVideoDuration(
  model: string,
  seconds: number,
): number | undefined {
  const allowed = videoModel(model)?.durations.filter((value) => value > 0) ?? [];
  if (allowed.length === 0) return undefined;
  const rounded = Math.round(seconds);
  if (allowed.includes(rounded)) return rounded;
  return allowed.reduce((best, value) =>
    Math.abs(value - rounded) < Math.abs(best - rounded) ? value : best,
  );
}

const CANVAS_ASPECTS: readonly AspectRatio[] = ["16:9", "9:16", "1:1"];

// Keeps the requested canvas ratio when the model lists it, otherwise the closest 16:9 / 9:16 / 1:1.
export function openRouterAccountVideoAspect(
  model: string,
  ratio: AspectRatio,
): AspectRatio | undefined {
  const aspects = videoModel(model)?.aspects ?? [];
  if (aspects.length === 0) return undefined;
  if (aspects.includes(ratio)) return ratio;
  return CANVAS_ASPECTS.find((value) => aspects.includes(value));
}
