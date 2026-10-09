// Shared with composeBlueprintBoard so the card frame matches the saved image.
export const BLUEPRINT_BOARD_HEIGHT = 1024;
export const BLUEPRINT_BOARD_GUTTER = 48;
export const BLUEPRINT_BOARD_MARGIN = 48;
const INNER = BLUEPRINT_BOARD_HEIGHT - BLUEPRINT_BOARD_MARGIN * 2;
// Square portrait fills the inner square; the 9:16 full body is limited by that height.
const FULL_BODY_WIDTH = Math.round(INNER * (9 / 16));

export const BLUEPRINT_BOARD_WIDTH =
  BLUEPRINT_BOARD_MARGIN + INNER + BLUEPRINT_BOARD_GUTTER + FULL_BODY_WIDTH + BLUEPRINT_BOARD_MARGIN;
