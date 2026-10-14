// One app-level Freesound OAuth grant. Sound listing comes later.
export type FreesoundGrantDoc = {
  _id: "app";
  accessToken: string;
  refreshToken: string;
  scope: string;
  expiresAt: Date;
  state: string | null;
  updatedAt: Date;
};

export type FreesoundToken = {
  accessToken: string;
  refreshToken: string;
  scope: string;
  expiresIn: number;
};
