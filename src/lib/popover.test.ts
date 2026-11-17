import { describe, expect, it } from 'vitest';
import { chooseAlignment } from './popover';

describe('chooseAlignment', () => {
  it('keeps the stylesheet default when both sides fit', () => {
    expect(chooseAlignment(400, 400, 208, true)).toBe('end');
    expect(chooseAlignment(400, 400, 208, false)).toBe('start');
  });

  it('flips away from the cramped side', () => {
    // The diff page: the button sits near the left edge of its pane.
    expect(chooseAlignment(1000, 90, 208, true)).toBe('start');
    // The tree options button sits near the right edge.
    expect(chooseAlignment(90, 900, 192, false)).toBe('end');
  });

  it('uses the roomier side when neither fits and the caller clamps the width', () => {
    expect(chooseAlignment(180, 90, 208, true)).toBe('start');
    expect(chooseAlignment(90, 180, 208, false)).toBe('end');
  });
});
