// Editor / API shape for a sound effect. No MongoDB — safe for client bundles.
export type LibrarySound = {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  duration: number;
  username: string;
  tags: string[];
  license: string;
};
