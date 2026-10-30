// Admin on/off switch for a hardcoded director. Off slugs stay in this list.
export type DirectorVisibility = {
  _id: "builtin";
  privateSlugs: string[];
  updatedAt: Date;
};
