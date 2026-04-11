/**
 * TableCorners — Decorative corner accents for premium table feel
 */

import { memo } from 'react';

export const TableCorners = memo(function TableCorners() {
  return (
    <>
      <div className="table-corner table-corner--tl" />
      <div className="table-corner table-corner--tr" />
      <div className="table-corner table-corner--bl" />
      <div className="table-corner table-corner--br" />
    </>
  );
});
