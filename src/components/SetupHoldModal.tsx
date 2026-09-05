import React, { useState } from 'react';
import { Clock, X, Check, Sparkles, ArrowRight, ShieldCheck, HelpCircle, Layers, ZoomIn } from 'lucide-react';
import { SignalItem, EdgeAnnotation, HeadFootConfig, DiagramConfig } from '../types';
import { useI18n } from '../lib/i18n';

interface SetupHoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (
    signals: SignalItem[],
    edges: EdgeAnnotation[],
    totalCycles: number,
    head: HeadFootConfig,
    foot: HeadFootConfig,
    replaceExisting: boolean,
    configUpdates?: Partial<DiagramConfig>
  ) => void;
}

interface PresetTiming {
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  tsu: string;
  th: string;
  clkFreq: string;
  stepNs: string;
}

const PRESET_TIMINGS: PresetTiming[] = [
  {
    name: '通用数字 IC / FPGA 建立保持',
    nameEn: 'General Digital IC / FPGA Margins',
    desc: '常见于 200MHz~500MHz 同步电路接口',
    descEn: 'Common for 200MHz~500MHz synchronous interfaces',
    tsu: 't_setup ≥ 2.5ns',
    th: 't_hold ≥ 1.5ns',
    clkFreq: '400 MHz',
    stepNs: '1.25',
  },
  {
    name: '高速 DDR / SDRAM 接口',
    nameEn: 'High-Speed DDR / SDRAM Interface',
    desc: '亚纳秒级高精度紧凑时序窗口',
    descEn: 'Sub-nanosecond tight precision timing window',
    tsu: 't_IS ≥ 0.6ns',
    th: 't_IH ≥ 0.4ns',
    clkFreq: '1.0 GHz',
    stepNs: '0.25',
  },
  {
    name: 'SPI Master (Mode 0) 建立保持',
    nameEn: 'SPI Master (Mode 0) Timing',
    desc: '标准全双工串行接口在上升沿的采样窗口',
    descEn: 'Standard serial interface sample window on rising edge',
    tsu: 't_SU(D) ≥ 5.0ns',
    th: 't_HD(D) ≥ 3.0ns',
    clkFreq: '50 MHz',
    stepNs: '5.0',
  },
  {
    name: 'I2C 快速模式 (Fast-Mode)',
    nameEn: 'I2C Fast-Mode Specification',
    desc: '标准开漏总线建立保持规范',
    descEn: 'Standard open-drain bus timing requirements',
    tsu: 't_SU;DAT ≥ 100ns',
    th: 't_HD;DAT ≥ 50ns',
    clkFreq: '400 kHz',
    stepNs: '50.0',
  },
];

export const SetupHoldModal: React.FC<SetupHoldModalProps> = ({
  isOpen,
  onClose,
  onApply,
}) => {
  const { lang, t } = useI18n();
  const [clkName, setClkName] = useState('CLK');
  const [dataName, setDataName] = useState('DIN (Data)');
  const [setupLabel, setSetupLabel] = useState('t_setup ≥ 2.5ns');
  const [holdLabel, setHoldLabel] = useState('t_hold ≥ 1.5ns');
  const [includeWindowTrack, setIncludeWindowTrack] = useState(true);
  const [includeTotalWindowArrow, setIncludeTotalWindowArrow] = useState(false);
  const [hscaleLevel, setHscaleLevel] = useState<number>(2);
  const [dataPhaseDelay, setDataPhaseDelay] = useState(0);
  const [replaceExisting, setReplaceExisting] = useState(true);

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApplyPreset = (p: PresetTiming) => {
    setSetupLabel(p.tsu);
    setHoldLabel(p.th);
  };

  const handleGenerate = () => {
    // Standard aligned 14-cycle professional timing window
    const totalCycles = 14;

    // 1. Clock Signal: rising edge at cycle 6 with node 'a'
    const clkSignal: SignalItem = {
      id: `sig_clk_${Date.now()}`,
      name: clkName,
      wave: '0.p.p.p.p.p.0.',
      node: '......a.......',
      period: 1,
    };

    // 2. Data Signal with stable window across rising edge 'a'
    // Node 'b' is start of stable data at cycle 3 (setup time window start)
    // Node 'c' is end of stable data at cycle 9 (hold time window end)
    // Wave length is exactly 14 characters to align perfectly with CLK and TIMING_WINDOW
    let dataWave = 'x..3......4.x.';
    let dataNodes = '...b.....c....';

    // Character shifting without WaveDrom phase bug (preserves 100% lane length alignment)
    if (dataPhaseDelay > 0) {
      const shift = Math.min(2, Math.max(1, Math.round(dataPhaseDelay)));
      dataWave = ('.' .repeat(shift) + 'x.3......4.x.').slice(0, totalCycles).padEnd(totalCycles, '.');
      dataNodes = ('.' .repeat(shift) + '..b.....c....').slice(0, totalCycles).padEnd(totalCycles, '.');
    }

    const dataSignal: SignalItem = {
      id: `sig_data_${Date.now() + 1}`,
      name: dataName,
      wave: dataWave,
      data: [lang === 'zh' ? '有效数据 (D_IN)' : 'Valid Data (D_IN)', lang === 'zh' ? '下一数据' : 'Next Data'],
      node: dataNodes,
      period: 1,
    };

    const newSignals: SignalItem[] = [clkSignal, dataSignal];

    // 3. Optional Setup & Hold Visual Margin Track (strictly 14 chars, perfectly aligned)
    if (includeWindowTrack) {
      newSignals.push({
        id: `sig_win_${Date.now() + 2}`,
        name: lang === 'zh' ? 'MARGIN (裕量窗口)' : 'MARGIN (Window)',
        wave: 'x..4...5..x...',
        data: [lang === 'zh' ? 't_su 建立窗口' : 't_su Setup Window', lang === 'zh' ? 't_h 保持窗口' : 't_h Hold Window'],
        period: 1,
      });
    }

    // 4. Register Output Q Signal (shows stable output after clock rising edge)
    newSignals.push({
      id: `sig_q_${Date.now() + 3}`,
      name: lang === 'zh' ? 'Q (触发器输出)' : 'Q (Flip-Flop Output)',
      wave: '0.....1.......',
      period: 1,
    });

    // 5. Create Clean Edges: t_setup on the left (b ~> a), t_hold on the right (a ~> c)
    // Separation prevents labels from overlapping each other!
    const newEdges: EdgeAnnotation[] = [
      {
        id: `edge_su_${Date.now()}`,
        source: 'b',
        target: 'a',
        arrow: '~>',
        label: setupLabel,
      },
      {
        id: `edge_h_${Date.now() + 1}`,
        source: 'a',
        target: 'c',
        arrow: '~>',
        label: holdLabel,
      },
    ];

    if (includeTotalWindowArrow) {
      newEdges.push({
        id: `edge_tot_${Date.now() + 2}`,
        source: 'b',
        target: 'c',
        arrow: '<->',
        label: lang === 'zh' ? '有效数据窗口' : 'Valid Data Window',
      });
    }

    const head: HeadFootConfig = {
      text: lang === 'zh'
        ? '触发器建立与保持时间窗口规范 (Setup & Hold Timing Margins)'
        : 'Flip-Flop Setup & Hold Timing Margins Specification',
      tick: 0,
      every: 1,
    };

    const foot: HeadFootConfig = {
      text: lang === 'zh'
        ? `[时序裕量规范]: ${setupLabel} · ${holdLabel} · 数据在时钟采样沿前后保持稳定，禁止产生亚稳态`
        : `[Timing Specs]: ${setupLabel} · ${holdLabel} · Data must remain stable around clock edge to prevent metastability`,
    };

    onApply(newSignals, newEdges, totalCycles, head, foot, replaceExisting, {
      hscale: hscaleLevel,
    });
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
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                {lang === 'zh' ? '建立与保持时间窗口 (Setup & Hold) 延时向导' : 'Setup & Hold Timing Margins Wizard'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === 'zh'
                  ? '一键生成标准时序裕量图：自动计算参考时钟沿、数据延时偏移与 t_setup / t_hold 测量箭头'
                  : 'Auto-generate standard timing margin diagram with clock edge, data skew, and t_setup / t_hold arrows'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5 text-xs">
          {/* Quick Concept Banner */}
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'zh' ? '数字 IC 建立与保持时间延时规范：' : 'Digital IC Setup & Hold Rules:'}</span>
            </div>
            <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
              <strong>{lang === 'zh' ? '建立时间 (t_setup)' : 'Setup Time (t_setup)'}</strong>
              {lang === 'zh'
                ? '：数据信号在时钟触发沿（上升沿）到达前必须保持稳定的最小时间；'
                : ': Minimum time data must be stable before the clock triggering edge; '}
              <br />
              <strong>{lang === 'zh' ? '保持时间 (t_hold)' : 'Hold Time (t_hold)'}</strong>
              {lang === 'zh'
                ? '：数据信号在时钟触发沿到达后必须继续保持稳定的最小时间。任何在此窗口内的跳变均会导致寄存器进入亚稳态。'
                : ': Minimum time data must remain stable after the clock triggering edge. Violations cause metastability.'}
            </p>
          </div>

          {/* Quick Protocol Presets */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {lang === 'zh' ? '常用工业协议建立/保持延时预设：' : 'Industry Standard Protocol Presets:'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_TIMINGS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-600 bg-slate-50 dark:bg-slate-800/40 text-left transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    {lang === 'zh' ? p.name : p.nameEn}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {lang === 'zh' ? p.desc : p.descEn}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 font-mono text-[10px] text-purple-700 dark:text-purple-300">
                    <span className="bg-purple-100 dark:bg-purple-950 px-1.5 py-0.5 rounded">
                      {p.tsu}
                    </span>
                    <span className="bg-purple-100 dark:bg-purple-950 px-1.5 py-0.5 rounded">
                      {p.th}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Clock & Data Signal Names */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {lang === 'zh' ? '参考时钟信号名 (CLK):' : 'Reference Clock Signal (CLK):'}
              </label>
              <input
                type="text"
                value={clkName}
                onChange={(e) => setClkName(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {lang === 'zh' ? '数据信号名 (DATA):' : 'Data Signal Name (DATA):'}
              </label>
              <input
                type="text"
                value={dataName}
                onChange={(e) => setDataName(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
              />
            </div>

            {/* Setup Time & Hold Time labels */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {lang === 'zh' ? '建立时间延时说明 (t_setup):' : 'Setup Time Label (t_setup):'}
              </label>
              <input
                type="text"
                value={setupLabel}
                onChange={(e) => setSetupLabel(e.target.value)}
                placeholder={lang === 'zh' ? '例如: t_setup ≥ 2.5ns' : 'e.g.: t_setup ≥ 2.5ns'}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-purple-700 dark:text-purple-300 font-bold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {lang === 'zh' ? '保持时间延时说明 (t_hold):' : 'Hold Time Label (t_hold):'}
              </label>
              <input
                type="text"
                value={holdLabel}
                onChange={(e) => setHoldLabel(e.target.value)}
                placeholder={lang === 'zh' ? '例如: t_hold ≥ 1.5ns' : 'e.g.: t_hold ≥ 1.5ns'}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-purple-700 dark:text-purple-300 font-bold"
              />
            </div>

            {/* Data Signal Delay / Phase */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300">
                {lang === 'zh' ? '数据相对时钟延时 (Phase Skew):' : 'Data Phase Skew:'}
              </label>
              <select
                value={dataPhaseDelay}
                onChange={(e) => setDataPhaseDelay(parseFloat(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs"
              >
                <option value="0">{lang === 'zh' ? '0 (基准对齐 · 首尾对齐)' : '0 (Aligned Reference)'}</option>
                <option value="0.25">{lang === 'zh' ? '+0.25 拍 (微小延迟)' : '+0.25 Cycle Delay'}</option>
                <option value="0.5">{lang === 'zh' ? '+0.5 拍 (半周期延迟)' : '+0.5 Cycle Delay'}</option>
                <option value="0.75">{lang === 'zh' ? '+0.75 拍' : '+0.75 Cycle Delay'}</option>
                <option value="1">{lang === 'zh' ? '+1.0 拍 (整拍延迟)' : '+1.0 Cycle Delay'}</option>
              </select>
              <span className="text-[10px] text-slate-400">
                {lang === 'zh'
                  ? '默认推荐 0，所有信号首尾垂直对齐；建立与保持由时序状态点界定。'
                  : 'Recommended 0 for standard vertical alignment; setup/hold is bounded by timing nodes.'}
              </span>
            </div>

            {/* Horizontal Scale Selector to prevent cramping */}
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <ZoomIn className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>{lang === 'zh' ? '时钟周期横向宽度 (hscale):' : 'Cycle Width (hscale):'}</span>
              </label>
              <select
                value={hscaleLevel}
                onChange={(e) => setHscaleLevel(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs text-purple-700 dark:text-purple-300 font-bold"
              >
                <option value="2">{lang === 'zh' ? '2x 宽度 (推荐 · 宽裕清晰)' : '2x Width (Recommended · Spaced)'}</option>
                <option value="3">{lang === 'zh' ? '3x 宽度 (超大舒展 · 适合长标注)' : '3x Width (Spacious · Long labels)'}</option>
                <option value="1">{lang === 'zh' ? '1x 宽度 (紧凑原始尺寸)' : '1x Width (Compact)'}</option>
              </select>
              <span className="text-[10px] text-slate-400">
                {lang === 'zh'
                  ? '自动放大横向间距，给测量箭头和说明文字提供充足的呼吸空间。'
                  : 'Expands horizontal space, giving arrows and text annotations clear breathing room.'}
              </span>
            </div>

            {/* Options */}
            <div className="sm:col-span-2 flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeWindowTrack}
                  onChange={(e) => setIncludeWindowTrack(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {lang === 'zh' ? '生成专用建立保持窗口指示轨 (TIMING_WINDOW)' : 'Generate Dedicated Window Track (TIMING_WINDOW)'}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeTotalWindowArrow}
                  onChange={(e) => setIncludeTotalWindowArrow(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {lang === 'zh'
                    ? '生成总有效采样窗口额外双向箭头 (<->)'
                    : 'Generate Overall Sample Window Arrow (<->)'}
                </span>
              </label>
            </div>
          </div>

          {/* Insertion Mode */}
          <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {lang === 'zh' ? '生成方式:' : 'Insert Mode:'}
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="replace"
                checked={!replaceExisting}
                onChange={() => setReplaceExisting(false)}
                className="text-purple-600"
              />
              <span>{lang === 'zh' ? '追加到现有波形顶部' : 'Append on Top of Current'}</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="replace"
                checked={replaceExisting}
                onChange={() => setReplaceExisting(true)}
                className="text-purple-600"
              />
              <span>{lang === 'zh' ? '作为新时序替换当前波形' : 'Replace Entire Diagram'}</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="text-xs text-slate-500">
            {lang === 'zh'
              ? '将自动建立 CLK、DATA、建立时间延时箭头与保持时间延时箭头'
              : 'Auto generates CLK, DATA, t_setup and t_hold arrows'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 font-medium cursor-pointer"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md shadow-purple-500/20 cursor-pointer transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>{lang === 'zh' ? '一键生成建立与保持时序' : 'Generate Setup & Hold Diagram'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
