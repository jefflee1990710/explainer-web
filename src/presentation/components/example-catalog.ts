import type { StyleId } from "@/service/style";

export type ExampleItem = {
  id: string;
  src: string;
  poster: string;
  styleId: StyleId;
  aspect: "9:16" | "16:9" | "1:1";
  useKey: "landing.showcase.reel" | "landing.showcase.deck" | "landing.showcase.marketing";
  topicKey: "landing.showcase.scro" | "landing.showcase.product";
  titleKey: string;
  bodyKey: string;
};

// One finished example per explainer type. The mp4 is optional; the poster stays if it is missing.
export const EXAMPLE_ITEMS: ExampleItem[] = [
  {
    id: "scro-reel",
    src: "/showcase/scro-reel.mp4",
    poster: "/showcase/scro-reel.png",
    styleId: "doodle",
    aspect: "9:16",
    useKey: "landing.showcase.reel",
    topicKey: "landing.showcase.scro",
    titleKey: "examples.scroReel.title",
    bodyKey: "examples.scroReel.body",
  },
  {
    id: "scro-deck",
    src: "/showcase/scro-deck.mp4",
    poster: "/showcase/scro-deck.png",
    styleId: "flat-vector",
    aspect: "16:9",
    useKey: "landing.showcase.deck",
    topicKey: "landing.showcase.scro",
    titleKey: "examples.scroDeck.title",
    bodyKey: "examples.scroDeck.body",
  },
  {
    id: "product-marketing",
    src: "/showcase/product-marketing.mp4",
    poster: "/showcase/product-marketing.png",
    styleId: "clay",
    aspect: "1:1",
    useKey: "landing.showcase.marketing",
    topicKey: "landing.showcase.product",
    titleKey: "examples.productMarketing.title",
    bodyKey: "examples.productMarketing.body",
  },
  {
    id: "product-reel",
    src: "/showcase/product-reel.mp4",
    poster: "/showcase/product-reel.png",
    styleId: "pixel",
    aspect: "16:9",
    useKey: "landing.showcase.reel",
    topicKey: "landing.showcase.product",
    titleKey: "examples.productReel.title",
    bodyKey: "examples.productReel.body",
  },
];

export const EXAMPLE_FRAME: Record<ExampleItem["aspect"], { width: string; aspect: string }> = {
  "9:16": { width: "w-[min(16rem,70vw)]", aspect: "aspect-[9/16]" },
  "16:9": { width: "w-[min(28rem,78vw)]", aspect: "aspect-video" },
  "1:1": { width: "w-[min(18rem,70vw)]", aspect: "aspect-square" },
};
