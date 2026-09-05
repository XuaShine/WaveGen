import React, { useState, useMemo, useEffect } from 'react';
import {
  SlidersHorizontal,
  Hash,
  X,
  Clock,
  RotateCcw,
  Sparkles,
  Zap,
} from 'lucide-react';
import { WaveHeadFoot } from '../types';
import { formatCleanStep } from '../lib/clockDomainHelper';
import { useI18n } from '../lib/i18n';

export interface HeadFootConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  head: WaveHeadFoot;
  foot: WaveHeadFoot;
  onHeadChange: (head: WaveHeadFoot) => void;
  onFootChange: (foot: WaveHeadFoot) => void;
  onOpenClockDomainModal?: () => void;
}

function parseTick(
  tick: number | string | (number | string)[] | undefined,
  savedStep?: number | string
) {
  if (tick === undefined || tick === null) {
    return { offset: 0, step: savedStep !== undefined ? String(savedStep) : '1', isCustom: false, customStr: '' };
  }
  if (typeof tick === 'number') {
    return { offset: tick, step: savedStep !== undefined ? String(savedStep) : '1', isCustom: false, customStr: '' };
  }
  if (Array.isArray(tick)) {
    if (tick.length === 2 && !isNaN(Number(tick[0])) && !isNaN(Number(tick[1]))) {
      return { offset: Number(tick[0]), step: String(tick[1]), isCustom: false, customStr: '' };
    }
    return { offset: 0, step: '1', isCustom: true, customStr: tick.join(' ') };
  }
  if (typeof tick === 'string') {
    const parts = tick.trim().split(/\s+/);
    if (parts.length === 1 && !isNaN(Number(parts[0]))) {
      return { offset: Number(parts[0]), step: savedStep !== undefined ? String(savedStep) : '1', isCustom: false, customStr: '' };
    }
    if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
      return { offset: Number(parts[0]), step: parts[1], isCustom: false, customStr: '' };
    }
    return { offset: 0, step: '1', isCustom: true, customStr: tick };
  }
  return { offset: 0, step: '1', isCustom: false, customStr: '' };
}

function makeTickValue(offset: number, step: string): number | string {
  const numStep = parseFloat(step);
  if (isNaN(numStep) || numStep === 1) {
    return offset;
  }
  return `${offset} ${step}`;
}

const STEP_PRESETS = [
  { label: '1 (整拍)', enLabel: '1 (Full Cycle)', val: '1', desc: '标准整数拍 (0, 1, 2, 3...)', enDesc: 'Standard integer cycles' },
  { label: '0.5 (半拍)', enLabel: '0.5 (Half Cycle)', val: '0.5', desc: '半周期细分 (0, 0.5, 1.0...)', enDesc: 'Half cycle sub-ticks' },
  { label: '0.25 (1/4拍)', enLabel: '0.25 (Quarter)', val: '0.25', desc: '高精度相位 (0, 0.25, 0.50...)', enDesc: 'High precision phase' },
  { label: '1.25 (800M)', enLabel: '1.25 (800MHz)', val: '1.25', desc: '800MHz 时基 (0, 1.25, 2.50...)', enDesc: '800MHz timebase' },
  { label: '2 (双周期分频)', enLabel: '2 (Divide-by-2)', val: '2', desc: '双周期分频 (0, 2, 4, 6, 8...)', enDesc: 'Divide-by-2 (0, 2, 4, 6...)' },
  { label: '5 (5拍步进)', enLabel: '5 (5x Step)', val: '5', desc: '步长5 (0, 5, 10, 15...)', enDesc: 'Step by 5 (0, 5, 10...)' },
  { label: '10 (十进制步进)', enLabel: '10 (10x Step)', val: '10', desc: '步长10 (0, 10, 20, 30...)', enDesc: 'Step by 10 (0, 10, 20...)' },
];

const EVERY_PRESETS = [
  { label: '每 1 拍标字', enLabel: 'Every 1 tick', val: 1, desc: '标准全量标尺' },
  { label: '每 2 拍标一字', enLabel: 'Every 2 ticks', val: 2, desc: '稀疏对齐 (0, 2, 4, 6...)' },
  { label: '每 4 拍标一字', enLabel: 'Every 4 ticks', val: 4, desc: '4拍一组 (0, 4, 8, 12...)' },
  { label: '每 5 拍标一字', enLabel: 'Every 5 ticks', val: 5, desc: '5拍一组 (0, 5, 10, 15...)' },
  { label: '每 10 拍标一字', enLabel: 'Every 10 ticks', val: 10, desc: '10拍一组 (0, 10, 20...)' },
];

export const HeadFootConfigModal: React.FC<HeadFootConfigModalProps> = ({
  isOpen,
  onClose,
  head,
  foot,
  onHeadChange,
  onFootChange,
  onOpenClockDomainModal,
}) => {
  const { lang, t } = useI18n();

  const parsed = useMemo(() => {
    return parseTick(head.tick, head.step);
  }, [head.tick, head.step]);

  const tickPreview = useMemo(() => {
    if (parsed.isCustom) {
      const items = parsed.customStr.trim().split(/\s+/);
      return items.slice(0, 6).join(', ') + (items.length > 6 ? '...' : '');
    }
    const s = parseFloat(parsed.step);
    const stepVal = isNaN(s) || s <= 0 ? 1 : s;
    const everyVal = head.every && head.every > 1 ? head.every : 1;
    const offset = parsed.offset;
    const items: string[] = [];
    for (let i = 0; i < 30 && items.length < 6; i++) {
      if ((i + offset) % everyVal !== 0) continue;
      items.push(formatCleanStep(i * stepVal + offset));
    }
    return items.join(', ') + (items.length > 0 ? '...' : '');
  }, [parsed, head.every]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStepChange = (newStep: string) => {
    const nextTick = makeTickValue(parsed.offset, newStep);
    onHeadChange({
      ...head,
      tick: nextTick,
      step: newStep,
      every: undefined, // CRITICAL FIX: Reset every so step 2 outputs 0, 2, 4, 6, 8, 10!
    });
  };

  const handleOffsetChange = (newOffset: number) => {
    const nextTick = makeTickValue(newOffset, parsed.step);
    onHeadChange({
      ...head,
      tick: nextTick,
      step: parsed.step,
    });
  };

  const handleEveryChange = (newEvery: number | undefined) => {
    onHeadChange({
      ...head,
      every: newEvery,
    });
  };

  const handleCustomTickChange = (customStr: string) => {
    const tokens = customStr.trim().split(/\s+/).filter(Boolean);
    onHeadChange({
      ...head,
      tick: tokens.length > 0 ? tokens : undefined,
      step: undefined,
    });
  };

  const handleResetToStandard = () => {
    onHeadChange({
      ...head,
      tick: 0,
      step: '1',
      every: undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {lang === 'zh' ? '周期标尺与时基规划' : 'Timing Ruler & Timebase Planning'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'zh'
                  ? '配置波形顶部的节拍步长、起始编号、抽样间隔与物理时间单位'
                  : 'Configure cycle tick step, starting offset, label interval, and physical time units'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Quick Real-time Preview Banner */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'zh' ? '当前刻度生成预览: ' : 'Current Ticks Preview: '}
                </span>
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 ml-1.5">
                  [ {tickPreview} ]
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetToStandard}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
              title="恢复标准 0, 1, 2, 3... 整数拍"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{lang === 'zh' ? '恢复标准 1 拍' : 'Reset to 1x'}</span>
            </button>
          </div>

          {/* Clock Domain Planner Portal Callout */}
          {onOpenClockDomainModal && (
            <div className="p-3.5 bg-gradient-to-r from-purple-50/70 to-indigo-50/70 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl border border-purple-200/80 dark:border-purple-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                    {lang === 'zh' ? '需要多时钟域或物理频率规划？' : 'Need Multi-Clock Domain Planning?'}
                  </span>
                  <span className="text-[11px] text-purple-700/80 dark:text-purple-300">
                    {lang === 'zh'
                      ? '输入 MHz/GHz 频率或 ns 周期，自动计算公倍数与全景刻度'
                      : 'Input MHz/GHz frequency or ns period to auto-calculate LCM tick scale'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenClockDomainModal();
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer shadow-xs transition-colors shrink-0"
              >
                <Zap className="w-3 h-3" />
                <span>{lang === 'zh' ? '打开时钟域规划器' : 'Open Planner'}</span>
              </button>
            </div>
          )}

          {/* Core Parameters Grid: Step, Offset, Every */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Step (数值步长) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'zh' ? '时间/数值步长 (step)' : 'Step Value (step)'}
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {lang === 'zh' ? '每拍递增' : 'Per tick'}
                </span>
              </div>
              <input
                type="text"
                value={parsed.isCustom ? (lang === 'zh' ? '自定义' : 'Custom') : parsed.step}
                disabled={parsed.isCustom}
                onChange={(e) => handleStepChange(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-blue-600 dark:text-blue-400"
                placeholder="1"
              />
              <p className="text-[11px] text-slate-500 leading-snug">
                {lang === 'zh'
                  ? '设为 1 则递增 1；设为 2 则递增 2；设为 0.5 则递增 0.5。'
                  : 'Set 1 for 1,2,3; 2 for 0,2,4,6; 0.5 for 0,0.5,1.0.'}
              </p>
            </div>

            {/* 2. Offset (起点编号) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'zh' ? '起始编号 (offset)' : 'Start Offset (offset)'}
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {lang === 'zh' ? '首拍编号' : 'First tick'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={parsed.offset}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                    handleOffsetChange(isNaN(val) ? 0 : val);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                  placeholder="0"
                />
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOffsetChange(0)}
                    className={`px-2 py-1 text-xs rounded border cursor-pointer font-mono font-bold ${
                      parsed.offset === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOffsetChange(1)}
                    className={`px-2 py-1 text-xs rounded border cursor-pointer font-mono font-bold ${
                      parsed.offset === 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    1
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {lang === 'zh'
                  ? '数字逻辑通常从 0 开始；协议传输时序多从 1 开始。'
                  : 'Digital logic starts at 0; packet protocols often start at 1.'}
              </p>
            </div>

            {/* 3. Every (标注稀疏度) */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'zh' ? '标注稀疏度 (every)' : 'Label Interval (every)'}
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {lang === 'zh' ? '每隔 N 拍' : 'Interval'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={head.every ?? 1}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : Math.max(1, parseInt(e.target.value, 10) || 1);
                    handleEveryChange(val === 1 ? undefined : val);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                  placeholder="1"
                />
                {head.every && head.every > 1 && (
                  <button
                    type="button"
                    onClick={() => handleEveryChange(undefined)}
                    className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer whitespace-nowrap"
                  >
                    {lang === 'zh' ? '清除' : 'Reset'}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                {lang === 'zh'
                  ? '设为 2 则每隔2拍标一字，其余位置留空，避免长波形数字挤压重叠。'
                  : 'Label every N ticks to avoid overlapping text on dense waveforms.'}
              </p>
            </div>
          </div>

          {/* Quick Presets for Step (常用步长预设) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {lang === 'zh' ? '常用步长与分频预设:' : 'Step & Frequency Presets:'}
              </span>
              <span className="text-[10px] text-slate-400">
                {lang === 'zh' ? '点击一键应用' : 'Click to apply'}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STEP_PRESETS.map((p) => {
                const isActive = !parsed.isCustom && parsed.step === p.val && !head.every;
                return (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => handleStepChange(p.val)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {lang === 'zh' ? p.label : p.enLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                      {lang === 'zh' ? p.desc : p.enDesc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Presets for Interval Every (标注稀疏度预设) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {lang === 'zh' ? '常用稀疏标注预设 (every):' : 'Interval Presets (every):'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EVERY_PRESETS.map((ep) => {
                const isEveryActive = (head.every || 1) === ep.val;
                return (
                  <button
                    key={ep.val}
                    type="button"
                    onClick={() => handleEveryChange(ep.val === 1 ? undefined : ep.val)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isEveryActive
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {lang === 'zh' ? ep.label : ep.enLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Tick Array */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              {lang === 'zh' ? '完全自定义刻度文本 (以空格分隔):' : 'Custom Tick Tokens (space-separated):'}
            </label>
            <input
              type="text"
              value={parsed.customStr}
              onChange={(e) => handleCustomTickChange(e.target.value)}
              placeholder={lang === 'zh' ? "如: T0 T1 T2 T3 IDLE READ DATA ACK" : "e.g. T0 T1 T2 T3 IDLE READ DATA ACK"}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono"
            />
            <p className="text-[11px] text-slate-500 leading-snug">
              {lang === 'zh'
                ? '支持输入任意自定义状态字或时间戳，如 "START ADDR DATA1 DATA2 STOP"，将完全覆盖标准递增数字。'
                : 'Custom token list will override numeric sequence (e.g. "START ADDR DATA1 DATA2 STOP").'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleResetToStandard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '恢复默认标准标尺' : 'Reset to Default'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {t('apply')}
          </button>
        </div>
      </div>
    </div>
  );
};
