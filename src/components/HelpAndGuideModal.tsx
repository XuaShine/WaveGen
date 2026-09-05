import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  FileText,
  MousePointer,
  Cpu,
  ArrowRight,
  HelpCircle,
  Plus,
  Zap,
  MoveVertical,
  Columns,
  Crosshair,
  Type,
  Minimize2,
  Maximize2,
  Clock,
  FoldHorizontal,
} from 'lucide-react';
import { WAVE_SYMBOLS } from '../data/symbols';
import { useI18n } from '../lib/i18n';

interface HelpAndGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPhaseTrack?: () => void;
  onAddSampleEdge?: () => void;
  initialTab?: 'symbols' | 'textGuide' | 'layoutAndHeight' | 'shortcuts';
}

export const HelpAndGuideModal: React.FC<HelpAndGuideModalProps> = ({
  isOpen,
  onClose,
  onAddPhaseTrack,
  onAddSampleEdge,
  initialTab = 'symbols',
}) => {
  const { lang, t } = useI18n();
  const [activeTab, setActiveTab] = useState<'symbols' | 'textGuide' | 'layoutAndHeight' | 'shortcuts'>(initialTab);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-3xl h-[680px] max-h-[88vh] min-h-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {lang === 'zh' ? 'WaveGen 硬件时序图完全指南' : 'WaveGen Timing Diagram Studio Guide'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'zh'
                  ? '时序波形符号速查、时序连线与长文本标注、波形高度调节与视图布局、高效快捷键技巧'
                  : 'Timing symbols cheatsheet, edge & text annotations, height & layout controls, and productivity tips'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('symbols')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'symbols'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <span>{lang === 'zh' ? '时序符号速查' : 'Wave Symbols'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('textGuide')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'textGuide'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '连线与文字标注' : 'Edges & Notes'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('layoutAndHeight')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'layoutAndHeight'
                ? 'border-cyan-600 text-cyan-600 dark:text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <MoveVertical className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '视图与高度调节' : 'Height & Layout'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'shortcuts'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '快捷键与效率技巧' : 'Shortcuts & Tips'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-slate-700 dark:text-slate-300">
          {/* TAB 1: SYMBOLS CHEATSHEET */}
          {activeTab === 'symbols' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-950 dark:text-blue-300 leading-relaxed">
                {lang === 'zh'
                  ? '提示：在时序矩阵方块上单击可循环切换常用电平；右键点击或点击方块上的调色盘可以直接选用任意符号；拖拽鼠标可连续刷入相同电平。'
                  : 'Tip: Click any matrix cell to cycle primary levels; right-click or use the cell palette to choose any symbol; drag across cells to paint levels continuously.'}
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-3 w-16 text-center">{lang === 'zh' ? '符号' : 'Char'}</th>
                      <th className="py-2.5 px-3 w-28">{lang === 'zh' ? '类型' : 'Type'}</th>
                      <th className="py-2.5 px-3">{lang === 'zh' ? '功能与渲染效果描述' : 'Rendering Description'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {WAVE_SYMBOLS.map((item) => (
                      <tr key={item.symbol} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded font-mono font-bold text-xs ${item.badgeBg}`}>
                            {item.symbol}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                          {lang === 'zh' ? (item.nameZh || item.name) : item.name}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                          {lang === 'zh' ? (item.descZh || item.desc) : item.desc}
                        </td>
                      </tr>
                    ))}
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 bg-amber-50/30 dark:bg-amber-950/20">
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          h / l
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-amber-900 dark:text-amber-200">
                        {lang === 'zh' ? '垂直方波 (High/Low)' : 'Square Pulse (High/Low)'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                        {lang === 'zh'
                          ? '垂直直上直下高电平 / 低电平（无斜坡过渡），用于多时钟域严格方波对齐。'
                          : 'Zero-rise/fall straight square levels without transition slopes, ideal for synchronous cross-domain alignment.'}
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                          |
                        </span>
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                        {lang === 'zh' ? '时序断点 / 省略' : 'Waveform Break'}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                        {lang === 'zh'
                          ? '在波形中绘制双斜折断虚线，表示长时间等待或省略若干时钟周期。'
                          : 'Renders a jagged break line across waves indicating omitted idle intervals.'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TEXT GUIDE & ANNOTATIONS */}
          {activeTab === 'textGuide' && (
            <div className="space-y-4">
              {/* Question Answer Box */}
              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 text-xs">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {lang === 'zh'
                      ? '为什么标注节点 (node) 表面上只支持一个字母？'
                      : 'Why does a node symbol accept only single letters?'}
                  </span>
                </div>
                <p className="text-[11px] text-amber-950/80 dark:text-amber-300/80 leading-relaxed">
                  {lang === 'zh' ? (
                    <>
                      在 WaveDrom 官方协议中，<code>node</code> 是与时钟刻度一一对应的<strong>位置坐标代号</strong>（例如 A点、B点）。
                      如果在同一个周期放多个字母，会被解析为跨越了多个周期。<br />
                      <strong>但是！WaveDrom 提供了以下 4 种强大的方式展示任意长度的中英文文字说明：</strong>
                    </>
                  ) : (
                    <>
                      In the WaveDrom specification, <code>node</code> characters represent exact single-cycle coordinate anchors (like anchor A, B).
                      Placing multiple letters in one slot spreads across adjacent clock ticks.<br />
                      <strong>However, WaveDrom supports four dedicated ways to display rich, full-length annotations:</strong>
                    </>
                  )}
                </p>
              </div>

              {/* Method 1: Edge Arrow Text */}
              <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-purple-200 dark:border-purple-800/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-mono text-[11px]">
                      1
                    </span>
                    {lang === 'zh'
                      ? '方式一：时序箭头上的长文本标注 (建立/保持时间、约束公式)'
                      : 'Method 1: Edge Arrow Text Labels (Tsu, Thold, Protocols)'}
                  </span>
                  {onAddSampleEdge && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddSampleEdge();
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 cursor-pointer shadow-2xs text-[11px]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{lang === 'zh' ? '插入示例时序连线' : 'Insert Sample Edge'}</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'zh' ? (
                    <>
                      在起点打一个节点代号（如 <code>a</code>），终点打一个代号（如 <code>b</code>），用连线连接 <code>a ~&gt; b</code> 时，文字标注可以写任意长度！例如：
                      <span className="font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded mx-1">
                        t_setup ≥ 2.5ns
                      </span>
                      或
                      <span className="font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded mx-1">
                        握手数据采样有效
                      </span>
                      ，文字会悬浮在波形箭头上方。
                    </>
                  ) : (
                    <>
                      Place coordinate nodes on the source cycle (e.g. <code>a</code>) and destination cycle (e.g. <code>b</code>). An edge rule like <code>a ~&gt; b</code> can hold unlimited text, such as <code>t_setup ≥ 2.5ns</code> or <code>Handshake Ack</code>.
                    </>
                  )}
                </p>
              </div>

              {/* Method 2: Phase Text Track */}
              <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-blue-200 dark:border-blue-800/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-mono text-[11px]">
                      2
                    </span>
                    {lang === 'zh' ? '方式二：阶段说明轨 (Phase Text Track)' : 'Method 2: Phase Annotation Track'}
                  </span>
                  {onAddPhaseTrack && (
                    <button
                      type="button"
                      onClick={() => {
                        onAddPhaseTrack();
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 cursor-pointer shadow-2xs text-[11px]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{lang === 'zh' ? '立即添加阶段说明轨' : 'Add Phase Track'}</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'zh' ? (
                    <>
                      添加一条特殊总线信号，波形填为 <code>=...=...</code>，然后为每个阶段填入长文字（例如：
                      <span className="font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded mx-1">空闲 IDLE</span>、
                      <span className="font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded mx-1">地址传输阶段</span>、
                      <span className="font-mono text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded mx-1">突发数据读取</span>
                      ）。整条阶段文字轨会清晰地为下方所有信号进行时钟阶段划分！
                    </>
                  ) : (
                    <>
                      Add a dedicated bus track with <code>=...=...</code>, then fill in phase strings like <code>IDLE</code>, <code>ADDR_TRANSACTION</code>, <code>BURST_READ</code>. This divides the entire timing diagram into distinct phases!
                    </>
                  )}
                </p>
              </div>

              {/* Method 3: Bus Data Mapping */}
              <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-emerald-200 dark:border-emerald-800/70 space-y-2">
                <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-mono text-[11px]">
                    3
                  </span>
                  {lang === 'zh' ? '方式三：总线数据块文字 (Bus Data)' : 'Method 3: Bus Data Block Labels'}
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'zh' ? (
                    <>
                      当使用总线符号（<code>=</code> 或彩色总线 <code>2..9</code>）时，点击信号卡片右上角“总线数据”按钮，可以填入任意文字数组（如 <code>0x8000</code>、<code>CMD_WRITE</code>、<code>CRC32_OK</code>），文字会自动居中显示在总线块内。
                    </>
                  ) : (
                    <>
                      When using bus levels (<code>=</code> or color buses <code>2..9</code>), click the signal card's &quot;Bus Data&quot; button to enter labels (like <code>0x8000</code>, <code>CMD_WRITE</code>, <code>CRC32_OK</code>). They render centered inside each bus section.
                    </>
                  )}
                </p>
              </div>

              {/* Method 4: Head & Foot notes */}
              <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center font-mono text-[11px]">
                    4
                  </span>
                  {lang === 'zh' ? '方式四：顶部标题与底部注释 (Head / Foot Notes)' : 'Method 4: Header Title & Footer Notes'}
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'zh' ? (
                    <>
                      在波形预览区的“标尺配置”中，可以设置 <code>head.text</code>（例如“SPI 模式0 发送时序图”）以及 <code>foot.text</code>（例如“注：在 SCK 下降沿前必须满足至少 2.5ns 建立时间”）。
                    </>
                  ) : (
                    <>
                      In the ruler config modal, configure <code>head.text</code> (e.g. &quot;SPI Mode 0 Timing Diagram&quot;) and <code>foot.text</code> (e.g. &quot;Note: Hold time at least 1.5ns before falling edge&quot;).
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: LAYOUT & HEIGHT CONTROLS */}
          {activeTab === 'layoutAndHeight' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-cyan-50/70 dark:bg-cyan-950/30 rounded-xl border border-cyan-200 dark:border-cyan-800/60 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-cyan-900 dark:text-cyan-200 text-xs">
                  <MoveVertical className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span>{lang === 'zh' ? '波形高度可调节全功能指南' : 'Adjustable Waveform Height Controls'}</span>
                </div>
                <p className="text-[11px] text-cyan-950/80 dark:text-cyan-300/80 leading-relaxed">
                  {lang === 'zh'
                    ? '为了适应笔记本小屏与超宽带鱼屏的不同使用场景，波形渲染卡片支持多维度灵活的高度调节：'
                    : 'Waveform rendering supports comprehensive height controls suited for both laptop screens and ultra-wide displays:'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Feature 1: Drag handle */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <MoveVertical className="w-4 h-4 text-blue-600" />
                    <span>{lang === 'zh' ? '底部拖拽调整手柄' : 'Bottom Drag Handle'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? '在波形卡片最底部有条横向手柄，按住鼠标上下拖拽即可无级调整像素高度；拖拽过程中会实时显示当前高度像素浮标；双击手柄可直接恢复内容自适应。'
                      : 'Drag the horizontal grip at the bottom of the waveform card to resize smoothly. The exact pixel height is displayed live. Double-click the handle to restore auto fit.'}
                  </p>
                </div>

                {/* Feature 2: Fill to bottom */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <Maximize2 className="w-4 h-4 text-purple-600" />
                    <span>{lang === 'zh' ? '一键占满底部 (Fill Height)' : 'Fill to Bottom'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? '点击工具栏上的“占满底部”按钮，波形预览区会自动撑满右侧/下方可用高度，享受最大化的波形视野；再次点击可一键切回自适应模式。'
                      : 'Click &quot;Fill&quot; on the toolbar to expand the preview container all the way to the bottom edge. Click again to return to content-fit mode.'}
                  </p>
                </div>

                {/* Feature 3: Steppers & Input */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <Minimize2 className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'zh' ? '步进微调与像素直填' : 'Steppers & Direct Pixel Input'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? '工具栏上的 [-] 与 [+] 按钮每次步进增减 40px；点击高度数值徽标可展开下拉框，提供 200px/320px/440px/600px/800px 快捷预设，并支持直接键入任意数值。'
                      : 'Use [-] and [+] to adjust by 40px steps. Click the height badge to choose from presets (200px..800px) or type exact pixels directly into the input box.'}
                  </p>
                </div>

                {/* Feature 4: Layouts */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <Columns className="w-4 h-4 text-amber-600" />
                    <span>{lang === 'zh' ? '左右分屏与比例快速切换' : 'Split View & Ratio Presets'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? '在左右分屏模式下，波形实时渲染在右侧；工具栏提供 35%、50%、60%、70% 一键比例预设，也可以鼠标按住中轴分隔条自由拖拽调整比例。'
                      : 'In split view, the right pane displays the live waveform. Quick buttons switch between 35%, 50%, 60%, 70% ratios, or drag the divider bar.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SHORTCUTS & EFFICIENCY TIPS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>{lang === 'zh' ? '快速打拍 (+1D 延时寄存器)' : '+1D Pipeline Tap'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? '点击信号卡片左下角的“+1D”按钮，自动复制当前信号并推迟一拍（首周期填低电平），生成标准硬件流水线打拍信号（如 data_r1、ack_d1）。'
                      : 'Click &quot;+1D&quot; on any signal card to duplicate and shift by 1 clock cycle, creating standard pipeline register taps (e.g. data_r1, ack_d1).'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <FoldHorizontal className="w-4 h-4 text-amber-600" />
                    <span>{lang === 'zh' ? '智能收起长段静止周期' : 'Smart Fold Idle Cycles'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? '在时序矩阵顶部点击“智能收起周期”，算法自动分析全部信号并折叠长段无变化的空白周期，大幅压缩画面宽度；点击折叠标记方块可随时单独展开。'
                      : 'Click &quot;Fold Cycles&quot; to collapse multi-cycle idle intervals across all signals. Click the folded cycle chip anytime to expand it.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <Crosshair className="w-4 h-4 text-violet-600" />
                    <span>{lang === 'zh' ? '垂直对齐辅助虚线' : 'Timing Crosshair Guide'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? '在波形工具栏开启“对齐虚线”后，鼠标在波形图上移动时会显示贯穿所有信号的垂直高亮辅助线与 T[x] 周期指示，时钟沿对齐检查一目了然。'
                      : 'Enable the crosshair tool in the waveform toolbar to show a vertical alignment guideline and cycle badge T[x] across all signals.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    <Type className="w-4 h-4 text-indigo-600" />
                    <span>{lang === 'zh' ? '模块化独立字体配置' : 'Independent Font Customizer'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? '支持为标题文字、信号名称与总线数据、页脚注释分别指定不同的字体族（如 JetBrains Mono、Fira Code、Inter、Noto Sans）与粗细，论文出版与工程汇报更专业。'
                      : 'Configure distinct font families and weights for diagram titles, signal labels/bus text, and footer notes independently.'}
                  </p>
                </div>
              </div>

              {/* Keyboard shortcuts table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {lang === 'zh' ? '常用快捷操作' : 'Keyboard & Mouse Shortcuts'}
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">{lang === 'zh' ? '撤销编辑' : 'Undo'}</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-mono font-bold">Ctrl + Z</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">{lang === 'zh' ? '重做编辑' : 'Redo'}</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-mono font-bold">Ctrl + Y</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">{lang === 'zh' ? '关闭弹窗' : 'Close Modal'}</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-mono font-bold">Esc</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">{lang === 'zh' ? '连续拖拽画笔' : 'Paint Brush'}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded font-mono text-[10px]">{lang === 'zh' ? '鼠标拖拽' : 'Drag Cells'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-2xs transition-colors"
          >
            {lang === 'zh' ? '知道了，开始绘制' : 'Got it, let\'s draw'}
          </button>
        </div>
      </div>
    </div>
  );
};
