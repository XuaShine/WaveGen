import { SignalItem } from '../types';

export interface FoldedRange {
  start: number; // inclusive
  end: number; // inclusive
  count: number;
  reason?: string;
}

export type CycleDisplayItem =
  | {
      type: 'single';
      cycleIndex: number;
    }
  | {
      type: 'folded';
      start: number;
      end: number;
      count: number;
      label: string;
      reason?: string;
    };

/**
 * Automatically detects ranges of contiguous cycles (length >= 3) where signals
 * are essentially static (continuation '.' or unchanging state across all active signals).
 */
export function detectFoldableRanges(
  signals: SignalItem[],
  totalCycles: number
): FoldedRange[] {
  const activeSignals = signals.filter((s) => !s.isSpacer && s.wave && s.wave.length > 0);
  if (activeSignals.length === 0 || totalCycles < 4) return [];

  // Determine for each cycle c if it is continuation or unchanged
  const isCycleStatic: boolean[] = [];

  for (let c = 0; c < totalCycles; c++) {
    let allStatic = true;
    for (const sig of activeSignals) {
      const period = sig.period && sig.period > 0 ? sig.period : 1;
      const sigCycle = Math.floor(c / period);
      const ch = sig.wave[sigCycle] || '.';
      // If signal explicitly has an active edge/transition here, it's not static
      // '.' is continuation hold. If c > 0 and char is '.', it's static.
      // If c > 0 and char equals previous cycle char, it's unchanging.
      if (c === 0) {
        allStatic = false;
        break;
      }
      const prevSigCycle = Math.floor((c - 1) / period);
      const prevCh = sig.wave[prevSigCycle] || '.';

      const isContinuation = ch === '.';
      const isUnchanging = ch === prevCh;

      if (!isContinuation && !isUnchanging) {
        allStatic = false;
        break;
      }
    }
    isCycleStatic.push(allStatic);
  }

  // Find contiguous runs of true with length >= 3
  const ranges: FoldedRange[] = [];
  let runStart = -1;

  for (let c = 0; c < totalCycles; c++) {
    if (isCycleStatic[c]) {
      if (runStart === -1) runStart = c;
    } else {
      if (runStart !== -1) {
        const count = c - runStart;
        if (count >= 3) {
          ranges.push({
            start: runStart,
            end: c - 1,
            count,
            reason: `${count} 拍连续保持`,
          });
        }
        runStart = -1;
      }
    }
  }

  if (runStart !== -1) {
    const count = totalCycles - runStart;
    if (count >= 3) {
      ranges.push({
        start: runStart,
        end: totalCycles - 1,
        count,
        reason: `${count} 拍连续保持`,
      });
    }
  }

  return ranges;
}

/**
 * Builds the sequence of display items (single cycle or collapsed range) for grid rendering.
 */
export function buildCycleDisplayItems(
  totalCycles: number,
  activeFoldedRanges: FoldedRange[]
): CycleDisplayItem[] {
  // Sort and normalize folded ranges
  const sorted = [...activeFoldedRanges]
    .filter((r) => r.start <= r.end && r.start >= 0 && r.end < totalCycles)
    .sort((a, b) => a.start - b.start);

  // Merge overlapping or adjacent ranges
  const merged: FoldedRange[] = [];
  for (const r of sorted) {
    if (merged.length === 0) {
      merged.push({ ...r, count: r.end - r.start + 1 });
    } else {
      const prev = merged[merged.length - 1];
      if (r.start <= prev.end + 1) {
        prev.end = Math.max(prev.end, r.end);
        prev.count = prev.end - prev.start + 1;
        prev.reason = `${prev.count} 拍连续保持`;
      } else {
        merged.push({ ...r, count: r.end - r.start + 1 });
      }
    }
  }

  const items: CycleDisplayItem[] = [];
  let c = 0;

  while (c < totalCycles) {
    const foldMatch = merged.find((m) => m.start === c);
    if (foldMatch) {
      items.push({
        type: 'folded',
        start: foldMatch.start,
        end: foldMatch.end,
        count: foldMatch.count,
        label: `${foldMatch.start}..${foldMatch.end}`,
        reason: foldMatch.reason,
      });
      c = foldMatch.end + 1;
    } else {
      items.push({
        type: 'single',
        cycleIndex: c,
      });
      c++;
    }
  }

  return items;
}
