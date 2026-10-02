// Tiles in visual grid order (top-left to bottom-right).
// Play starts at the bottom-left and snakes across each row:
// 1-10 left-to-right, 11-20 right-to-left, and so on.
export const SERPENTINE_TILES = Array.from({ length: 10 }, (_, visualRow) => {
  const boardRow = 9 - visualRow;
  const firstTile = boardRow * 10 + 1;
  const row = Array.from({ length: 10 }, (_, column) => firstTile + column);
  return boardRow % 2 === 0 ? row : row.reverse();
}).flat();
