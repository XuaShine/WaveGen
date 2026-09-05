import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Clock,
  Zap,
  CheckCircle2,
  ArrowRight,
  Info,
  Layers,
  Sparkles,
  Sliders,
  Check,
} from 'lucide-react';
import {
  calculateClockDomains,
  CLOCK_DOMAIN_PRESETS,
  ClockDomainResult,
  ResolutionMode,
  formatCleanStep,
  generateCleanTicksString,
} from '../lib/clockDomainHelper';
import { SignalItem, HeadFootConfig, DiagramConfig } from '../types';
import { useI18n } from '../lib/i18n';

interface ClockDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTotalCycles?: number;
  onApply: (
    newSignals: SignalItem[],
    totalCycles: number,
    headUpdates: Partial<HeadFootConfig>,
    footUpdates: Partial<HeadFootConfig>,
    replaceExisting: boolean,
    configUpdates?: Partial<DiagramConfig>,
    autoFit?: boolean
  ) => void;
}

export const ClockDomainModal: React.FC<ClockDomainModalProps> = ({
  isOpen,
  onClose,
  currentTotalCycles = 16,
  onApply,
}) => {
  const { lang } = useI18n();
  const [f1, setF1] = useState<number>(1000); // 1.0 GHz
  const [f2, setF2] = useState<number>(800);  // 800 MHz
  const [resolutionMode, setResolutionMode] = useState<ResolutionMode>('compact');
  const [customTickStep, setCustomTickStep] = useState<number>(0.25);
  const [spans, setSpans] = useState<number>(1); // 1 LCM span
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [addSyncSignal, setAddSyncSignal] = useState<boolean>(true);
  const [cycleMatchMode, setCycleMatchMode] = useState<'align' | 'app' | 'custom'>('align');
  const [customCycles, setCustomCycles] = useState<number>(currentTotalCycles || 16);
  const [hscaleOption, setHscaleOption] = useState<number>(1); // 1 for compact
  const [autoFitToScreen, setAutoFitToScreen] = useState<boolean>(true); // Auto fit to 1 screen

  useEffect(() => {
    if (currentTotalCycles) {
      setCustomCycles(currentTotalCycles);
    }
  }, [currentTotalCycles]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Target cycles depending on chosen mode:
  const targetCycles =
    cycleMatchMode === 'app'
      ? currentTotalCycles
      : cycleMatchMode === 'align'
      ? undefined // will calculate minimal alignment period
      : customCycles;

  // Compute preliminary candidates to get tick values
  const baseResult = useMemo(() => {
    return calculateClockDomains(f1, f2, spans, undefined, targetCycles);
  }, [f1, f2, spans, targetCycles]);

  // Actual step in ns depending on chosen resolution mode
  const effectiveTickStep_ns = useMemo(() => {
    if (resolutionMode === 'custom') {
      return Math.max(0.01, customTickStep || 0.25);
    }
    const cand = baseResult.candidates.find((c) => c.mode === resolutionMode);
    return cand ? cand.step_ns : baseResult.candidates[0].step_ns;
  }, [resolutionMode, customTickStep, baseResult]);

  // Final calculation result with chosen resolution and target cycles
  const calcResult: ClockDomainResult = useMemo(() => {
    return calculateClockDomains(f1, f2, spans, effectiveTickStep_ns, targetCycles);
  }, [f1, f2, spans, effectiveTickStep_ns, targetCycles]);

  if (!isOpen) return null;

  const handleApply = () => {
    const newSignals: SignalItem[] = [];

    // Clock 1
    newSignals.push({
      id: `sig_clk1_${Date.now()}`,
      name: calcResult.clk1Name,
      wave: calcResult.clk1Wave,
      period: 1,
      node: '.' + '.'.repeat(calcResult.totalTicks - 1),
    });

    // Clock 2
    newSignals.push({
      id: `sig_clk2_${Date.now() + 1}`,
      name: calcResult.clk2Name,
      wave: calcResult.clk2Wave,
      period: 1,
      node: '.' + '.'.repeat(calcResult.totalTicks - 1),
    });

    // Optional cross-domain sync signal
    if (addSyncSignal) {
      const handshakeWaveChars = Array(calcResult.totalTicks).fill('.');
      handshakeWaveChars[0] = '0'; // Initial low state
      const step2 = calcResult.ticksPerCycle2;
      const pulseStart = Math.min(calcResult.totalTicks - 1, step2);
      const pulseEnd = Math.min(calcResult.totalTicks, step2 + Math.max(1, step2 * 2));
      handshakeWaveChars[pulseStart] = '1';
      if (pulseEnd < calcResult.totalTicks) {
        handshakeWaveChars[pulseEnd] = '0';
      }

      newSignals.push({
        id: `sig_sync_${Date.now() + 2}`,
        name: 'ASYNC_REQ',
        wave: handshakeWaveChars.join(''),
        period: 1,
      });
    }

    const cleanStepStr = formatCleanStep(effectiveTickStep_ns);
    const cleanTicks = generateCleanTicksString(0, effectiveTickStep_ns, calcResult.totalTicks + 1);

    onApply(
      newSignals,
      calcResult.totalTicks,
      {
        text: lang === 'zh'
          ? `${calcResult.clk1Name} 与 ${calcResult.clk2Name} 跨时钟域时序`
          : `${calcResult.clk1Name} & ${calcResult.clk2Name} CDC Timing`,
        tick: cleanTicks,
        every: undefined,
        step: cleanStepStr,
      },
      {
        text: calcResult.footNote,
      },
      replaceExisting,
      {
        hscale: hscaleOption,
      },
      autoFitToScreen
    );
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {lang === 'zh' ? '多时钟域物理时间对齐与标尺规划' : 'Multi-Clock Domain Alignment & Timebase'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'zh'
                  ? '支持 1GHz 与 800MHz 任意跨时钟域，智能规划 1 tick 刻度，避免波形被过度拉长'
                  : 'Supports CDC alignment with smart 1-tick resolution planning without overstretching'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {lang === 'zh' ? '快速选择经典时钟域组合预设:' : 'Quick Clock Domain Presets:'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CLOCK_DOMAIN_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setF1(preset.f1);
                    setF2(preset.f2);
                    setResolutionMode('compact');
                  }}
                  className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                    f1 === preset.f1 && f2 === preset.f2
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>{preset.name}</span>
                    {f1 === preset.f1 && f2 === preset.f2 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {preset.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Frequency Inputs */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-500" />
              {lang === 'zh' ? '自定义时钟域频率输入 (MHz):' : 'Clock Domain Frequency (MHz):'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  {lang === 'zh' ? '时钟 1 频率 (CLK 1):' : 'Clock 1 Frequency (CLK 1):'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={f1}
                    onChange={(e) => setF1(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-semibold"
                  />
                  <span className="text-slate-500 font-mono">MHz</span>
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono min-w-[70px]">
                    ({formatCleanStep(calcResult.t1_ns)} ns)
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-600 dark:text-slate-400 font-medium">
                  {lang === 'zh' ? '时钟 2 频率 (CLK 2):' : 'Clock 2 Frequency (CLK 2):'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={f2}
                    onChange={(e) => setF2(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-semibold"
                  />
                  <span className="text-slate-500 font-mono">MHz</span>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-mono min-w-[70px]">
                    ({formatCleanStep(calcResult.t2_ns)} ns)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timebase / 1-Tick Resolution Planning */}
          <div className="p-4 bg-blue-50/60 dark:bg-blue-950/25 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                {lang === 'zh'
                  ? '时间标尺精度规划 (自动规划 1 tick 相当于多少 ns):'
                  : 'Timebase Resolution Planning (1 tick in ns):'}
              </span>
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-bold">
                {lang === 'zh'
                  ? `当前: 1 tick = ${calcResult.tickStep_ns} ns (${calcResult.totalTicks} 拍)`
                  : `Current: 1 tick = ${calcResult.tickStep_ns} ns (${calcResult.totalTicks} ticks)`}
              </span>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {lang === 'zh'
                ? '选择适合展示的时间刻度分辨率。紧凑模式能防止 1 个周期被拆成过多拍而在图里过长：'
                : 'Select appropriate time resolution. Compact mode prevents over-subdividing cycles:'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {baseResult.candidates.map((cand) => (
                <button
                  key={cand.mode}
                  type="button"
                  onClick={() => setResolutionMode(cand.mode)}
                  className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                    resolutionMode === cand.mode
                      ? 'border-blue-600 bg-white dark:bg-slate-800 ring-2 ring-blue-500 text-blue-950 dark:text-blue-100 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 hover:bg-white text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <span>{cand.label.split('(')[0]}</span>
                    {resolutionMode === cand.mode && (
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </div>
                  <div className="font-mono text-[11px] font-bold text-blue-700 dark:text-blue-300 mt-1">
                    1 tick = {cand.step_ns} ns
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                    {lang === 'zh'
                      ? `${cand.ticksPerCycle1} 拍 vs ${cand.ticksPerCycle2} 拍 (共 ${cand.totalTicks} 拍)`
                      : `${cand.ticksPerCycle1} ticks vs ${cand.ticksPerCycle2} ticks (total ${cand.totalTicks})`}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Tick Input */}
            <div className="flex flex-col gap-2 pt-1 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="resolution"
                    checked={resolutionMode === 'custom'}
                    onChange={() => setResolutionMode('custom')}
                    className="text-blue-600"
                  />
                  <span>{lang === 'zh' ? '自定义 1 tick 步长:' : 'Custom 1 tick step:'}</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    max="1000"
                    value={customTickStep}
                    onFocus={() => setResolutionMode('custom')}
                    onChange={(e) => {
                      setCustomTickStep(parseFloat(e.target.value) || 1);
                      setResolutionMode('custom');
                    }}
                    className="w-20 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                  />
                  <span className="font-mono text-slate-500">ns / tick</span>
                </div>
              </div>

              {/* Quick Macro Tick Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pl-6">
                <span className="text-[11px] text-slate-500 font-medium">
                  {lang === 'zh' ? '快捷加大刻度:' : 'Quick scale presets:'}
                </span>
                {[0.5, 1, 2, 5, 10, 20, 50].map((stepVal) => (
                  <button
                    key={stepVal}
                    type="button"
                    onClick={() => {
                      setCustomTickStep(stepVal);
                      setResolutionMode('custom');
                    }}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold transition-all border cursor-pointer ${
                      resolutionMode === 'custom' && customTickStep === stepVal
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
                    }`}
                  >
                    {`${stepVal}ns`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Waveform Length Adaptation & Cycles Setting */}
          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/25 rounded-xl border border-purple-200 dark:border-purple-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                {lang === 'zh'
                  ? '波形长度自动适应与自定义拍数 (解决拍数过多过长无法看全):'
                  : 'Waveform Length & Cycle Alignment:'}
              </span>
              <span className="text-[11px] text-purple-700 dark:text-purple-300 font-mono font-bold">
                {lang === 'zh' ? `生成目标: ${calcResult.totalTicks} 拍` : `Target: ${calcResult.totalTicks} ticks`}
              </span>
            </div>

            {/* Quick Cycle Mode Selector Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCycleMatchMode('align')}
                className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                  cycleMatchMode === 'align'
                    ? 'border-purple-600 bg-white dark:bg-slate-800 ring-2 ring-purple-500 text-purple-950 dark:text-purple-100 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-white'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>{lang === 'zh' ? '最小对齐周期 (推荐)' : 'Minimal Alignment (Recommended)'}</span>
                  {cycleMatchMode === 'align' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <div className="font-mono text-[11px] font-bold text-purple-700 dark:text-purple-300 mt-1">
                  {lang === 'zh' ? `共 ${baseResult.totalTicks} 拍 (最易一屏看全)` : `${baseResult.totalTicks} ticks (Fits screen)`}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'zh' ? '展示 1 个完整最小相位对齐公倍周期' : '1 full LCM phase alignment period'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCycleMatchMode('app')}
                className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                  cycleMatchMode === 'app'
                    ? 'border-purple-600 bg-white dark:bg-slate-800 ring-2 ring-purple-500 text-purple-950 dark:text-purple-100 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-white'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>{lang === 'zh' ? '与工程基准一致' : 'Match Project Base'}</span>
                  {cycleMatchMode === 'app' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <div className="font-mono text-[11px] font-bold text-purple-700 dark:text-purple-300 mt-1">
                  {lang === 'zh' ? `共 ${currentTotalCycles} 拍 (满拍对齐)` : `${currentTotalCycles} ticks`}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'zh' ? '与当前编辑器已有其它信号保持完全等长' : 'Keep identical length with existing signals'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCycleMatchMode('custom')}
                className={`p-2.5 text-left rounded-xl border transition-all cursor-pointer ${
                  cycleMatchMode === 'custom'
                    ? 'border-purple-600 bg-white dark:bg-slate-800 ring-2 ring-purple-500 text-purple-950 dark:text-purple-100 shadow-2xs'
                    : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:bg-white'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>{lang === 'zh' ? '自定义拍数' : 'Custom Ticks'}</span>
                  {cycleMatchMode === 'custom' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    min="4"
                    max="256"
                    value={customCycles}
                    onChange={(e) => setCustomCycles(Math.max(4, parseInt(e.target.value) || 16))}
                    className="w-16 px-1.5 py-0.5 rounded border border-purple-300 dark:border-purple-700 text-xs font-mono font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-slate-800"
                  />
                  <span className="text-[11px] text-purple-600">{lang === 'zh' ? '拍' : 'ticks'}</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'zh' ? '按需指定任意长度' : 'Specify custom length'}
                </div>
              </button>
            </div>

            {/* Horizontal Scale (hscale) & Auto-Fit Options */}
            <div className="pt-2 border-t border-purple-200/60 dark:border-purple-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-purple-950 dark:text-purple-200">
                  {lang === 'zh' ? '水平每拍宽度比例 (hscale):' : 'Horizontal scale per tick (hscale):'}
                </span>
                <div className="flex items-center rounded-lg border border-purple-200 dark:border-purple-800 p-0.5 bg-white dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setHscaleOption(1)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      hscaleOption === 1
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-purple-600'
                    }`}
                    title={lang === 'zh' ? '1x 紧凑型: 每拍宽度20px，在40拍等多拍场景下一屏即可完整容纳' : '1x Compact: fits 40 ticks cleanly on screen'}
                  >
                    {lang === 'zh' ? '1x 紧凑 (推荐)' : '1x Compact'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHscaleOption(2)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      hscaleOption === 2
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-purple-600'
                    }`}
                    title={lang === 'zh' ? '2x 标准型: 每拍宽度40px，适合拍数较少（16拍以内）的精细观察' : '2x Standard: wider view for <= 16 ticks'}
                  >
                    {lang === 'zh' ? '2x 标准宽松' : '2x Standard'}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none font-medium text-purple-900 dark:text-purple-300">
                <input
                  type="checkbox"
                  checked={autoFitToScreen}
                  onChange={(e) => setAutoFitToScreen(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="font-bold">
                  {lang === 'zh' ? '生成后自动开启「一屏容纳」缩放 (免横向滚动)' : 'Auto-enable "Fit to Screen" zoom'}
                </span>
              </label>
            </div>
          </div>

          {/* Mathematical & Physical Analysis Box */}
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'zh' ? '当前规划分析结果 (可读性评估):' : 'Timing Analysis & Resolution:'}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1 text-slate-700 dark:text-slate-300">
              <div className="p-2 bg-white dark:bg-slate-800/80 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] text-slate-500 block">
                  {lang === 'zh' ? '基准时间刻度 (1 tick):' : 'Base Tick Step (1 tick):'}
                </span>
                <span className="text-sm font-bold font-mono text-blue-700 dark:text-blue-300">
                  {calcResult.tickStep_ns} ns
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800/80 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] text-slate-500 block">
                  {lang === 'zh' ? '每周期所占拍数:' : 'Ticks Per Cycle:'}
                </span>
                <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-300">
                  {calcResult.ticksPerCycle1} : {calcResult.ticksPerCycle2}
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800/80 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] text-slate-500 block">
                  {lang === 'zh' ? '渲染总拍数:' : 'Total Ticks:'}
                </span>
                <span className="text-sm font-bold font-mono text-purple-700 dark:text-purple-300">
                  {calcResult.totalTicks}
                </span>
              </div>
              <div className="p-2 bg-white dark:bg-slate-800/80 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                <span className="text-[10px] text-slate-500 block">
                  {lang === 'zh' ? '最小对齐公倍周期:' : 'LCM Minimal Period:'}
                </span>
                <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">
                  {formatCleanStep(calcResult.lcmPeriod_ns)} ns
                </span>
              </div>
            </div>

            <div className="text-[11px] text-emerald-900/80 dark:text-emerald-300/80 flex items-start gap-1.5 leading-relaxed pt-1">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
              <span>
                {lang === 'zh'
                  ? `在 ${formatCleanStep(calcResult.lcmPeriod_ns)} ns 窗口内，${calcResult.clk1Name} 完成正好 ${calcResult.cycles1} 个完整时钟周期（每拍占 ${calcResult.ticksPerCycle1} 格），${calcResult.clk2Name} 完成正好 ${calcResult.cycles2} 个完整时钟周期（每拍占 ${calcResult.ticksPerCycle2} 格）。仅需 ${calcResult.totalTicks} 格即可完成全图完整对齐，宽度紧凑适中！`
                  : `Within ${formatCleanStep(calcResult.lcmPeriod_ns)} ns, ${calcResult.clk1Name} completes ${calcResult.cycles1} cycle(s) (${calcResult.ticksPerCycle1} ticks/cyc), and ${calcResult.clk2Name} completes ${calcResult.cycles2} cycle(s) (${calcResult.ticksPerCycle2} ticks/cyc). Full alignment achieved in ${calcResult.totalTicks} ticks.`}
              </span>
            </div>
          </div>

          {/* Options */}
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={addSyncSignal}
                onChange={(e) => setAddSyncSignal(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {lang === 'zh' ? '同时生成跨时钟域请求握手信号 (ASYNC_REQ)' : 'Generate CDC handshake signal (ASYNC_REQ)'}
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {lang === 'zh' ? '清空现有信号直接替换 (取消勾选则保留现有并在最上方插入)' : 'Replace existing signals (uncheck to prepend)'}
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <span className="text-[11px] text-slate-500">
            {lang === 'zh' ? '自动匹配标尺刻度与物理时间图注' : 'Auto matches time ticks and diagram notes'}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>{lang === 'zh' ? '生成并应用到波形' : 'Generate & Apply'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
