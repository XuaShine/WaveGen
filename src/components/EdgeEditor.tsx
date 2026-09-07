import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  CornerDownRight,
  Clock,
  GitCommit,
  X,
  PanelBottom,
  PanelLeft,
  ChevronDown,
  ChevronUp,
  Tag,
  Zap,
} from 'lucide-react';
import { EdgeAnnotation, SignalItem } from '../types';
import { useI18n } from '../lib/i18n';

export type EdgeEditorPosition = 'left_bottom' | 'right_bottom';

interface EdgeEditorProps {
  edges: EdgeAnnotation[];
  signals: SignalItem[];
  totalCycles: number;
  onChange: (edges: EdgeAnnotation[]) => void;
  onUpdateSignalNode: (signalId: string, cycleIndex: number, tag: string) => void;
  onOpenTextGuide?: () => void;
  onOpenSetupHoldModal?: () => void;
  onAddPipelineTapSignal?: (signalId: string) => void;
  position?: EdgeEditorPosition;
  onChangePosition?: (pos: EdgeEditorPosition) => void;
  className?: string;
  height?: number;
  onHeightChange?: (height: number) => void;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
  onResetBalanceHeight?: () => void;
  isExternalDragging?: boolean;
  onDragStateChange?: (isDragging: boolean) => void;
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
  position = 'left_bottom',
  onChangePosition,
  className = '',
  height: propsHeight,
  onHeightChange,
  isOpen: propsIsOpen,
  onToggleOpen,
  onResetBalanceHeight,
  isExternalDragging = false,
  onDragStateChange,
}) => {
  const { lang } = useI18n();
  const [internalIsOpen, setInternalIsOpen] = useState(true);
  const isOpen = propsIsOpen !== undefined ? propsIsOpen : internalIsOpen;
  const setIsOpen = (val: boolean) => {
    if (onToggleOpen) {
      onToggleOpen(val);
    } else {
      setInternalIsOpen(val);
    }
  };

  const [activeTab, setActiveTab] = useState<'edges' | 'nodes'>('edges');
  const [source, setSource] = useState('a');
  const [target, setTarget] = useState('b');
  const [arrow, setArrow] = useState<EdgeAnnotation['arrow']>('~>');
  const [label, setLabel] = useState('');

  // User Request: 切换时保持大小不变，同时支持框大小可调节，与波形面板协同撑满右屏
  const [internalHeight, setInternalHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wavedrom_edge_editor_height');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 160 && val <= 900) return val;
      }
    } catch {}
    return 280;
  });

  const editorHeight = propsHeight !== undefined ? propsHeight : internalHeight;
  const setEditorHeight = (val: number | ((prev: number) => number)) => {
    const nextH = typeof val === 'function' ? val(editorHeight) : val;
    if (onHeightChange) {
      onHeightChange(nextH);
    } else {
      setInternalHeight(nextH);
    }
    try {
      localStorage.setItem('wavedrom_edge_editor_height', String(nextH));
    } catch {}
  };

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHRef = useRef(0);

  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    onDragStateChange?.(true);
    startYRef.current = e.clientY;
    startHRef.current = editorHeight;

    let rafId: number | null = null;
    let pendingH = editorHeight;

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    const onMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingRef.current) return;
      // Handle is at the top of EdgeEditor: dragging UP increases height, capped at 75% viewport
      const delta = startYRef.current - moveEvt.clientY;
      const maxAllowed = Math.min(window.innerHeight * 0.75, 900);
      pendingH = Math.max(160, Math.min(maxAllowed, startHRef.current + delta));

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          setEditorHeight(pendingH);
          rafId = null;
        });
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
      onDragStateChange?.(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      if (rafId !== null) cancelAnimationFrame(rafId);
      setEditorHeight(pendingH);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

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

  const activeSignalId = targetSignalId && validSignals.some((s) => s.id === targetSignalId)
    ? targetSignalId
    : validSignals[0]?.id || '';

  const handleAddEdge = () => {
    const src = (source || 'a').trim();
    const tgt = (target || 'b').trim();
    if (!src || !tgt) return;

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

    if (!source || source === letter) {
      setSource(letter);
    } else {
      setTarget(letter);
    }
  };

  if (!isOpen) {
    return (
      <div className={`shrink-0 select-none ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl border border-purple-200/90 dark:border-purple-800/80 bg-gradient-to-r from-purple-50/90 via-white to-purple-50/50 dark:from-purple-950/60 dark:via-slate-900 dark:to-purple-950/40 hover:border-purple-400 dark:hover:border-purple-600 text-slate-700 dark:text-slate-200 shadow-xs transition-all cursor-pointer group"
          title={lang === 'zh' ? '点击展开时序连线与跨拍标注面板' : 'Click to expand Timing Edges & Node Annotations'}
        >
          <div className="flex items-center gap-2">
            <CornerDownRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {lang === 'zh' ? '⚡ 时序连线与跨拍标注' : '⚡ Timing Edges & Annotations'}
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 border border-purple-200 dark:border-purple-700/80 text-[11px] font-medium select-none">
              <span className="font-bold text-purple-900 dark:text-purple-100 font-mono">{edges.length}</span>
              <span className="text-purple-700 dark:text-purple-300 font-semibold">{lang === 'zh' ? '线' : 'edges'}</span>
              <span className="text-purple-300 dark:text-purple-600 font-bold">·</span>
              <span className="font-bold text-indigo-900 dark:text-indigo-100 font-mono">{existingNodesList.length}</span>
              <span className="text-indigo-700 dark:text-indigo-300 font-semibold">{lang === 'zh' ? '点' : 'nodes'}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
            <span className="text-[11px] font-semibold">{lang === 'zh' ? '点击展开' : 'Expand'}</span>
            <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col ${className}`}
      style={{
        height: `${editorHeight}px`,
        transition: (isDragging || isExternalDragging) ? 'none' : 'height 240ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Top Draggable Resize Handle (User Request: 把手移动到顶部) */}
      {isOpen && (
        <div
          onMouseDown={handleStartResize}
          onDoubleClick={() => {
            if (onResetBalanceHeight) {
              onResetBalanceHeight();
            } else {
              setEditorHeight(280);
            }
          }}
          className="h-3 w-full bg-slate-50 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center justify-center cursor-row-resize select-none shrink-0 group transition-colors"
          title={
            lang === 'zh'
              ? '上下拖拽调节两面板高度占比，双击恢复均分 (两面板始终铺满右侧屏幕)'
              : 'Drag up/down to adjust panel ratio, double click to balance'
          }
        >
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-purple-500 transition-colors" />
        </div>
      )}

      {/* Header - Compact and clear with position toggle (shrink-0) */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 shrink-0 select-none">
        <div className="flex items-center gap-2 shrink-0">
          <CornerDownRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
            {lang === 'zh' ? '时序连线与跨拍标注' : 'Timing Edges & Node Annotations'}
          </span>
          {/* User Request: 2 线 · 4 点这个字体可视度不好，换一个 */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 border border-purple-200 dark:border-purple-700/80 text-xs font-medium shadow-2xs select-none">
            <span className="font-bold text-purple-900 dark:text-purple-100 font-mono">{edges.length}</span>
            <span className="text-purple-700 dark:text-purple-300 font-semibold">{lang === 'zh' ? '线' : 'edges'}</span>
            <span className="text-purple-300 dark:text-purple-600 font-bold">·</span>
            <span className="font-bold text-indigo-900 dark:text-indigo-100 font-mono">{existingNodesList.length}</span>
            <span className="text-indigo-700 dark:text-indigo-300 font-semibold">{lang === 'zh' ? '点' : 'nodes'}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Setup & Hold Wizard Quick Link */}
          {onOpenSetupHoldModal && (
            <button
              type="button"
              onClick={onOpenSetupHoldModal}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-medium cursor-pointer transition-colors shadow-2xs shrink-0"
              title={lang === 'zh' ? '打开建立时间与保持时间向导' : 'Open Setup & Hold Wizard'}
            >
              <Clock className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'zh' ? '建立保持向导' : 'Setup/Hold'}</span>
            </button>
          )}

          {/* Position Switcher: Left column bottom vs Waveform preview bottom */}
          {onChangePosition && (
            <button
              type="button"
              onClick={() => onChangePosition(position === 'right_bottom' ? 'left_bottom' : 'right_bottom')}
              className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium cursor-pointer transition-colors shadow-2xs shrink-0"
              title={
                position === 'right_bottom'
                  ? (lang === 'zh' ? '点击移至左侧列表下方' : 'Move to left column')
                  : (lang === 'zh' ? '点击移至右侧波形下方' : 'Move under waveform preview')
              }
            >
              {position === 'right_bottom' ? (
                <>
                  <PanelLeft className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span>{lang === 'zh' ? '移至左下' : 'To Left'}</span>
                </>
              ) : (
                <>
                  <PanelBottom className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span>{lang === 'zh' ? '移至波形下方' : 'Under Waveform'}</span>
                </>
              )}
            </button>
          )}

          {/* Collapse / Expand to Bottom Capsule */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isOpen ? (lang === 'zh' ? '收起为吸底胶囊' : 'Collapse to bottom capsule') : (lang === 'zh' ? '展开面板' : 'Expand')}
          >
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Subheader: Mode tabs & Quick Presets & Height presets (shrink-0) */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 shrink-0 select-none">
            {/* Compact Tabs */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('edges')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                  activeTab === 'edges'
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Zap className="w-3 h-3 text-purple-500" />
                <span>{lang === 'zh' ? `时序连线 (${edges.length})` : `Edges (${edges.length})`}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('nodes')}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                  activeTab === 'nodes'
                    ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Tag className="w-3 h-3 text-indigo-500" />
                <span>{lang === 'zh' ? `节点打标 (${existingNodesList.length})` : `Nodes (${existingNodesList.length})`}</span>
              </button>
            </div>

            {/* Quick Height presets */}
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="hidden sm:inline font-medium">{lang === 'zh' ? '高度预设:' : 'Height:'}</span>
              {[220, 280, 380, 500].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setEditorHeight(h);
                    try { localStorage.setItem('wavedrom_edge_editor_height', String(h)); } catch {}
                  }}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    Math.abs(editorHeight - h) < 15
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                  }`}
                  title={lang === 'zh' ? `设为 ${h}px 高度` : `Set height to ${h}px`}
                >
                  {h}px
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Tab Content Viewport - Constant Height across tabs */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 flex flex-col gap-2 text-xs">

          {/* Tab 1: Timing Edges Form & Chips */}
          {activeTab === 'edges' && (
            <div className="flex flex-col gap-2">
              {/* Visual Node Quick-Pick Pool (Suggestion 4: Click 2 pills to instantly pair source & target) */}
              {existingNodesList.length > 0 && (
                <div className="flex flex-col gap-1 p-1.5 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg border border-purple-200/70 dark:border-purple-850/50 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                      {lang === 'zh' ? '可视化节点快捷拾取池 (点击药丸设为源/目点):' : 'Visual Node Quick-Picker:'}
                    </span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400">
                      {source && target ? (lang === 'zh' ? `已配对: ${source} → ${target}` : `Paired: ${source} → ${target}`) : (lang === 'zh' ? '点击两个标签完成连线配对' : 'Click 2 tags to pair')}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {existingNodesList.map((n) => {
                      const isSrc = source.trim().toLowerCase() === n.tag.toLowerCase();
                      const isTgt = target.trim().toLowerCase() === n.tag.toLowerCase();
                      return (
                        <button
                          key={`node_pill_${n.tag}_${n.signalId}_${n.cycle}`}
                          type="button"
                          onClick={() => {
                            if (!source || (source && target)) {
                              setSource(n.tag);
                              setTarget('');
                            } else if (source && !target) {
                              if (source === n.tag) {
                                setSource('');
                              } else {
                                setTarget(n.tag);
                              }
                            }
                          }}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-semibold cursor-pointer border transition-all ${
                            isSrc
                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs scale-105 ring-2 ring-blue-400/40'
                              : isTgt
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs scale-105 ring-2 ring-purple-400/40'
                              : 'bg-white dark:bg-slate-800 hover:bg-purple-100/70 dark:hover:bg-purple-900/40 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                          }`}
                          title={lang === 'zh' ? `节点 [${n.tag}] · 信号: ${n.signalName} · 第 T${n.cycle} 拍 (点击选定)` : `Node [${n.tag}] · ${n.signalName} T${n.cycle}`}
                        >
                          <span className="font-bold">{n.tag}</span>
                          <span className="text-[10px] opacity-75 font-sans font-normal">({n.signalName}#T{n.cycle})</span>
                          {isSrc && <span className="text-[9px] bg-blue-800 text-blue-100 px-1 py-0.2 rounded font-sans font-bold">{lang === 'zh' ? '源' : 'Src'}</span>}
                          {isTgt && <span className="text-[9px] bg-purple-800 text-purple-100 px-1 py-0.2 rounded font-sans font-bold">{lang === 'zh' ? '目' : 'Dst'}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Compact Creation Form */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-600 dark:text-slate-300 text-[11px]">{lang === 'zh' ? '源:' : 'Src:'}</span>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="a"
                    className="w-10 px-1.5 py-0.5 font-mono text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <select
                    value={arrow}
                    onChange={(e) => setArrow(e.target.value as any)}
                    className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-xs font-semibold"
                  >
                    {ARROW_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {lang === 'zh' ? t.labelZh : t.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-600 dark:text-slate-300 text-[11px]">{lang === 'zh' ? '目:' : 'Dst:'}</span>
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="b"
                    className="w-10 px-1.5 py-0.5 font-mono text-center font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={lang === 'zh' ? '文字标注 (如 t_setup ≥ 2.5ns)' : 'Label (e.g. t_setup)'}
                    className="flex-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddEdge}
                  disabled={!source || !target}
                  className="flex items-center gap-1 px-2.5 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-xs disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>{lang === 'zh' ? '加连线' : 'Add'}</span>
                </button>
              </div>

              {/* Configured Edges as Compact Chips */}
              <div className="flex flex-wrap items-center gap-1.5 min-h-[30px] max-h-40 overflow-y-auto">
                {edges.length > 0 ? (
                  edges.map((e) => (
                    <div
                      key={e.id}
                      className="inline-flex items-center rounded-lg border border-purple-200 dark:border-purple-800/80 bg-white dark:bg-slate-800/90 shadow-2xs hover:border-purple-400 transition-colors overflow-hidden text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSource(e.source);
                          setTarget(e.target);
                          setArrow(e.arrow as any);
                          setLabel(e.label || '');
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 font-mono text-left cursor-pointer"
                        title={lang === 'zh' ? '点击载入修改' : 'Click to load into form'}
                      >
                        <span className="font-bold text-purple-700 dark:text-purple-300">{e.source}</span>
                        <span className="text-slate-400 font-bold">{e.arrow}</span>
                        <span className="font-bold text-purple-700 dark:text-purple-300">{e.target}</span>
                        {e.label && (
                          <span className="text-[11px] font-sans text-slate-700 dark:text-slate-200 bg-purple-50 dark:bg-purple-950/60 px-1 py-0.2 rounded border border-purple-200 dark:border-purple-800 max-w-[140px] truncate">
                            {e.label}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveEdge(e.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer border-l border-slate-100 dark:border-slate-700"
                        title={lang === 'zh' ? '删除连线' : 'Delete edge'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 text-[11px] italic">
                    {lang === 'zh'
                      ? '暂无连线。在上方设置源点、终点或点击「预设」即可快速生成。'
                      : 'No timing edges. Fill above and click Add or click a preset.'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Node Tagging */}
          {activeTab === 'nodes' && (
            <div className="flex flex-col gap-2">
              {/* Compact Node Tagging Row */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium text-[11px]">{lang === 'zh' ? '信号:' : 'Signal:'}</span>
                  <select
                    value={activeSignalId}
                    onChange={(e) => setTargetSignalId(e.target.value)}
                    className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-mono max-w-[120px]"
                  >
                    {validSignals.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium text-[11px]">{lang === 'zh' ? '周期:' : 'Cycle:'}</span>
                  <div className="flex items-center rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setTargetCycle((c) => Math.max(0, c - 1))}
                      className="px-1 text-slate-500 hover:text-slate-800 font-mono font-bold cursor-pointer text-xs"
                    >
                      -
                    </button>
                    <span className="px-1 font-mono font-bold text-xs text-purple-700 dark:text-purple-300">
                      T{targetCycle}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTargetCycle((c) => Math.min(totalCycles - 1, c + 1))}
                      className="px-1 text-slate-500 hover:text-slate-800 font-mono font-bold cursor-pointer text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium text-[11px]">{lang === 'zh' ? '字母:' : 'Tag:'}</span>
                  <input
                    type="text"
                    maxLength={1}
                    value={newNodeLetter}
                    onChange={(e) => setNewNodeLetter(e.target.value.toLowerCase())}
                    className="w-7 px-1 py-0.5 text-center font-mono font-bold rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>

                <div className="flex items-center gap-0.5 text-[10px]">
                  {['a', 'b', 'c', 'd'].map((lettr) => (
                    <button
                      key={`q_let_${lettr}`}
                      type="button"
                      onClick={() => {
                        setNewNodeLetter(lettr);
                        handleQuickAddNode(lettr);
                      }}
                      className={`w-4.5 h-4.5 flex items-center justify-center rounded border font-mono font-bold cursor-pointer transition-colors ${
                        newNodeLetter === lettr
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {lettr}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickAddNode()}
                  className="px-2.5 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-xs cursor-pointer transition-colors shrink-0 ml-auto"
                >
                  {lang === 'zh' ? `在 T${targetCycle} 打标 [${newNodeLetter || nextAvailableLetter}]` : `Tag [${newNodeLetter || nextAvailableLetter}]`}
                </button>
              </div>

              {/* Existing Nodes Chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] max-h-32 overflow-y-auto">
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
                          setActiveTab('edges');
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                        title={lang === 'zh' ? `点击设为连线端点: [${n.tag}]` : `Use [${n.tag}] in edge`}
                      >
                        <span className="font-bold text-xs bg-purple-600 text-white px-1 rounded-xs">{n.tag}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {n.signalName}@T{n.cycle}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateSignalNode(n.signalId, n.cycle, '');
                        }}
                        className="px-1 py-0.5 text-slate-400 hover:text-rose-500 cursor-pointer border-l border-purple-200 dark:border-purple-800"
                        title={lang === 'zh' ? `删除节点 [${n.tag}]` : `Delete node`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-400 text-[11px] italic">
                    {lang === 'zh' ? '暂无打标节点' : 'No tagged nodes yet'}
                  </span>
                )}
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

