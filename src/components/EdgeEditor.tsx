import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  CornerDownRight,
  Clock,
  GitCommit,
  X,
} from 'lucide-react';
import { EdgeAnnotation, SignalItem } from '../types';
import { useI18n } from '../lib/i18n';

interface EdgeEditorProps {
  edges: EdgeAnnotation[];
  signals: SignalItem[];
  totalCycles: number;
  onChange: (edges: EdgeAnnotation[]) => void;
  onUpdateSignalNode: (signalId: string, cycleIndex: number, tag: string) => void;
  onOpenTextGuide?: () => void;
  onOpenSetupHoldModal?: () => void;
  onAddPipelineTapSignal?: (signalId: string) => void;
}

const ARROW_TYPES: Array<{ value: EdgeAnnotation['arrow']; labelZh: string; labelEn: string; descZh: string; descEn: string }> = [
  { value: '->', labelZh: '直线单向 ->', labelEn: 'Straight ->', descZh: '直线实心箭头', descEn: 'Straight solid arrow' },
  { value: '~>', labelZh: '弧线单向 ~>', labelEn: 'Curved ~>', descZh: '曲线平滑箭头', descEn: 'Smooth curved arrow' },
  { value: '<->', labelZh: '双向测量 <->', labelEn: 'Bidir Measure <->', descZh: '双向测量箭头 (建立保持时间)', descEn: 'Bidirectional measurement arrow' },
  { value: '-~>', labelZh: '直折弧 -~>', labelEn: 'Bent Arc -~>', descZh: '先平直后弯曲箭头', descEn: 'Straight then curved' },
  { value: '<~>', labelZh: '双向曲线 <~>', labelEn: 'Bidir Curved <~>', descZh: '双向曲线连接', descEn: 'Bidirectional curve' },
  { value: '-|', labelZh: '直角终点 -|', labelEn: 'Right Angle -|', descZh: '直角挡板', descEn: 'Bar end' },
  { value: '|->', labelZh: '垂线引出 |->', labelEn: 'Vertical Tap |->', descZh: '从垂线引出的箭头', descEn: 'Stem arrow' },
];

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

export const EdgeEditor: React.FC<EdgeEditorProps> = ({
  edges,
  signals,
  totalCycles,
  onChange,
  onUpdateSignalNode,
  onOpenTextGuide,
  onOpenSetupHoldModal,
  onAddPipelineTapSignal,
}) => {
  const { lang } = useI18n();
  const [isOpen, setIsOpen] = useState(true);
  const [source, setSource] = useState('a');
  const [target, setTarget] = useState('b');
  const [arrow, setArrow] = useState<EdgeAnnotation['arrow']>('~>');
  const [label, setLabel] = useState('');

  // Collect all existing nodes with signal & cycle metadata
  const existingNodesList = useMemo(() => {
    const list: Array<{ tag: string; signalName: string; cycle: number; signalId: string }> = [];
    signals.forEach((s) => {
      if (s.node && !s.isSpacer) {
        for (let i = 0; i < s.node.length; i++) {
          const char = s.node[i];
          if (char && char !== '.' && char.trim().length > 0) {
            list.push({
              tag: char,
              signalName: s.name,
              cycle: i,
              signalId: s.id,
            });
          }
        }
      }
    });
    return list;
  }, [signals]);

  // Determine next unused letter
  const usedLetters = useMemo(() => new Set(existingNodesList.map((n) => n.tag.toLowerCase())), [existingNodesList]);
  const nextAvailableLetter = useMemo(() => {
    return ALPHABET.find((letter) => !usedLetters.has(letter)) || 'a';
  }, [usedLetters]);

  // Quick node adder state
  const validSignals = signals.filter((s) => !s.isSpacer);
  const [targetSignalId, setTargetSignalId] = useState(validSignals[0]?.id || '');
  const [targetCycle, setTargetCycle] = useState(0);
  const [newNodeLetter, setNewNodeLetter] = useState(nextAvailableLetter);

  // Sync letter when available changes
  const activeSignalId = targetSignalId && validSignals.some((s) => s.id === targetSignalId)
    ? targetSignalId
    : validSignals[0]?.id || '';

  const handleAddEdge = () => {
    const src = (source || 'a').trim();
    const tgt = (target || 'b').trim();
    if (!src || !tgt) return;

    // Automatically ensure both nodes exist on signals so WaveDrom always renders the edge visibly
    if (!usedLetters.has(src.toLowerCase()) && validSignals.length > 0) {
      onUpdateSignalNode(validSignals[0].id, Math.min(1, totalCycles - 1), src);
    }
    if (!usedLetters.has(tgt.toLowerCase()) && validSignals.length > 0) {
      const targetSig = validSignals[1] || validSignals[0];
      const targetC = validSignals.length > 1 ? Math.min(1, totalCycles - 1) : Math.min(3, totalCycles - 1);
      onUpdateSignalNode(targetSig.id, targetC, tgt);
    }

    const newEdge: EdgeAnnotation = {
      id: `edge_${Date.now()}`,
      source: src,
      target: tgt,
      arrow,
      label: label.trim(),
    };
    onChange([...edges, newEdge]);
    setLabel('');
  };

  const handleRemoveEdge = (id: string) => {
    onChange(edges.filter((e) => e.id !== id));
  };

  const handleQuickAddNode = (overrideLetter?: string, overrideCycle?: number) => {
    if (!activeSignalId) return;
    const letter = (overrideLetter || newNodeLetter || nextAvailableLetter).trim()[0];
    const cycle = overrideCycle !== undefined ? overrideCycle : targetCycle;
    if (!letter) return;

    onUpdateSignalNode(activeSignalId, cycle, letter);

    // Auto-advance target/source
    if (!source || source === letter) {
      setSource(letter);
    } else {
      setTarget(letter);
    }
  };

  // 1-Click Arrow Presets with guaranteed node placement
  const handleApplyPreset = (presetArrow: EdgeAnnotation['arrow'], defaultLabel: string) => {
    let src = source;
    let tgt = target;

    if (existingNodesList.length >= 2) {
      src = existingNodesList[0].tag;
      tgt = existingNodesList[1].tag;
    } else {
      src = 'a';
      tgt = 'b';
      if (validSignals.length > 0) {
        onUpdateSignalNode(validSignals[0].id, Math.min(1, totalCycles - 1), 'a');
        const targetSig = validSignals[1] || validSignals[0];
        const targetC = validSignals.length > 1 ? Math.min(1, totalCycles - 1) : Math.min(3, totalCycles - 1);
        onUpdateSignalNode(targetSig.id, targetC, 'b');
      }
    }

    const newEdge: EdgeAnnotation = {
      id: `edge_${Date.now()}`,
      source: src,
      target: tgt,
      arrow: presetArrow,
      label: defaultLabel,
    };
    onChange([...edges, newEdge]);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {/* Header - Lightweight and Clean */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <CornerDownRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {lang === 'zh' ? '时序连线与跨拍标注' : 'Timing Edges & Node Annotations'}
          </span>
          <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
            {lang === 'zh'
              ? `${edges.length} 条连线 · ${existingNodesList.length} 个节点`
              : `${edges.length} edge(s) · ${existingNodesList.length} node(s)`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSetupHoldModal && (
            <button
              type="button"
              onClick={onOpenSetupHoldModal}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold cursor-pointer transition-colors shadow-2xs"
              title={lang === 'zh' ? '一键打开建立时间 (t_setup) 与保持时间 (t_hold) 延时生成向导' : 'Open Setup & Hold Time Wizard'}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'zh' ? '⏱️ 建立/保持向导' : '⏱️ Setup/Hold Wizard'}</span>
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium cursor-pointer"
          >
            {isOpen ? (lang === 'zh' ? '收起' : 'Collapse') : (lang === 'zh' ? '展开' : 'Expand')}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-3.5 flex flex-col gap-3 text-xs">
          {/* Section 1: Edge Creation Form */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {lang === 'zh' ? '新建连线与跨拍标注' : 'New Timing Edge & Span Annotation'}
              </span>

              {/* 1-Click Arrow Presets */}
              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('~>', 't_setup ≥ 2.5ns')}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-400 cursor-pointer font-medium"
                  title={lang === 'zh' ? '生成标准建立时间 (t_setup) 曲线箭头' : 'Generate standard t_setup edge'}
                >
                  + t_setup
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('~>', 't_hold ≥ 1.0ns')}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-400 cursor-pointer font-medium"
                  title={lang === 'zh' ? '生成标准保持时间 (t_hold) 曲线箭头' : 'Generate standard t_hold edge'}
                >
                  + t_hold
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('<->', lang === 'zh' ? 'Δt 测量' : 'Δt Measure')}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-400 cursor-pointer font-medium"
                  title={lang === 'zh' ? '生成双向时序测量箭头' : 'Generate bidirectional measurement arrow'}
                >
                  {lang === 'zh' ? '+ 双向测量' : '+ Δt Measure'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'zh' ? '起点:' : 'Start:'}
                </span>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder={lang === 'zh' ? '如 a' : 'e.g. a'}
                  className="w-12 px-2 py-1 font-mono text-center font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'zh' ? '箭头:' : 'Arrow:'}
                </span>
                <select
                  value={arrow}
                  onChange={(e) => setArrow(e.target.value as any)}
                  className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-xs font-semibold"
                >
                  {ARROW_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {lang === 'zh' ? t.labelZh : t.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {lang === 'zh' ? '终点:' : 'End:'}
                </span>
                <input
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={lang === 'zh' ? '如 b' : 'e.g. b'}
                  className="w-12 px-2 py-1 font-mono text-center font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                <span className="font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  {lang === 'zh' ? '文字标注:' : 'Label:'}
                </span>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={lang === 'zh' ? '如 t_setup ≥ 2.5ns / 握手有效' : 'e.g. t_setup ≥ 2.5ns / Handshake Valid'}
                  className="flex-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={handleAddEdge}
                disabled={!source || !target}
                className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '添加连线' : 'Add Edge'}</span>
              </button>
            </div>

            {/* Configured Timing Edges */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center gap-1">
                  <GitCommit className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>
                    {lang === 'zh'
                      ? `已配置的时序连线 (${edges.length})`
                      : `Configured Timing Edges (${edges.length})`}
                  </span>
                </span>
                {edges.length > 0 && (
                  <span className="text-[10px] text-slate-400">
                    {lang === 'zh' ? '点击连线载入修改，点击垃圾桶删除' : 'Click edge to load, click trash to delete'}
                  </span>
                )}
              </div>

              {edges.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-0.5">
                  {edges.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between p-2 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-white dark:bg-slate-900 shadow-2xs hover:border-purple-400 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSource(e.source);
                          setTarget(e.target);
                          setArrow(e.arrow as any);
                          setLabel(e.label || '');
                        }}
                        className="flex items-center gap-1.5 font-mono text-left cursor-pointer flex-1 min-w-0"
                        title={lang === 'zh' ? '点击载入此连线至上方表单' : 'Click to load into editor'}
                      >
                        <span className="px-1.5 py-0.5 bg-purple-600 text-white rounded font-bold text-xs shrink-0">
                          {e.source}
                        </span>
                        <span className="text-purple-600 dark:text-purple-400 font-bold shrink-0">{e.arrow}</span>
                        <span className="px-1.5 py-0.5 bg-purple-600 text-white rounded font-bold text-xs shrink-0">
                          {e.target}
                        </span>
                        {e.label ? (
                          <span
                            className="text-purple-900 dark:text-purple-200 font-sans text-xs bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 truncate"
                            title={e.label}
                          >
                            {e.label}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-sans italic">
                            {lang === 'zh' ? '无文字' : 'No label'}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveEdge(e.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded cursor-pointer transition-colors ml-1 shrink-0"
                        title={lang === 'zh' ? '删除此时序连线' : 'Delete edge'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-2 px-3 text-slate-400 dark:text-slate-500 text-[11px] bg-white/60 dark:bg-slate-900/60 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center">
                  {lang === 'zh'
                    ? '暂无已配置的时序连线。设置起点、箭头与终点后点击「添加连线」即可生成。'
                    : 'No timing edges yet. Set start, arrow, and target, then click "Add Edge".'}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Rapid Tapping & Node Placement */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {lang === 'zh' ? '节点快速打标' : 'Quick Node Tagging'}
              </span>

              {/* Hardware DFF Delay Tap Shortcut */}
              {onAddPipelineTapSignal && activeSignalId && (
                <button
                  type="button"
                  onClick={() => onAddPipelineTapSignal(activeSignalId)}
                  className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800 text-[11px] font-medium cursor-pointer transition-colors"
                  title={lang === 'zh' ? '自动为此信号打一拍（生成 _d1 寄存器延时信号）' : 'Generate _d1 pipeline register delay signal'}
                >
                  {lang === 'zh' ? '+ 为此信号打一拍 (+1D 延时寄存器)' : '+ Tap Signal (+1D Register Delay)'}
                </button>
              )}
            </div>

            {/* Quick Node Tapping Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {/* Target Signal */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">
                  {lang === 'zh' ? '目标信号:' : 'Target Signal:'}
                </span>
                <select
                  value={activeSignalId}
                  onChange={(e) => setTargetSignalId(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono font-medium max-w-[140px]"
                >
                  {validSignals.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Cycle with Stepper & Quick Jump */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">
                  {lang === 'zh' ? '周期:' : 'Cycle:'}
                </span>
                <div className="flex items-center rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setTargetCycle((c) => Math.max(0, c - 1))}
                    className="px-1 text-slate-500 hover:text-slate-800 font-mono font-bold cursor-pointer"
                    title={lang === 'zh' ? '前移 1 拍' : 'Previous (-1)'}
                  >
                    -
                  </button>
                  <span className="px-1.5 font-mono font-bold text-xs text-purple-700 dark:text-purple-300 min-w-[28px] text-center">
                    T{targetCycle}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTargetCycle((c) => Math.min(totalCycles - 1, c + 1))}
                    className="px-1 text-slate-500 hover:text-slate-800 font-mono font-bold cursor-pointer"
                    title={lang === 'zh' ? '后移 1 拍' : 'Next (+1)'}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Quick Cycle Jump Pills */}
              <div className="hidden sm:flex items-center gap-1 text-[10px]">
                {[0, 1, 2, 4, 8].filter((c) => c < totalCycles).map((c) => (
                  <button
                    key={`q_cycle_${c}`}
                    type="button"
                    onClick={() => setTargetCycle(c)}
                    className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer font-mono ${
                      targetCycle === c
                        ? 'bg-purple-600 text-white border-purple-600 font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                    }`}
                  >
                    T{c}
                  </button>
                ))}
              </div>

              {/* Node Letter */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-medium">
                  {lang === 'zh' ? '节点:' : 'Node:'}
                </span>
                <input
                  type="text"
                  maxLength={1}
                  value={newNodeLetter}
                  onChange={(e) => setNewNodeLetter(e.target.value.toLowerCase())}
                  className="w-8 px-1 py-1 text-center font-mono font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              {/* Quick Letter Pills */}
              <div className="flex items-center gap-1 text-[11px]">
                {['a', 'b', 'c', 'd'].map((lettr) => (
                  <button
                    key={`q_let_${lettr}`}
                    type="button"
                    onClick={() => {
                      setNewNodeLetter(lettr);
                      handleQuickAddNode(lettr);
                    }}
                    className={`w-5 h-5 flex items-center justify-center rounded border font-mono font-bold cursor-pointer transition-colors ${
                      newNodeLetter === lettr
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                    }`}
                    title={lang === 'zh' ? `打标节点 [${lettr}]` : `Tag node [${lettr}]`}
                  >
                    {lettr}
                  </button>
                ))}
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={() => handleQuickAddNode()}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-colors ml-auto"
              >
                {lang === 'zh'
                  ? `在 T${targetCycle} 打入 [${newNodeLetter || nextAvailableLetter}]`
                  : `Tag [${newNodeLetter || nextAvailableLetter}] at T${targetCycle}`}
              </button>
            </div>

            {/* Existing Nodes Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11px]">
              <span className="text-slate-500 font-medium">
                {lang === 'zh'
                  ? '已有节点 (点击填入连线，点×删除):'
                  : 'Existing Nodes (click to assign to edge, × to delete):'}
              </span>
              {existingNodesList.length > 0 ? (
                existingNodesList.map((n, idx) => (
                  <div
                    key={`${n.tag}_${n.signalId}_${idx}`}
                    className="inline-flex items-center rounded-md bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 font-mono shadow-2xs overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (!source || source === n.tag) {
                          setTarget(n.tag);
                        } else {
                          setSource(n.tag);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                      title={lang === 'zh'
                        ? `点击填入: [${n.tag}] 位于 ${n.signalName} @ T${n.cycle}`
                        : `Click to load: [${n.tag}] at ${n.signalName} @ T${n.cycle}`}
                    >
                      <span className="font-bold text-xs bg-purple-600 text-white px-1 rounded-xs">{n.tag}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {n.signalName} @ T{n.cycle}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateSignalNode(n.signalId, n.cycle, '');
                      }}
                      className="px-1.5 py-0.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer border-l border-purple-200 dark:border-purple-800 transition-colors"
                      title={lang === 'zh' ? `删除节点 [${n.tag}]` : `Delete node [${n.tag}]`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              ) : (
                <span className="text-slate-400">
                  {lang === 'zh' ? '暂无标记节点' : 'No tagged nodes yet'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
