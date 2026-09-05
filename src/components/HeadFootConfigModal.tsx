import React, { useState, useMemo, useEffect } from 'react';
import {
  SlidersHorizontal,
  Type,
  Hash,
  Palette,
  X,
  Clock,
  Check,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { WaveHeadFoot, WaveConfig, WaveSkin } from '../types';
import { AVAILABLE_SKINS, getSkinInfo } from '../lib/skins';
import { formatCleanStep } from '../lib/clockDomainHelper';
import { useI18n } from '../lib/i18n';

export interface HeadFootConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  head: WaveHeadFoot;
  foot: WaveHeadFoot;
  config: WaveConfig;
  onHeadChange: (head: WaveHeadFoot) => void;
  onFootChange: (foot: WaveHeadFoot) => void;
  onConfigChange: (config: WaveConfig) => void;
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
  { label: '1 (整拍)', enLabel: '1 (Full Cycle)', val: '1', desc: '标准整数拍数', enDesc: 'Standard integer cycles' },
  { label: '0.5 (半拍)', enLabel: '0.5 (Half Cycle)', val: '0.5', desc: '半周期细分', enDesc: 'Half cycle sub-ticks' },
  { label: '0.25 (1/4拍)', enLabel: '0.25 (Quarter)', val: '0.25', desc: '高精度相位对齐', enDesc: 'High precision phase' },
  { label: '0.125', enLabel: '0.125 (1/8th)', val: '0.125', desc: '超细粒度', enDesc: 'Fine granularity' },
  { label: '1.25 (800M)', enLabel: '1.25 (800MHz)', val: '1.25', desc: '800MHz 时基', enDesc: '800MHz timebase' },
  { label: '2', enLabel: '2 (Divide by 2)', val: '2', desc: '双周期分频', enDesc: 'Divide-by-2 cycles' },
  { label: '5', enLabel: '5 (5x Cycles)', val: '5', desc: '5倍周期', enDesc: '5x period spacing' },
  { label: '10', enLabel: '10 (Decade)', val: '10', desc: '10倍周期', enDesc: '10x decade spacing' },
];

export const HeadFootConfigModal: React.FC<HeadFootConfigModalProps> = ({
  isOpen,
  onClose,
  head,
  foot,
  config,
  onHeadChange,
  onFootChange,
  onConfigChange,
  onOpenClockDomainModal,
}) => {
  const { lang, t } = useI18n();
  const [activeTab, setActiveTab] = useState<'ruler' | 'config' | 'text'>('ruler');

  const parsed = useMemo(() => {
    return parseTick(head.tick, head.step);
  }, [head.tick, head.step]);

  const isStepActive = useMemo(() => {
    if (parsed.isCustom) return false;
    const s = parseFloat(parsed.step);
    return !isNaN(s) && s !== 1;
  }, [parsed]);

  const tickPreview = useMemo(() => {
    if (parsed.isCustom) {
      const items = parsed.customStr.trim().split(/\s+/);
      return items.slice(0, 6).join(', ') + (items.length > 6 ? '...' : '');
    }
    const s = parseFloat(parsed.step);
    if (isNaN(s) || s <= 0) return `${parsed.offset}, ${parsed.offset + 1}, ${parsed.offset + 2}...`;
    const items = [];
    for (let i = 0; i < 5; i++) {
      items.push(formatCleanStep(i * s + parsed.offset));
    }
    return items.join(', ') + '...';
  }, [parsed]);

  // Close on Escape key
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

  const handleCustomStringChange = (customStr: string) => {
    if (!customStr.trim()) {
      onHeadChange({
        ...head,
        tick: 0,
        step: '1',
      });
    } else {
      onHeadChange({
        ...head,
        tick: customStr.trim(),
      });
    }
  };

  const handleResetToStandardRuler = () => {
    onHeadChange({
      ...head,
      tick: 0,
      step: '1',
      every: 1,
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {lang === 'zh' ? '周期标尺与全局配置' : 'Timing Ruler & Global Config'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'zh'
                  ? '配置时间刻度步长、起点偏移、稀疏度、图纸主题皮肤与水平缩放'
                  : 'Configure tick steps, offset, sparsity, skins, and horizontal scale'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('ruler')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ruler'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '周期标尺 (Tick & Tock)' : 'Timing Ruler (Tick & Tock)'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'config'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '皮肤与画板缩放 (Skin & HScale)' : 'Themes & HScale'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '图表标题与页脚备注 (Head / Foot)' : 'Header & Footer Text'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: RULER */}
          {activeTab === 'ruler' && (
            <div className="space-y-4">
              {/* Quick Status Card */}
              <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-indigo-950 dark:text-indigo-200 font-bold block">
                    {lang === 'zh' ? '当前时钟周期标尺预览:' : 'Current Timing Ruler Preview:'}
                  </span>
                  <div className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {tickPreview}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'zh' ? '起点编号' : 'Offset'}: {parsed.offset} · {lang === 'zh' ? '标尺数值步长' : 'Step'}: {parsed.step}
                    {!isStepActive && ` · ${lang === 'zh' ? `标注稀疏度: 每隔 ${head.every ?? 1} 拍` : `Every: ${head.every ?? 1} cycles`}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetToStandardRuler}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{lang === 'zh' ? '恢复标准 0,1,2...' : 'Reset to 0, 1, 2...'}</span>
                  </button>

                  {onOpenClockDomainModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenClockDomainModal();
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 font-semibold cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{lang === 'zh' ? '⚡ 跨时钟域标尺规划' : '⚡ Multi-Clock Domain Planner'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Core Parameters Grid - hides Every when Step is active as requested */}
              <div className={`grid gap-4 ${isStepActive ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                {/* 1. Step (步长) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'zh' ? '标尺时间/数值步长 (step)' : 'Ruler Time/Value Step (step)'}
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {lang === 'zh' ? '1拍所占数值' : 'Value per cycle'}
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
                      ? '如设置为 1 则输出 1,2,3；设为 0.25 则输出 0, 0.25, 0.5, 0.75。'
                      : 'E.g. set 1 for 1,2,3; set 0.25 for 0, 0.25, 0.5, 0.75.'}
                  </p>
                </div>

                {/* 2. Offset (起点编号) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'zh' ? '起始编号 (offset / tick)' : 'Start Offset (offset / tick)'}
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {lang === 'zh' ? '从几开始计数' : 'Starting count'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={parsed.offset}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                        handleOffsetChange(isNaN(val) ? 0 : val);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                      placeholder="0"
                    />
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleOffsetChange(0)}
                        className={`px-2 py-1 text-xs rounded border cursor-pointer font-mono ${
                          parsed.offset === 0 ? 'bg-blue-600 text-white font-bold' : 'bg-white dark:bg-slate-800'
                        }`}
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOffsetChange(1)}
                        className={`px-2 py-1 text-xs rounded border cursor-pointer font-mono ${
                          parsed.offset === 1 ? 'bg-blue-600 text-white font-bold' : 'bg-white dark:bg-slate-800'
                        }`}
                      >
                        1
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {lang === 'zh'
                      ? '数字电路常用 0 开始；总线传输周期多从 1 开始。'
                      : 'Digital logic starts at 0; bus transaction traces often start at 1.'}
                  </p>
                </div>

                {/* 3. Every (标注稀疏度) - Hidden when numerical step is active to keep UI clean */}
                {!isStepActive && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {lang === 'zh' ? '标注稀疏度 (every)' : 'Label Interval (every)'}
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {lang === 'zh' ? '每隔 N 拍标一字' : 'Label every N ticks'}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={head.every ?? 1}
                      onChange={(e) => {
                        const val = e.target.value === '' ? undefined : Math.max(1, parseInt(e.target.value) || 1);
                        onHeadChange({
                          ...head,
                          every: val,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-purple-600 dark:text-purple-400"
                      placeholder="1"
                    />
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {lang === 'zh'
                        ? '高密度采样时，设置 every 为 2、4 或 5 可避免数字叠字。'
                        : 'For dense cycles, set every to 2, 4, or 5 to prevent overlapping numbers.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Step Presets Buttons Pool */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {lang === 'zh' ? '常用物理与周期步长预设:' : 'Common Timing & Step Presets:'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STEP_PRESETS.map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => handleStepChange(p.val)}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                        !parsed.isCustom && parsed.step === p.val
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-mono text-xs font-bold">{lang === 'en' ? p.enLabel : p.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{lang === 'en' ? p.enDesc : p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom String & Tock Options */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'zh' ? '自定义自由文字标签序列 (可选):' : 'Custom Text Sequence (Optional):'}
                  </span>
                  {parsed.isCustom && (
                    <button
                      type="button"
                      onClick={() => handleStepChange('1')}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {lang === 'zh' ? '恢复数值步长' : 'Restore Numeric Step'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={parsed.isCustom ? parsed.customStr : ''}
                  onChange={(e) => handleCustomStringChange(e.target.value)}
                  placeholder={lang === 'zh' ? "例如: T0 T1 T2 T3 T4 或 IDLE ADDR DATA WAIT ACK" : "e.g. T0 T1 T2 T3 T4 or IDLE ADDR DATA WAIT ACK"}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  {lang === 'zh'
                    ? '以空格分隔各周期的标题文字。输入后将替代默认数字，显示自定义状态序列。'
                    : 'Space-separated labels replace default numbers with custom state sequence names.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: CONFIG & SKIN */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Skin Theme Picker */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-600" />
                    {lang === 'zh' ? '波形画板皮肤主题 (WaveDrom Skin):' : 'WaveDrom Theme Skin:'}
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {lang === 'zh' ? '当前: ' : 'Current: '}
                    {lang === 'en'
                      ? (getSkinInfo(config.skin || 'default').enName || getSkinInfo(config.skin || 'default').name)
                      : getSkinInfo(config.skin || 'default').name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {AVAILABLE_SKINS.map((skin) => (
                    <button
                      key={skin.id}
                      type="button"
                      onClick={() => onConfigChange({ ...config, skin: skin.id })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        (config.skin || 'default') === skin.id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                          {lang === 'en' && skin.enName ? skin.enName : skin.name}
                        </span>
                        {(config.skin || 'default') === skin.id && (
                          <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
                          style={{ backgroundColor: skin.bgColor }}
                        />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          {skin.enName}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-2 leading-tight">
                        {skin.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* HScale & Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* HScale */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'zh' ? '水平缩放比例 (hscale)' : 'Horizontal Scaling (hscale)'}
                    </label>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                      {config.hscale ?? 1}x
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { val: 1, label: lang === 'zh' ? '1x 紧凑视野' : '1x Compact' },
                      { val: 1.5, label: '1.5x' },
                      { val: 2, label: lang === 'zh' ? '2x 标准' : '2x Standard' },
                      { val: 3, label: lang === 'zh' ? '3x 放大' : '3x Zoomed' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => onConfigChange({ ...config, hscale: opt.val })}
                        className={`flex-1 py-1.5 text-xs rounded-lg border font-medium cursor-pointer transition-all ${
                          (config.hscale ?? 1) === opt.val
                            ? 'bg-blue-600 text-white font-bold border-blue-600'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {lang === 'zh'
                      ? '若波形周期太长想在一屏看到多个周期，请选用 1x 紧凑或结合 narrow 皮肤！'
                      : 'Use 1x compact or narrow skins to view multiple cycles across the screen.'}
                  </p>
                </div>

                {/* Marks (Grid lines) */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'zh' ? '垂直周期辅助栅格线 (marks)' : 'Vertical Cycle Grid Marks (marks)'}
                    </label>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {config.marks === false ? (lang === 'zh' ? '已关闭' : 'Disabled') : (lang === 'zh' ? '开启中' : 'Enabled')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onConfigChange({ ...config, marks: true })}
                      className={`flex-1 py-1.5 text-xs rounded-lg border font-medium cursor-pointer transition-all ${
                        config.marks !== false
                          ? 'bg-emerald-600 text-white font-bold border-emerald-600'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {lang === 'zh' ? '显示垂直虚线' : 'Show Vertical Marks'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onConfigChange({ ...config, marks: false })}
                      className={`flex-1 py-1.5 text-xs rounded-lg border font-medium cursor-pointer transition-all ${
                        config.marks === false
                          ? 'bg-slate-700 text-white font-bold border-slate-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {lang === 'zh' ? '隐藏栅格虚线' : 'Hide Vertical Marks'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    {lang === 'zh'
                      ? '在各个时钟节拍之间渲染灰色虚线，辅助观察上下信号的沿对齐。'
                      : 'Renders dashed lines between clock cycles to align edges across signals.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TEXT & FOOTER */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              {/* Header Title */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {lang === 'zh' ? '波形主标题 (Head Text):' : 'Waveform Main Title (Head Text):'}
                </label>
                <input
                  type="text"
                  value={head.text || ''}
                  onChange={(e) => onHeadChange({ ...head, text: e.target.value })}
                  placeholder={lang === 'zh' ? "例如: DDR4 Read Burst Timing with Auto Precharge" : "e.g. DDR4 Read Burst Timing with Auto Precharge"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium"
                />
                <p className="text-[11px] text-slate-500">
                  {lang === 'zh'
                    ? '显示在波形图的正上方中央，可清晰标注当前时序图的协议与工作模式。'
                    : 'Centered at the top of the diagram to denote protocol and transaction mode.'}
                </p>
              </div>

              {/* Footer Text */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  {lang === 'zh' ? '底部图注与说明 (Foot Text):' : 'Footer Notes & Remarks (Foot Text):'}
                </label>
                <input
                  type="text"
                  value={foot.text || ''}
                  onChange={(e) => onFootChange({ ...foot, text: e.target.value })}
                  placeholder={lang === 'zh' ? "例如: [Note: 1 tick = 1.0 ns · tCAS = 14 · tRP = 14]" : "e.g. [Note: 1 tick = 1.0 ns · tCAS = 14 · tRP = 14]"}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400">
                    {lang === 'zh' ? '快捷填充:' : 'Quick Presets:'}
                  </span>
                  {(lang === 'zh'
                    ? [
                        '[基准: 1.0 GHz · 1 tick = 1.00 ns]',
                        '[建立/保持时间窗口: tSU=2.0ns, tHD=1.5ns]',
                        '[SPI 模式 0: CPOL=0, CPHA=0]',
                        '[AXI4 突发长度: INCR 4 拍]',
                      ]
                    : [
                        '[Ref: 1.0 GHz · 1 tick = 1.00 ns]',
                        '[Setup/Hold Window: tSU=2.0ns, tHD=1.5ns]',
                        '[SPI Mode 0: CPOL=0, CPHA=0]',
                        '[AXI4 Burst: INCR 4 beats]',
                      ]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onFootChange({ ...foot, text: preset })}
                      className="px-2 py-0.5 text-[11px] rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom Tock / Half-cycle ticks */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {lang === 'zh' ? '底部半周期刻度 (foot.tock)' : 'Bottom Half-Cycle Ruler (foot.tock)'}
                  </label>
                  <span className="text-xs text-slate-500 font-mono">
                    {lang === 'zh' ? '可选' : 'Optional'}
                  </span>
                </div>
                <input
                  type="number"
                  value={typeof foot.tock === 'number' ? foot.tock : ''}
                  onChange={(e) =>
                    onFootChange({
                      ...foot,
                      tock: e.target.value === '' ? undefined : parseInt(e.target.value),
                    })
                  }
                  placeholder={lang === 'zh' ? "留空不启用 (例如输入 0 开启底部半拍对齐标尺)" : "Leave empty to disable (e.g. enter 0 for bottom tock ruler)"}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  {lang === 'zh'
                    ? '当需要双边沿采样（DDR）或半周期建立时，可在底部显示错位半拍的标尺。'
                    : 'Displays half-cycle offset ticks for DDR dual-edge sampling and timing margins.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 text-blue-500" />
            <span>
              {lang === 'zh' ? '配置修改已实时应用至上方波形渲染画板' : 'Changes are applied live to the waveform canvas'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
          >
            {lang === 'zh' ? '完成并关闭' : 'Done & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
