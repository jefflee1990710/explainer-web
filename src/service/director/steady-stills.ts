// Style does not change the storyboard. Every clip still draws a start still and an end still.
export function usesSteadyStills(
  _skillSlug?: string,
  _style?: { id?: string; name?: string },
) {
  return false;
}

export function clipSkipsEndStill(_project: { skillSlug?: string; styleId?: string }) {
  return false;
}
