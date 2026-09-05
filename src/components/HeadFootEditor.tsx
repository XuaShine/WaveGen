import React, { useState, useMemo } from 'react';
import { Settings2, Type, Hash, Palette, Clock, Sparkles, SlidersHorizontal } from 'lucide-react';
import { HeadFootConfig, DiagramConfig } from '../types';
import { AVAILABLE_SKINS } from '../lib/skins';
import { formatCleanStep } from '../lib/clockDomainHelper';

interface HeadFootEditorProps {
  head: HeadFootConfig;
  foot: HeadFootConfig;
  config: DiagramConfig;
  onHeadChange: (head: HeadFootConfig) => void;
  onFootChange: (foot: HeadFootConfig) => void;
  onConfigChange: (config: DiagramConfig) => void;
  onOpenClockDomainModal?: () => void;
  totalCycles?: number;
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
  { label: '1 (整拍)', val: '1' },
  { label: '0.5 (半拍)', val: '0.5' },
  { label: '0.25 (1/4拍)', val: '0.25' },
  { label: '0.125', val: '0.125' },
  { label: '1.25 (800M)', val: '1.25' },
  { label: '2', val: '2' },
  { label: '5', val: '5' },
  { label: '10', val: '10' },
];

export const HeadFootEditor: React.FC<HeadFootEditorProps> = ({
  head,
  foot,
  config,
  onHeadChange,
  onFootChange,
  onConfigChange,
  onOpenClockDomainModal,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const parsed = useMemo(() => {
    return parseTick(head.tick, head.step);
  }, [head.tick, head.step]);

  const tickPreview = useMemo(() => {
    if (parsed.isCustom) {
      const items = parsed.customStr.trim().split(/\s+/);
      return items.slice(0, 5).join(', ') + (items.length > 5 ? '...' : '');
    }
    const s = parseFloat(parsed.step);
    if (isNaN(s) || s <= 0) return `${parsed.offset}, ${parsed.offset + 1}, ${parsed.offset + 2}...`;
    const items = [];
    for (let i = 0; i < 4; i++) {
      items.push(formatCleanStep(i * s + parsed.offset));
    }
    return items.join(', ') + '...';
  }, [parsed]);

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

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {/* Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            周期标尺与全局配置
          </span>
          {head.text && (
            <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 truncate max-w-xs font-medium">
              {head.text}
            </span>
          )}
        </div>

        {/* Clean, Direct Tick, Step & Every Inputs */}
        <div className="flex items-center gap-2.5 text-xs flex-wrap">
          {/* Tick Step Input (Direct User Request!) */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-blue-300 dark:border-blue-700 shadow-2xs">
            <span className="text-blue-700 dark:text-blue-300 font-bold text-[11px] flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3 text-blue-500" />
              刻度步长 (step):
            </span>
            <input
              type="text"
              value={parsed.isCustom ? '自定义' : parsed.step}
              disabled={parsed.isCustom}
              onChange={(e) => handleStepChange(e.target.value)}
              className="w-16 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/50 font-mono text-center text-xs font-bold text-blue-700 dark:text-blue-300"
              placeholder="1"
              title="设置 1 拍代表的数值/时间步长，如 1 (整拍)、0.5、0.25、1.25、5 等"
            />
            {/* Quick Step Buttons */}
            <div className="hidden sm:flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-200 dark:border-slate-700">
              {['1', '0.5', '0.25', '1.25', '5'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStepChange(s)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                    !parsed.isCustom && parsed.step === s
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                  title={`快速切换步长为 ${s}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Starting Tick Input */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 font-medium text-[11px]">起始刻度 (tick):</span>
            <input
              type="number"
              value={parsed.offset}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                handleOffsetChange(isNaN(val) ? 0 : val);
              }}
              className="w-12 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono text-center text-xs font-bold text-slate-700 dark:text-slate-300"
              placeholder="0"
              title="标尺起始编号，通常从 0 或 1 开始"
            />
          </div>

          {/* Tick Interval (Every) */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-slate-500 font-medium text-[11px]">刻度间隔 (every):</span>
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
              className="w-11 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 font-mono text-center text-xs font-bold text-slate-700 dark:text-slate-300"
              placeholder="1"
              title="标尺每隔几个周期显示一个数字刻度，默认1 (每拍)"
            />
          </div>

          {/* Preview Badge */}
          <div className="hidden lg:flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] text-slate-600 dark:text-slate-300 font-mono">
            <span className="text-slate-400 font-sans">刻度预览:</span>
            <span className="text-blue-600 dark:text-blue-400 font-semibold">{tickPreview}</span>
          </div>

          {onOpenClockDomainModal && (
            <button
              type="button"
              onClick={onOpenClockDomainModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-semibold transition-colors cursor-pointer"
              title="支持同时绘制 1GHz 与 800MHz 等非整数倍跨时钟域时序"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>多时钟域计算</span>
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer ml-1"
          >
            {isOpen ? '收起设置' : '高级刻度与皮肤...'}
          </button>
        </div>
      </div>

      {/* Expandable Advanced Options */}
      {isOpen && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-100">
          {/* Section 1: Header / Title & Custom Tick Strings */}
          <div className="flex flex-col gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Type className="w-3.5 h-3.5 text-blue-500" />
              <span>顶部标题与刻度配置 (Head)</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 font-medium">波形主标题:</label>
              <input
                type="text"
                value={head.text || ''}
                onChange={(e) => onHeadChange({ ...head, text: e.target.value })}
                placeholder="例如: SPI Master Transmit Timing"
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium"
              />
            </div>

            {/* Custom tick string input (e.g. T0 T1 T2 T3 or 0ns 2.5ns 5ns) */}
            <div className="flex flex-col gap-1 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-slate-500 font-medium">自由文字/带单位刻度序列 (可选):</label>
                {parsed.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleStepChange('1')}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    恢复数值步进
                  </button>
                )}
              </div>
              <input
                type="text"
                value={parsed.isCustom ? parsed.customStr : ''}
                onChange={(e) => handleCustomStringChange(e.target.value)}
                placeholder="例如: T0 T1 T2 T3 T4 或 0ns 2.5ns 5ns 7.5ns"
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono"
              />
              <span className="text-[10px] text-slate-400">
                以空格分隔。支持任意自定义文字标签，将依次标注在各周期的刻度上。
              </span>
            </div>

            {/* Step Presets Buttons */}
            <div className="flex flex-col gap-1 pt-1">
              <span className="text-slate-500 font-medium">常用步长预设:</span>
              <div className="flex flex-wrap gap-1">
                {STEP_PRESETS.map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => handleStepChange(p.val)}
                    className="px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-[11px] font-mono cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Footer / Note */}
          <div className="flex flex-col gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Hash className="w-3.5 h-3.5 text-emerald-500" />
              <span>底部图注与半周期标尺 (Foot)</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 font-medium">底部注释说明 (Foot Text):</label>
              <input
                type="text"
                value={foot.text || ''}
                onChange={(e) => onFootChange({ ...foot, text: e.target.value })}
                placeholder="例如: 1 tick = 1.0 ns (1.0 GHz Reference)"
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-medium"
              />
            </div>

            {/* Foot Tock (Half-cycle ticks) */}
            <div className="flex flex-col gap-1 pt-1">
              <label className="text-slate-500 font-medium">底部半周期刻度 (tock, 可选):</label>
              <input
                type="number"
                value={typeof foot.tock === 'number' ? foot.tock : ''}
                onChange={(e) =>
                  onFootChange({
                    ...foot,
                    tock: e.target.value === '' ? undefined : parseInt(e.target.value),
                  })
                }
                placeholder="留空不启用 (例如: 0 代表半周期对齐标尺)"
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>快捷时间比例说明:</span>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    onFootChange({
                      ...foot,
                      text: '[基准: 1.0 GHz · 1 tick = 1.00 ns]',
                    })
                  }
                  className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 font-mono text-[10px] cursor-pointer"
                >
                  1GHz (1ns)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onFootChange({
                      ...foot,
                      text: '[基准: 800 MHz · 1 tick = 1.25 ns]',
                    })
                  }
                  className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-100 font-mono text-[10px] cursor-pointer"
                >
                  800MHz (1.25ns)
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Skin & Diagram Scaling */}
          <div className="flex flex-col gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Palette className="w-3.5 h-3.5 text-purple-500" />
              <span>皮肤与比例渲染 (Skin & Scale)</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 font-medium">WaveDrom 皮肤风格:</label>
                <select
                  value={config.skin || 'default'}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      skin: e.target.value as any,
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs cursor-pointer font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="☀️ 浅色经典 & 论文出版" className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold">
                    {AVAILABLE_SKINS.filter((s) => s.category === 'light').map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                        {s.name} ({s.enName})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🌙 科技暗色 & 极客赛博" className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold">
                    {AVAILABLE_SKINS.filter((s) => s.category === 'dark').map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                        {s.name} ({s.enName})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="📐 高密度紧凑排版" className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold">
                    {AVAILABLE_SKINS.filter((s) => s.category === 'compact').map((s) => (
                      <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                        {s.name} ({s.enName})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-slate-500 font-medium">水平拉伸 (hscale):</label>
                <select
                  value={config.hscale || 1}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      hscale: parseInt(e.target.value) || 1,
                    })
                  }
                  className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono cursor-pointer"
                >
                  <option value={1}>1x (标准宽度)</option>
                  <option value={2}>2x (宽波形)</option>
                  <option value={3}>3x (超宽波形)</option>
                </select>
              </div>
            </div>

            {onOpenClockDomainModal && (
              <button
                type="button"
                onClick={onOpenClockDomainModal}
                className="mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold cursor-pointer transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>打开多时钟域计算器 (1GHz vs 800MHz)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
