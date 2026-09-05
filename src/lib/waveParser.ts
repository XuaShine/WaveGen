import { SignalItem, EdgeAnnotation, HeadFootConfig, DiagramConfig, WaveJson } from '../types';

/**
 * Builds a clean WaveJson object from UI state.
 */
export function buildWaveJson(
  signals: SignalItem[],
  edges: EdgeAnnotation[] = [],
  head?: HeadFootConfig,
  foot?: HeadFootConfig,
  config?: DiagramConfig
): WaveJson {
  const formatItem = (sig: SignalItem) => {
    if (sig.isSpacer) {
      return {};
    }

    const item: Record<string, unknown> = {
      name: sig.name,
      wave: sig.wave,
    };

    if (sig.data && sig.data.length > 0) {
      item.data = sig.data;
    }

    if (sig.period !== undefined && sig.period !== 1) {
      item.period = sig.period;
    }

    if (sig.phase !== undefined && sig.phase !== 0) {
      item.phase = sig.phase;
    }

    if (sig.node && sig.node.replace(/\./g, '').length > 0) {
      item.node = sig.node;
    }

    return item;
  };

  const signalArray: Array<any> = [];
  let currentGroup: { name: string; items: any[] } | null = null;

  signals.forEach((sig) => {
    const item = formatItem(sig);
    const grp = !sig.isSpacer && sig.group && sig.group.trim() ? sig.group.trim() : null;

    if (grp) {
      if (currentGroup && currentGroup.name === grp) {
        currentGroup.items.push(item);
      } else {
        if (currentGroup) {
          signalArray.push([currentGroup.name, ...currentGroup.items]);
        }
        currentGroup = { name: grp, items: [item] };
      }
    } else {
      if (currentGroup) {
        signalArray.push([currentGroup.name, ...currentGroup.items]);
        currentGroup = null;
      }
      signalArray.push(item);
    }
  });

  if (currentGroup) {
    signalArray.push([currentGroup.name, ...currentGroup.items]);
  }

  const edgeArray: string[] = edges
    .filter((e) => e.source && e.target)
    .map((e) => {
      const arrow = e.arrow || '->';
      const label = e.label?.trim() ? ` ${e.label.trim()}` : '';
      return `${e.source}${arrow}${e.target}${label}`;
    });

  const res: WaveJson = {
    signal: signalArray,
  };

  if (edgeArray.length > 0) {
    res.edge = edgeArray;
  }

  if (head && (head.text || head.tick !== undefined || head.every !== undefined || head.tock !== undefined)) {
    const cleanHead: Record<string, unknown> = {};
    if (head.text) cleanHead.text = head.text;
    if (head.tick !== undefined) cleanHead.tick = head.tick;
    if (head.every !== undefined) cleanHead.every = head.every;
    if (head.tock !== undefined) cleanHead.tock = head.tock;
    res.head = cleanHead;
  }

  if (foot && (foot.text || foot.tock !== undefined || foot.every !== undefined || foot.tick !== undefined)) {
    const cleanFoot: Record<string, unknown> = {};
    if (foot.text) cleanFoot.text = foot.text;
    if (foot.tock !== undefined) cleanFoot.tock = foot.tock;
    if (foot.tick !== undefined) cleanFoot.tick = foot.tick;
    if (foot.every !== undefined) cleanFoot.every = foot.every;
    res.foot = cleanFoot;
  }

  if (config) {
    res.config = { ...config };
  }

  return res;
}

/**
 * Parses raw JSON / WaveJSON input back into structured UI state.
 */
export function parseWaveJson(rawJson: string | object): {
  signals: SignalItem[];
  edges: EdgeAnnotation[];
  head: HeadFootConfig;
  foot: HeadFootConfig;
  config: DiagramConfig;
  error?: string;
} {
  try {
    let parsed: any;
    if (typeof rawJson === 'string') {
      // Clean up common JS format variations (e.g. unquoted keys or trailing commas if any)
      parsed = JSON.parse(rawJson);
    } else {
      parsed = rawJson;
    }

    if (!parsed || !Array.isArray(parsed.signal)) {
      return {
        signals: [],
        edges: [],
        head: {},
        foot: {},
        config: { hscale: 1, skin: 'default' },
        error: 'JSON must contain a "signal" array property.',
      };
    }

    const signals: SignalItem[] = [];

    parsed.signal.forEach((item: any, index: number) => {
      if (Array.isArray(item)) {
        // Group format: ['GroupName', { name: 'sig1', wave: '...' }, ...]
        const groupName = typeof item[0] === 'string' ? item[0] : `Group ${index + 1}`;
        const subList = typeof item[0] === 'string' ? item.slice(1) : item;
        subList.forEach((subItem: any, subIdx: number) => {
          if (subItem && typeof subItem === 'object') {
            signals.push({
              id: `sig_${Date.now()}_${index}_${subIdx}`,
              name: subItem.name || `Signal_${subIdx + 1}`,
              wave: subItem.wave || '',
              group: groupName,
              data: Array.isArray(subItem.data)
                ? subItem.data.map(String)
                : typeof subItem.data === 'string'
                ? subItem.data.split(' ')
                : undefined,
              period: typeof subItem.period === 'number' ? subItem.period : undefined,
              phase: typeof subItem.phase === 'number' ? subItem.phase : undefined,
              node: subItem.node || undefined,
            });
          }
        });
      } else if (!item || Object.keys(item).length === 0) {
        // Spacer row
        signals.push({
          id: `spacer_${Date.now()}_${index}`,
          name: '',
          wave: '',
          isSpacer: true,
        });
      } else {
        signals.push({
          id: `sig_${Date.now()}_${index}`,
          name: item.name || `Signal_${index + 1}`,
          wave: item.wave || '',
          data: Array.isArray(item.data)
            ? item.data.map(String)
            : typeof item.data === 'string'
            ? item.data.split(' ')
            : undefined,
          period: typeof item.period === 'number' ? item.period : undefined,
          phase: typeof item.phase === 'number' ? item.phase : undefined,
          node: item.node || undefined,
        });
      }
    });

    // Parse edges: e.g. "a->b t_setup" or "a~>b"
    const edges: EdgeAnnotation[] = [];
    if (Array.isArray(parsed.edge)) {
      parsed.edge.forEach((edgeStr: any, idx: number) => {
        if (typeof edgeStr === 'string') {
          const match = edgeStr.match(/^([a-zA-Z0-9_\[\]:]+)\s*([<>\-~|]+)\s*([a-zA-Z0-9_\[\]:]+)(?:\s+(.*))?$/);
          if (match) {
            edges.push({
              id: `edge_${Date.now()}_${idx}`,
              source: match[1],
              arrow: (match[2] as any) || '->',
              target: match[3],
              label: match[4] || '',
            });
          } else {
            // Generic fallback
            edges.push({
              id: `edge_${Date.now()}_${idx}`,
              source: 'a',
              arrow: '->',
              target: 'b',
              label: edgeStr,
            });
          }
        }
      });
    }

    const head: HeadFootConfig = parsed.head || {};
    const foot: HeadFootConfig = parsed.foot || {};
    const config: DiagramConfig = {
      hscale: parsed.config?.hscale || 1,
      skin: parsed.config?.skin || 'default',
    };

    return {
      signals,
      edges,
      head,
      foot,
      config,
    };
  } catch (err: any) {
    return {
      signals: [],
      edges: [],
      head: {},
      foot: {},
      config: { hscale: 1, skin: 'default' },
      error: `JSON syntax error: ${err.message}`,
    };
  }
}

/**
 * Counts how many bus state entries ('=', '2'..'9') exist in a wave string.
 */
export function countBusSegments(wave: string): number {
  let count = 0;
  for (let i = 0; i < wave.length; i++) {
    const ch = wave[i];
    if (ch === '=' || (ch >= '2' && ch <= '9')) {
      count++;
    }
  }
  return count;
}

/**
 * Normalizes a wave string to exactly targetCycles length.
 * Pads with '.' if shorter, or truncates if longer.
 */
export function resizeWaveString(wave: string, targetCycles: number): string {
  if (wave.length === targetCycles) return wave;
  if (wave.length > targetCycles) {
    return wave.slice(0, targetCycles);
  }
  // Pad with '.'
  return wave + '.'.repeat(targetCycles - wave.length);
}

/**
 * Normalizes a node string to exactly targetCycles length.
 */
export function resizeNodeString(nodeStr: string | undefined, targetCycles: number): string {
  const current = nodeStr || '';
  if (current.length === targetCycles) return current;
  if (current.length > targetCycles) {
    return current.slice(0, targetCycles);
  }
  return current + '.'.repeat(targetCycles - current.length);
}

/**
 * Sets a node tag at a given cycle index in a node string.
 */
export function setNodeAtCycle(nodeStr: string | undefined, index: number, tag: string, totalCycles: number): string {
  const base = resizeNodeString(nodeStr, totalCycles).split('');
  base[index] = tag || '.';
  return base.join('');
}

/**
 * Optimizes a wave string by replacing redundant consecutive identical state symbols
 * with '.' keep-state symbols (e.g., '111000' -> '1..0..', '====' -> '=...').
 * Preserves clock pulses 'p', 'n', 'P', 'N'.
 */
export function autoInsertHoldSymbols(wave: string): string {
  if (!wave) return '';
  const chars = wave.split('');
  let lastState = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '.') {
      continue;
    }
    // Clocks like p, n, P, N are pulses that naturally repeat every period
    if (ch === 'p' || ch === 'n' || ch === 'P' || ch === 'N') {
      lastState = ch;
      continue;
    }
    if (ch === lastState && i > 0) {
      chars[i] = '.';
    } else {
      lastState = ch;
    }
  }
  return chars.join('');
}

/**
 * Smart Auto-Hold: When a user sets a keyframe/transition at cycleIndex,
 * automatically fills following identical or previous-holding cycles with '.'
 * until the next distinct transition or end of waveform.
 */
export function updateWaveWithSmartAutoHold(
  currentWave: string,
  cycleIndex: number,
  newSymbol: string,
  totalCycles: number
): string {
  const chars = resizeWaveString(currentWave, totalCycles).split('');
  const oldSymbol = chars[cycleIndex];
  chars[cycleIndex] = newSymbol;

  // If user explicitly picked '.', no need to propagate forward
  if (newSymbol === '.') {
    return chars.join('');
  }

  // Clocks like 'p', 'n' should just repeat or stay as-is
  if (newSymbol === 'p' || newSymbol === 'n') {
    return chars.join('');
  }

  // Propagate '.' forward to keep the new symbol until next distinct transition
  for (let i = cycleIndex + 1; i < chars.length; i++) {
    // If the next cell had the old symbol or was already holding ('.'),
    // it now holds the new symbol
    if (chars[i] === oldSymbol || chars[i] === '.') {
      chars[i] = '.';
    } else {
      // Encountered an explicitly different state transition, stop holding
      break;
    }
  }

  return chars.join('');
}

