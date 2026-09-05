import React, { useEffect } from 'react';
import {
  X,
  FileText,
  Tag,
  ArrowRight,
  Layers,
  Sparkles,
  HelpCircle,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';

interface TextAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPhaseTrack: () => void;
  onAddSampleEdge: () => void;
}

export const TextAnnotationModal: React.FC<TextAnnotationModalProps> = ({
  isOpen,
  onClose,
  onAddPhaseTrack,
  onAddSampleEdge,
}) => {
  const { lang } = useI18n();

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                {lang === 'zh'
                  ? '如何在 WaveDrom 波形图中添加丰富文字说明'
                  : 'How to Add Rich Text Annotations in WaveDrom'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'zh'
                  ? '为什么节点只支持一个字母？如何打破限制添加任意长文字？'
                  : 'Why do nodes only accept 1 character? How to add long descriptive text?'}
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
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
          {/* Question Answer Box */}
          <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 text-xs">
              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {lang === 'zh'
                  ? '解答：为什么标注节点 (node) 表面上只支持一个字母？'
                  : 'Q&A: Why do node anchors only support one character?'}
              </span>
            </div>
            <p className="text-[11px] text-amber-950/80 dark:text-amber-300/80 leading-relaxed">
              {lang === 'zh' ? (
                <>
                  在 WaveDrom 官方协议中，<code>node</code> 是与时间刻度一一对应的<strong>位置锚点（Anchor）</strong>，就像地图上的坐标代号（A点、B点）。如果在一个周期里放多个字母，会被解析为跨越了多个周期。
                  <br />
                  <strong>但是！WaveDrom 提供了 4 种强大的方式来展示任意长度的中英文文字说明：</strong>
                </>
              ) : (
                <>
                  In the WaveDrom specification, <code>node</code> symbols are <strong>spatial position anchors</strong> mapped 1:1 to time steps (e.g. point A, point B). Multiple letters represent consecutive time steps.
                  <br />
                  <strong>However, WaveDrom offers 4 flexible methods to display full-length descriptive annotations:</strong>
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
                  ? '方式一：时序箭头上的长文本标注 (支持任意中文/参数/公式)'
                  : 'Method 1: Edge Arrow Labels (supports arbitrary text, parameters, formulas)'}
              </span>
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
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {lang === 'zh' ? (
                <>
                  只要在起点打一个节点代号（如 <code>a</code>），终点打一个代号（如 <code>b</code>），用连线连接 <code>a ~&gt; b</code> 时，文字标注可以写任意长度！例如：
                  <span className="font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded mx-1">
                    t_setup ≥ 2.5ns
                  </span>
                  或
                  <span className="font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded mx-1">
                    跨时钟域握手采样有效
                  </span>
                  ，文字会直接优美地浮现在波形箭头上。
                </>
              ) : (
                <>
                  Assign an anchor at the start point (e.g. <code>a</code>) and endpoint (e.g. <code>b</code>), then connect them with an edge <code>a ~&gt; b</code>. The label can be any length, such as:
                  <span className="font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded mx-1">
                    t_setup ≥ 2.5ns
                  </span>
                  or
                  <span className="font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded mx-1">
                    CDC Handshake Valid
                  </span>
                  . The text floats cleanly along the arrow.
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
                {lang === 'zh'
                  ? '方式二：跨周期阶段文字说明轨 (彩色条带直观分区)'
                  : 'Method 2: Multi-Cycle Phase Track (Colored Section Bands)'}
              </span>
              <button
                type="button"
                onClick={() => {
                  onAddPhaseTrack();
                  onClose();
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 cursor-pointer shadow-2xs text-[11px]"
              >
                <Plus className="w-3 h-3" />
                <span>{lang === 'zh' ? '一键添加阶段说明轨' : 'Add Phase Track'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {lang === 'zh' ? (
                <>
                  在波形中添加一行信号作为「阶段说明轨」，使用彩色总线符号（如 <code>2....3....4....</code>），在总线数据中填入说明文字（如 <code>['握手阶段', '数据传输 (0x88)', '应答校验']</code>）。
                  WaveDrom 会自动将每个阶段渲染成带文字的彩色条带，一目了然！
                </>
              ) : (
                <>
                  Add a signal row as a "Phase Track" using multi-state bus notation (e.g. <code>2....3....4....</code>), and provide phase labels in the bus data field (e.g. <code>['Handshake', 'Payload (0x88)', 'CRC Check']</code>). WaveDrom renders them as colored bands.
                </>
              )}
            </p>
          </div>

          {/* Method 3: Bus Data Hex/String Values */}
          <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-emerald-200 dark:border-emerald-800/70 space-y-2">
            <span className="font-bold text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-mono text-[11px]">
                3
              </span>
              {lang === 'zh'
                ? '方式三：总线数据直接标注文字 (如 0x55, READ_CMD, ACK)'
                : 'Method 3: Bus Data Values (e.g. 0x55, READ_CMD, ACK)'}
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {lang === 'zh' ? (
                <>
                  对任意包含总线 <code>=</code> 或数字 <code>2..9</code> 状态的信号，点击信号行上的<strong>「总线数据」</strong>按钮，即可为每一个总线状态分配任意文本。文字会自动居中渲染在波形总线内部。
                </>
              ) : (
                <>
                  For any signal with bus <code>=</code> or states <code>2..9</code>, click the <strong>Bus Data</strong> button on the signal row to assign text to each state. Text is rendered centered inside the bus block.
                </>
              )}
            </p>
          </div>

          {/* Method 4: Head & Foot */}
          <div className="p-4 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center font-mono text-[11px]">
                4
              </span>
              {lang === 'zh'
                ? '方式四：顶部主标题与底部详细图注 (Head & Foot)'
                : 'Method 4: Header Title & Footer Notes (Head & Foot)'}
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {lang === 'zh' ? (
                <>
                  在「全局配置与标尺」中，可在 <code>head.text</code> 输入波形图的主标题，在 <code>foot.text</code> 输入详细测试说明、参数条件或时间基准说明（如 <code>注: 1 tick = 0.25ns; CLK2相移 45度</code>）。
                </>
              ) : (
                <>
                  In "Config & Timebase", use <code>head.text</code> for the diagram's main title, and <code>foot.text</code> for footnotes, test conditions, or timing baseline descriptions (e.g. <code>Note: 1 tick = 0.25ns; CLK2 phase 45°</code>).
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <span className="text-[11px] text-slate-500">
            {lang === 'zh' ? '支持一键添加说明轨与连线' : 'Quickly add phase tracks and edges'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-800 dark:bg-slate-200 dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-white transition-colors cursor-pointer"
          >
            {lang === 'zh' ? '我知道了，返回编辑' : 'Got it, return to editor'}
          </button>
        </div>
      </div>
    </div>
  );
};
