/**
 * Helper utility for multi-clock domain analysis and waveform generation.
 * Handles non-integer clock frequency ratios (e.g., 1.0 GHz vs 800 MHz).
 * Intelligently plans the 1-tick timebase (in ns) so waveforms are readable
 * and not unnecessarily stretched.
 */

export type ResolutionMode = 'compact' | 'strict' | 'minimal' | 'custom';

export interface ResolutionCandidate {
  mode: ResolutionMode;
  label: string;
  step_ns: number;
  ticksPerCycle1: number;
  ticksPerCycle2: number;
  totalTicks: number;
  description: string;
  isRecommended?: boolean;
}

export interface ClockDomainResult {
  f1_MHz: number;
  f2_MHz: number;
  t1_ns: number;
  t2_ns: number;
  lcmPeriod_ns: number;
  tickStep_ns: number;
  cycles1: number;
  cycles2: number;
  ticksPerCycle1: number;
  ticksPerCycle2: number;
  totalTicks: number;
  clk1Wave: string;
  clk2Wave: string;
  clk1Name: string;
  clk2Name: string;
  footNote: string;
  recommendedEvery: number;
  recommendedHScale: number;
  candidates: ResolutionCandidate[];
}

// Greatest common divisor of integers
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

// Least common multiple
export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.round((a * b) / gcd(a, b)));
}

/**
 * Formats a numerical step or timestamp cleanly without ugly trailing zeros like 0.000 or 0.100
 * e.g., 0.1 instead of 0.100, 1 instead of 1.000, 0.25 instead of 0.250
 */
export function formatCleanStep(val: number): string {
  if (isNaN(val)) return '0';
  // Strict integer check: if it is an integer or within floating epsilon, display purely as integer without decimals
  if (Math.abs(val - Math.round(val)) < 1e-7) {
    return Math.round(val).toString();
  }
  // Otherwise round to at most 4 decimal places, stripping unnecessary trailing zeros
  const rounded = Math.round(val * 10000) / 10000;
  return parseFloat(rounded.toFixed(4)).toString();
}

/**
 * Generates an adaptive, cleanly-formatted sequence of tick values for WaveDrom
 * Each number is formatted dynamically (0, 0.1, 0.2 ... 1, 1.1 ...) avoiding 0.000 or 0.100.
 */
export function generateCleanTicksString(offset: number, step_ns: number, count: number): string {
  const arr: string[] = [];
  for (let i = 0; i < count; i++) {
    const val = offset + i * step_ns;
    arr.push(formatCleanStep(val));
  }
  return arr.join(' ');
}

/**
 * Calculates aligned clock patterns for any two frequencies in MHz with
 * selectable/custom 1-tick resolution.
 *
 * @param f1_MHz Frequency of Clock 1 in MHz (e.g., 1000 for 1GHz)
 * @param f2_MHz Frequency of Clock 2 in MHz (e.g., 800 for 800MHz)
 * @param spans Number of LCM cycles to generate (default: 1)
 * @param chosenTickStep_ns Optional explicit tick resolution in ns (e.g. 0.25)
 */
export function calculateClockDomains(
  f1_MHz: number,
  f2_MHz: number,
  spans: number = 1,
  chosenTickStep_ns?: number,
  targetTotalCycles?: number
): ClockDomainResult {
  const f1 = Math.max(1, f1_MHz);
  const f2 = Math.max(1, f2_MHz);

  const t1_ns = 1000 / f1; // e.g. 1000MHz -> 1.000ns
  const t2_ns = 1000 / f2; // e.g. 800MHz -> 1.250ns

  const t1_ps = Math.round(t1_ns * 1000); // 1000 ps
  const t2_ps = Math.round(t2_ns * 1000); // 1250 ps

  // Period GCD (Compact step: ensures readable cycle width, e.g. 4 ticks per cycle)
  const compactStep_ps = Math.max(25, gcd(t1_ps, t2_ps)); // e.g. 250ps for 1GHz & 800MHz

  // Strict step: half-cycle resolution for 50% duty cycle
  const half1_ps = Math.max(10, Math.round(t1_ps / 2)); // 500 ps
  const half2_ps = Math.max(10, Math.round(t2_ps / 2)); // 625 ps
  let strictStep_ps = gcd(half1_ps, half2_ps); // 125ps
  if (strictStep_ps < 20) strictStep_ps = compactStep_ps;

  // Minimal step: 2 ticks per cycle, ideal for viewing 8-16 cycles on one screen without horizontal scroll
  const minimalStep_ps = Math.max(compactStep_ps, Math.round(t1_ps / 2)); // 500ps

  // Generate candidates
  const candidates: ResolutionCandidate[] = [
    {
      mode: 'compact',
      label: `推荐紧凑标尺 (1 tick = ${formatCleanStep(compactStep_ps / 1000)} ns)`,
      step_ns: Number((compactStep_ps / 1000).toFixed(4)),
      ticksPerCycle1: Math.round(t1_ps / compactStep_ps),
      ticksPerCycle2: Math.round(t2_ps / compactStep_ps),
      totalTicks: lcm(Math.round(t1_ps / compactStep_ps), Math.round(t2_ps / compactStep_ps)),
      description: `周期紧凑易读，每个周期仅占 ${Math.round(t1_ps / compactStep_ps)} / ${Math.round(t2_ps / compactStep_ps)} 拍，波形不被过度拉长`,
      isRecommended: true,
    },
    {
      mode: 'minimal',
      label: `高密度多周期概览 (1 tick = ${formatCleanStep(minimalStep_ps / 1000)} ns, 2拍/周期)`,
      step_ns: Number((minimalStep_ps / 1000).toFixed(4)),
      ticksPerCycle1: Math.max(1, Math.round(t1_ps / minimalStep_ps)),
      ticksPerCycle2: Math.max(1, Math.round(t2_ps / minimalStep_ps)),
      totalTicks: Math.max(16, lcm(Math.max(1, Math.round(t1_ps / minimalStep_ps)), Math.max(1, Math.round(t2_ps / minimalStep_ps)))),
      description: '解决单个周期过大问题！每周期仅占 2~3 拍，单张图轻松容纳 10~20 个完整周期',
    },
    {
      mode: 'strict',
      label: `细粒度半周期标尺 (1 tick = ${formatCleanStep(strictStep_ps / 1000)} ns)`,
      step_ns: Number((strictStep_ps / 1000).toFixed(4)),
      ticksPerCycle1: Math.round(t1_ps / strictStep_ps),
      ticksPerCycle2: Math.round(t2_ps / strictStep_ps),
      totalTicks: lcm(Math.round(t1_ps / strictStep_ps), Math.round(t2_ps / strictStep_ps)),
      description: '严格 50% 占空比采样精度，总拍数较多',
    },
  ];

  // Determine actual step used
  let step_ps = compactStep_ps;
  if (chosenTickStep_ns !== undefined && chosenTickStep_ns > 0) {
    step_ps = Math.round(chosenTickStep_ns * 1000);
  }

  let ticksPerCycle1 = Math.round(t1_ps / step_ps);
  let ticksPerCycle2 = Math.round(t2_ps / step_ps);

  // If user sets a large step (e.g. tick = 2, 5, 10ns) such that ticksPerCycle collapses:
  if (ticksPerCycle1 < 1) ticksPerCycle1 = 1;
  if (ticksPerCycle2 < 1) ticksPerCycle2 = 1;

  if (ticksPerCycle1 <= 1 && ticksPerCycle2 <= 1 && t1_ps !== t2_ps) {
    const g0 = gcd(t1_ps, t2_ps);
    ticksPerCycle1 = Math.max(1, Math.round(t1_ps / g0));
    ticksPerCycle2 = Math.max(1, Math.round(t2_ps / g0));
  } else {
    ticksPerCycle1 = Math.max(1, ticksPerCycle1);
    ticksPerCycle2 = Math.max(1, ticksPerCycle2);
  }

  const g = gcd(ticksPerCycle1, ticksPerCycle2);
  const lcmTicks = (ticksPerCycle1 * ticksPerCycle2) / (g || 1);

  const cycles1 = lcmTicks / ticksPerCycle1;
  const cycles2 = lcmTicks / ticksPerCycle2;

  const tickStep_ns = step_ps / 1000;
  const lcmPeriod_ns = (lcm(t1_ps, t2_ps)) / 1000;

  // Real-time rendering accurately matching target total cycles (基准总周期)
  const minRequiredTicks = Math.max(16, Math.max(ticksPerCycle1, ticksPerCycle2) * 3);
  const totalTicks =
    targetTotalCycles && targetTotalCycles > 0
      ? targetTotalCycles
      : Math.min(128, Math.max(minRequiredTicks, lcmTicks * Math.max(1, spans)));

  // Build Clock 1 waveform (using 'h' and 'l' for crisp vertical rectangular clock pulses without slew slope)
  let singleCycle1 = '';
  if (ticksPerCycle1 === 1) {
    // WaveDrom 'p' denotes standard clock cycle within 1 tick
    singleCycle1 = 'p';
  } else {
    const halfTicks1 = Math.max(1, Math.round(ticksPerCycle1 / 2));
    const lowTicks1 = Math.max(1, ticksPerCycle1 - halfTicks1);
    singleCycle1 = 'h' + '.'.repeat(Math.max(0, halfTicks1 - 1)) + 'l' + '.'.repeat(Math.max(0, lowTicks1 - 1));
  }
  let clk1Wave = '';
  while (clk1Wave.length < totalTicks) {
    clk1Wave += singleCycle1;
  }
  clk1Wave = clk1Wave.slice(0, totalTicks);

  // Build Clock 2 waveform (using 'h' and 'l' for crisp vertical rectangular clock pulses without slew slope)
  let singleCycle2 = '';
  if (ticksPerCycle2 === 1) {
    singleCycle2 = 'p';
  } else {
    const halfTicks2 = Math.max(1, Math.round(ticksPerCycle2 / 2));
    const lowTicks2 = Math.max(1, ticksPerCycle2 - halfTicks2);
    singleCycle2 = 'h' + '.'.repeat(Math.max(0, halfTicks2 - 1)) + 'l' + '.'.repeat(Math.max(0, lowTicks2 - 1));
  }
  let clk2Wave = '';
  while (clk2Wave.length < totalTicks) {
    clk2Wave += singleCycle2;
  }
  clk2Wave = clk2Wave.slice(0, totalTicks);

  const formatFreq = (mhz: number) => {
    if (mhz >= 1000) {
      return `${(mhz / 1000).toFixed(mhz % 1000 === 0 ? 0 : 2)}GHz`;
    }
    return `${mhz}MHz`;
  };

  const clk1Name = `CLK_${formatFreq(f1)}`;
  const clk2Name = `CLK_${formatFreq(f2)}`;

  const footNote = `时钟对齐: ${formatFreq(f1)} (${formatCleanStep(t1_ns)}ns, ${ticksPerCycle1}拍/周期) vs ${formatFreq(f2)} (${formatCleanStep(t2_ns)}ns, ${ticksPerCycle2}拍/周期) | 时间标尺: 1 tick = ${formatCleanStep(tickStep_ns)}ns | 最小对齐周期: ${formatCleanStep(lcmPeriod_ns)}ns (共${totalTicks}拍)`;

  // If total ticks is large (> 30), recommended hscale is 1; if smaller, 1.2 or 1.5
  const recommendedHScale = totalTicks > 32 ? 1 : totalTicks > 16 ? 1 : 1.5;

  return {
    f1_MHz: f1,
    f2_MHz: f2,
    t1_ns,
    t2_ns,
    lcmPeriod_ns,
    tickStep_ns,
    cycles1,
    cycles2,
    ticksPerCycle1,
    ticksPerCycle2,
    totalTicks,
    clk1Wave,
    clk2Wave,
    clk1Name,
    clk2Name,
    footNote,
    recommendedEvery: ticksPerCycle1,
    recommendedHScale,
    candidates,
  };
}

export const CLOCK_DOMAIN_PRESETS = [
  {
    name: '1.0 GHz 与 800 MHz (5:4 异步时钟域)',
    f1: 1000,
    f2: 800,
    desc: '推荐 1 tick = 0.25ns (1GHz为4拍，800MHz为5拍对齐)',
  },
  {
    name: '1.0 GHz 与 500 MHz (2:1 整数倍时钟)',
    f1: 1000,
    f2: 500,
    desc: '标准二分频总线 (1 tick = 0.5ns 或 0.25ns, LCM = 2.0ns)',
  },
  {
    name: '1.0 GHz 与 667 MHz (3:2 DDR 内存时钟)',
    f1: 1000,
    f2: 667,
    desc: '常见 3:2 内存控制器跨域 (1 tick = 0.25ns, 12拍对齐)',
  },
  {
    name: '800 MHz 与 400 MHz (2:1 外设总线)',
    f1: 800,
    f2: 400,
    desc: '800MHz AXI 与 400MHz APB/AHB 总线 (LCM = 2.5ns)',
  },
  {
    name: '1.2 GHz 与 800 MHz (3:2 高性能多核)',
    f1: 1200,
    f2: 800,
    desc: '1.2GHz 大核与 800MHz 互联总线对齐 (1 tick = 0.4ns 或 0.25ns)',
  },
  {
    name: '100 MHz 与 50 MHz (2:1 常用片上系统)',
    f1: 100,
    f2: 50,
    desc: '10ns vs 20ns 周期，推荐使用 1ns / 2ns / 5ns / 10ns 大步长 tick',
  },
  {
    name: '100 MHz 与 40 MHz (5:2 异步外设时钟)',
    f1: 100,
    f2: 40,
    desc: '10ns vs 25ns 周期，支持 2ns / 5ns / 10ns 宏观时间标尺',
  },
  {
    name: '50 MHz 与 10 MHz (5:1 低功耗慢速总线)',
    f1: 50,
    f2: 10,
    desc: '20ns vs 100ns 周期，完美适配 5ns、10ns、20ns 等超大 tick 步长',
  },
];
