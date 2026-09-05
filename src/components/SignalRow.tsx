import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Trash2,
  Copy,
  Sliders,
  Sparkles,
  Tag,
  Clock,
  Plus,
  X,
  ChevronRight,
  Gauge,
  Edit3,
  Wand2,
  ClipboardPaste,
  Paintbrush,
  Check,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Settings2,
  Folder,
  Zap,
  GripVertical,
} from 'lucide-react';
import {
  SignalItem,
  EditorTool,
  SignalCategory,
  CategoryMeta,
  CellDensity,
  SIGNAL_CATEGORIES,
  getCategoryMeta,
  inferSignalCategory,
} from '../types';
import { CycleCell } from './CycleCell';
import { FoldedCycleCell } from './FoldedCycleCell';
import { buildCycleDisplayItems, FoldedRange } from '../lib/cycleFolding';
import {
  resizeWaveString,
  resizeNodeString,
  setNodeAtCycle,
  autoInsertHoldSymbols,
  updateWaveWithSmartAutoHold,
} from '../lib/waveParser';
import { useI18n } from '../lib/i18n';

interface SignalRowProps {
  signal: SignalItem;
  index: number;
  totalSignals: number;
  totalCycles: number;
  activeTool?: EditorTool;
  isFocused?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  globalBrush?: string | null;
  onSetGlobalBrush?: (brush: string | null) => void;
  globalCopiedSymbol?: string | null;
  onCopySymbol?: (symbol: string) => void;
  density?: CellDensity;
  foldedRanges?: FoldedRange[];
  onUnfoldRange?: (start: number, end: number) => void;
  availableGroups?: string[];
  onChange: (updated: SignalItem) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToTop?: () => void;
  onMoveToBottom?: () => void;
  onInsertBelow?: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isProMode?: boolean;
  customCategories?: CategoryMeta[];
  onOpenCustomCategoryModal?: () => void;
  hoveredCycle?: number | null;
  lockedCycle?: number | null;
  onHoverCycle?: (cycle: number | null) => void;
  onLockCycle?: (cycle: number | null) => void;
  onAddPipelineTapSignal?: () => void;
  draggable?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDragLeave?: (e: React.DragEvent, index: number) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

const CATEGORY_GROUPS: Array<{
  title: string;
  enTitle: string;
  cats: SignalCategory[];
}> = [
  {
    title: '基础信号分类',
    enTitle: 'Standard Categories',
    cats: ['clock', 'reset', 'control', 'status', 'bus', 'other'],
  },
];

export const SignalRow: React.FC<SignalRowProps> = ({
  signal,
  index,
  totalSignals,
  totalCycles,
  activeTool = 'select',
  isFocused = false,
  globalBrush,
  onSetGlobalBrush,
  globalCopiedSymbol,
  onCopySymbol,
  density = 'standard',
  foldedRanges = [],
  onUnfoldRange,
  availableGroups = [],
  onChange,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
  onInsertBelow,
  onDuplicate,
  onDelete,
  isProMode = false,
  customCategories = [],
  onOpenCustomCategoryModal,
  hoveredCycle,
  lockedCycle,
  onHoverCycle,
  onLockCycle,
  onAddPipelineTapSignal,
  isCollapsed: isCollapsedProp,
  onToggleCollapse,
  draggable = true,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}) => {
  const { t, lang } = useI18n();
  const [internalCollapsed, setInternalCollapsed] = useState(isCollapsedProp ?? true);
  const isCollapsed = isCollapsedProp !== undefined ? isCollapsedProp : internalCollapsed;

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setInternalCollapsed(next);
    onToggleCollapse?.(next);
  };

  // User Request: 支持双击信号框空白处折叠或者展开
  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'SELECT' ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('[role="button"]') ||
      target.closest('a')
    ) {
      return;
    }
    toggleCollapse();
  };

  const [showSettings, setShowSettings] = useState(false);
  const [showDataEditor, setShowDataEditor] = useState(false);
  // 默认折叠节点打标轨道，避免默认全展开占用大量垂直高度
  const [showNodeTrack, setShowNodeTrack] = useState(false);
  const [showDirectWaveInput, setShowDirectWaveInput] = useState(false);
  const [autoHold, setAutoHold] = useState(true);
  const [localCopiedSymbol, setLocalCopiedSymbol] = useState<string | null>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [groupInputVal, setGroupInputVal] = useState('');
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [editingNodeCycle, setEditingNodeCycle] = useState<number | null>(null);
  const [editingNodeVal, setEditingNodeVal] = useState<string>('');

  const effectiveBrush = globalBrush || null;
  const effectiveCopiedSymbol = globalCopiedSymbol || localCopiedSymbol;

  // If this is a spacer row
  if (signal.isSpacer) {
    return (
      <div
        id={`signal_row_${signal.id}`}
        data-signal-id={signal.id}
        className="scroll-mt-64 flex items-center justify-between px-4 py-2 bg-slate-100/70 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"
      >
        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono italic">
          {lang === 'zh'
            ? '[ 空白隔离行 Spacer / 用于总线或模块视觉分界 ]'
            : '[ Empty Spacer Row / Visual Separator for Buses or Blocks ]'}
        </span>
        <div className="flex items-center gap-1">
          {onMoveToTop && (
            <button
              onClick={onMoveToTop}
              disabled={index === 0}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
              title={lang === 'zh' ? '一键置顶' : 'Move to top'}
            >
              <ChevronsUp className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
            title={lang === 'zh' ? '上移一行' : 'Move up'}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === totalSignals - 1}
            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
            title={lang === 'zh' ? '下移一行' : 'Move down'}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {onMoveToBottom && (
            <button
              onClick={onMoveToBottom}
              disabled={index === totalSignals - 1}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 disabled:opacity-30 cursor-pointer"
              title={lang === 'zh' ? '一键置底' : 'Move to bottom'}
            >
              <ChevronsDown className="w-3.5 h-3.5" />
            </button>
          )}
          {onInsertBelow && (
            <button
              onClick={onInsertBelow}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-950/60 rounded text-blue-600 dark:text-blue-400 cursor-pointer"
              title={lang === 'zh' ? '在下方插入新信号' : 'Insert signal below'}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded text-rose-500 cursor-pointer ml-1"
            title={lang === 'zh' ? '删除此空行' : 'Delete spacer row'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Calculate actual wave cycle count based on this signal's period
  const signalPeriod = signal.period && signal.period > 0 ? signal.period : 1;
  const effectiveCycles = Math.max(1, Math.ceil(totalCycles / signalPeriod));

  const waveChars = resizeWaveString(signal.wave, effectiveCycles).split('');
  const nodeChars = resizeNodeString(signal.node, effectiveCycles).split('');

  // Calculate what active state is being held by '.' across all cycles
  const effectiveHeldSymbols: string[] = [];
  let lastActive = '0';
  for (let c = 0; c < waveChars.length; c++) {
    const sym = waveChars[c];
    if (sym !== '.') {
      lastActive = sym;
    }
    effectiveHeldSymbols.push(lastActive);
  }

  // Determine bus data mapping
  let currentDataIdx = 0;
  const cycleBusData: Record<number, string> = {};
  for (let c = 0; c < waveChars.length; c++) {
    const ch = waveChars[c];
    if (ch === '=' || (ch >= '2' && ch <= '9')) {
      if (signal.data && currentDataIdx < signal.data.length) {
        cycleBusData[c] = signal.data[currentDataIdx];
      }
      currentDataIdx++;
    }
  }

  // Build items for folding support
  const displayItems = useMemo(() => {
    if (!foldedRanges || foldedRanges.length === 0) {
      return waveChars.map((_, i) => ({ type: 'single' as const, cycleIndex: i }));
    }
    return buildCycleDisplayItems(effectiveCycles, foldedRanges);
  }, [effectiveCycles, foldedRanges, waveChars]);

  // Handle cell modification with Smart Auto-Hold
  const handleCellChange = (cycleIdx: number, newSymbol: string) => {
    if (autoHold) {
      const newWave = updateWaveWithSmartAutoHold(
        signal.wave,
        cycleIdx,
        newSymbol,
        effectiveCycles
      );
      onChange({
        ...signal,
        wave: newWave,
      });
    } else {
      const newChars = [...waveChars];
      newChars[cycleIdx] = newSymbol;
      onChange({
        ...signal,
        wave: newChars.join(''),
      });
    }
  };

  // Smart Auto-Hold Optimization
  const handleAutoHoldOptimize = () => {
    const optimized = autoInsertHoldSymbols(signal.wave);
    onChange({
      ...signal,
      wave: resizeWaveString(optimized, effectiveCycles),
    });
  };

  const handleNodeChange = (cycleIdx: number, tag: string) => {
    const updatedNode = setNodeAtCycle(signal.node, cycleIdx, tag, effectiveCycles);
    onChange({
      ...signal,
      node: updatedNode,
    });
    if (tag) {
      setShowNodeTrack(true);
    }
  };

  const handlePeriodChange = (newPeriod: number) => {
    const periodVal = Math.max(1, newPeriod);
    const newLength = Math.ceil(totalCycles / periodVal);
    onChange({
      ...signal,
      period: periodVal === 1 ? undefined : periodVal,
      wave: resizeWaveString(signal.wave, newLength),
      node: signal.node ? resizeNodeString(signal.node, newLength) : undefined,
    });
  };

  const handleSetClock = (inverted: boolean = false) => {
    const clkSymbol = inverted ? 'n' : 'p';
    onChange({
      ...signal,
      wave: clkSymbol + '.'.repeat(Math.max(0, effectiveCycles - 1)),
    });
  };

  const handleSetClockPulsePattern = (pattern: string) => {
    let full = '';
    while (full.length < effectiveCycles) {
      full += pattern;
    }
    onChange({
      ...signal,
      wave: full.slice(0, effectiveCycles),
    });
  };

  const handleSetAll = (char: string) => {
    onChange({
      ...signal,
      wave: char + '.'.repeat(Math.max(0, effectiveCycles - 1)),
    });
  };

  const handleInvert = () => {
    const inverted = waveChars
      .map((c) => {
        if (c === '0') return '1';
        if (c === '1') return '0';
        if (c === 'p') return 'n';
        if (c === 'n') return 'p';
        if (c === 'P') return 'N';
        if (c === 'N') return 'P';
        return c;
      })
      .join('');
    onChange({
      ...signal,
      wave: inverted,
    });
  };

  const handleAddBusData = () => {
    const current = signal.data || [];
    onChange({
      ...signal,
      data: [...current, `0x${(current.length + 1).toString(16).padStart(2, '0')}`],
    });
  };

  const handleUpdateBusData = (idx: number, val: string) => {
    const next = [...(signal.data || [])];
    next[idx] = val;
    onChange({
      ...signal,
      data: next,
    });
  };

  const handleRemoveBusData = (idx: number) => {
    const next = [...(signal.data || [])];
    next.splice(idx, 1);
    onChange({
      ...signal,
      data: next.length > 0 ? next : undefined,
    });
  };

  // Node count calculation
  const activeNodesCount = (signal.node || '')
    .split('')
    .filter((ch) => ch !== '.' && ch !== ' ').length;

  const currentCategory: SignalCategory = signal.category || inferSignalCategory(signal);
  const currentCatMeta = getCategoryMeta(currentCategory, customCategories);

  // Copy full wave string
  const handleCopyFullWave = () => {
    navigator.clipboard?.writeText(signal.wave);
    setToastMsg(lang === 'zh' ? `已复制波形代码: "${signal.wave}"` : `Copied wave code: "${signal.wave}"`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // Paste full wave string
  const handlePasteFullWave = async () => {
    try {
      const text = await navigator.clipboard?.readText();
      if (text) {
        onChange({
          ...signal,
          wave: resizeWaveString(text.trim(), effectiveCycles),
        });
        setToastMsg(lang === 'zh' ? `已粘贴波形: "${text.trim().slice(0, 16)}..."` : `Pasted wave: "${text.trim().slice(0, 16)}..."`);
        setTimeout(() => setToastMsg(null), 2500);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div
      id={`signal_row_${signal.id}`}
      data-signal-id={signal.id}
      draggable={draggable}
      onDragStart={(e) => onDragStart && onDragStart(e, index)}
      onDragOver={(e) => onDragOver && onDragOver(e, index)}
      onDragLeave={(e) => onDragLeave && onDragLeave(e, index)}
      onDrop={(e) => onDrop && onDrop(e, index)}
      onDragEnd={(e) => onDragEnd && onDragEnd(e)}
      className={`scroll-mt-[380px] md:scroll-mt-[460px] rounded-xl border transition-all duration-150 ${
        isDragging
          ? 'opacity-30 border-dashed border-blue-500 scale-[0.99] bg-blue-50/20'
          : isDragOver
          ? 'border-blue-500 ring-2 ring-blue-500/50 bg-blue-50/30 dark:bg-blue-950/40 shadow-md'
          : isFocused
          ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-blue-50/10 dark:bg-blue-950/20'
          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 shadow-xs'
      }`}
    >
      {/* Top Header of the Signal Row (User Request: 支持双击信号框空白处折叠或者展开) */}
      <div
        onDoubleClick={handleHeaderDoubleClick}
        title={lang === 'zh' ? '双击空白处折叠/展开信号' : 'Double click blank area to toggle fold/unfold'}
        className={`flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1 sm:py-1.5 bg-slate-50/70 dark:bg-slate-900/60 select-none ${isCollapsed ? '' : 'border-b border-slate-100 dark:border-slate-800'}`}
      >
        {/* Left Side: Drag Handle + Collapse + Move Controls + Name + Clock Domain + Delay */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Drag Handle (User Request: 支持拖拽信号框上移下移) */}
          <div
            className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded transition-colors"
            title={lang === 'zh' ? '按住拖拽上下移动信号位置' : 'Drag to move signal up or down'}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {/* Collapse/Expand */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 cursor-pointer"
            title={isCollapsed ? t('unfold_all_signals') || '展开波形' : t('fold_all_signals') || '折叠收起'}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Move Controls: Top, Up, Down, Bottom, Insert */}
          <div className="flex items-center gap-0.5 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-white dark:bg-slate-800 shadow-2xs mr-0.5">
            {onMoveToTop && (
              <button
                onClick={onMoveToTop}
                disabled={index === 0}
                className="p-0.5 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded disabled:opacity-20 cursor-pointer"
                title={lang === 'zh' ? '一键置顶到最上方 (Shift to Top)' : 'Shift to top'}
              >
                <ChevronsUp className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded disabled:opacity-20 cursor-pointer"
              title={lang === 'zh' ? '上移一行' : 'Move up'}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === totalSignals - 1}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded disabled:opacity-20 cursor-pointer"
              title={lang === 'zh' ? '下移一行' : 'Move down'}
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {onMoveToBottom && (
              <button
                onClick={onMoveToBottom}
                disabled={index === totalSignals - 1}
                className="p-0.5 hover:bg-blue-50 dark:hover:bg-blue-950 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded disabled:opacity-20 cursor-pointer"
                title={lang === 'zh' ? '一键置底到最下方 (Shift to Bottom)' : 'Shift to bottom'}
              >
                <ChevronsDown className="w-3.5 h-3.5" />
              </button>
            )}
            {onInsertBelow && (
              <button
                onClick={onInsertBelow}
                className="p-0.5 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded cursor-pointer border-l border-slate-200 dark:border-slate-700 ml-0.5"
                title={lang === 'zh' ? '在此信号下方插入新信号' : 'Insert new signal below'}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Signal Name Input */}
          <input
            type="text"
            value={signal.name}
            onChange={(e) => onChange({ ...signal, name: e.target.value })}
            placeholder={lang === 'zh' ? '信号名称 (如 CLK, DATA)' : 'Signal name (e.g. CLK, DATA)'}
            className="h-6.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-100 bg-transparent hover:bg-white dark:hover:bg-slate-800 px-2 rounded-md border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden w-28 sm:w-36 transition-all shadow-2xs"
          />

          {/* Compact Waveform snippet when collapsed */}
          {isCollapsed && (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
              onClick={toggleCollapse}
              title={lang === 'zh' ? '点击展开查看波形网格' : 'Click to expand waveform grid'}
            >
              <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 max-w-[140px] sm:max-w-[220px] truncate">
                {signal.wave}
              </span>
              <span className="text-[10px] text-slate-400 select-none">
                ({effectiveCycles}{lang === 'zh' ? '拍' : ' cycles'})
              </span>
            </div>
          )}

          {/* Signal Category Badge & Quick Dropdown */}
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className={`h-6 inline-flex items-center gap-1 px-2.5 rounded-full text-[11px] font-semibold border cursor-pointer transition-colors shadow-2xs select-none ${currentCatMeta.badgeCls}`}
              title={lang === 'zh' ? `信号分类: ${currentCatMeta.label || currentCatMeta.name} (点击切换分类)` : `Category: ${currentCatMeta.enName || currentCatMeta.name} (Click to change)`}
            >
              <span className="text-xs leading-none">{currentCatMeta.icon}</span>
              <span className="leading-none">{lang === 'en' && currentCatMeta.enName ? currentCatMeta.enName : (currentCatMeta.label || currentCatMeta.name)}</span>
            </button>
            {showCategoryMenu && (
              <div className="absolute left-0 top-full mt-1.5 z-50 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2 flex flex-col gap-2 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    {lang === 'zh' ? '设置信号分类' : 'Set Signal Category'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCategoryMenu(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
                  {CATEGORY_GROUPS.map((group) => (
                    <div key={group.title} className="space-y-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                        {lang === 'en' ? (group.enTitle || group.title) : group.title}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {group.cats.map((catId) => {
                          const meta = getCategoryMeta(catId, customCategories);
                          const isSelected = currentCategory === catId;
                          return (
                            <button
                              key={catId}
                              type="button"
                              onClick={() => {
                                onChange({ ...signal, category: catId });
                                setShowCategoryMenu(false);
                              }}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 font-bold text-blue-700 dark:text-blue-300 shadow-2xs'
                                  : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="text-sm">{meta.icon}</span>
                              <span className="truncate">{lang === 'en' && meta.enName ? meta.enName : (meta.label || meta.name)}</span>
                              {isSelected && <Check className="w-3 h-3 ml-auto text-blue-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Custom Categories Group */}
                  {customCategories && customCategories.length > 0 && (
                    <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                        {lang === 'zh' ? '自定义项目分类' : 'Custom Categories'}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {customCategories.map((c) => {
                          const isSelected = currentCategory === c.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                onChange({ ...signal, category: c.id });
                                setShowCategoryMenu(false);
                              }}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer border ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 font-bold text-blue-700 dark:text-blue-300 shadow-2xs'
                                  : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span className="text-sm">{c.icon}</span>
                              <span className="truncate">{c.name}</span>
                              {isSelected && <Check className="w-3 h-3 ml-auto text-blue-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {onOpenCustomCategoryModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryMenu(false);
                        onOpenCustomCategoryModal();
                      }}
                      className="w-full mt-1 py-1.5 px-2.5 rounded-lg border border-dashed border-blue-400 dark:border-blue-700 text-blue-600 dark:text-blue-400 text-center font-medium hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition-colors flex items-center justify-center gap-1 text-[11px]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{lang === 'zh' ? '管理 / 新建自定义分类' : 'Manage / Create Category'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Signal Group Indicator & Selector */}
          <div className="relative flex items-center">
            {signal.group ? (
              <div className="h-6 inline-flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 shadow-2xs select-none">
                <span className="font-bold leading-none">{signal.group}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...signal, group: undefined })}
                  className="hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer -mr-0.5"
                  title={lang === 'zh' ? '从此分组中移出' : 'Remove from group'}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => setShowGroupPicker(!showGroupPicker)}
                  className="h-6 inline-flex items-center gap-1 px-2.5 rounded-full text-[11px] font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 cursor-pointer transition-colors select-none"
                  title={lang === 'zh' ? '为此信号设置分组 (波形左侧将用括号包住同一分组)' : 'Set group for signal (brackets waveform by group)'}
                >
                  <span>+</span>
                  <span>{lang === 'zh' ? '分组' : 'Group'}</span>
                </button>
                {showGroupPicker && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-52 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex flex-col gap-2 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{lang === 'zh' ? '设置信号分组' : 'Set Signal Group'}</span>
                      <button
                        type="button"
                        onClick={() => setShowGroupPicker(false)}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        placeholder={lang === 'zh' ? '分组名 (如 SPI, Control)' : 'Group name (e.g. SPI)'}
                        value={groupInputVal}
                        onChange={(e) => setGroupInputVal(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && groupInputVal.trim()) {
                            onChange({ ...signal, group: groupInputVal.trim() });
                            setShowGroupPicker(false);
                            setGroupInputVal('');
                          }
                        }}
                        className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (groupInputVal.trim()) {
                            onChange({ ...signal, group: groupInputVal.trim() });
                            setShowGroupPicker(false);
                            setGroupInputVal('');
                          }
                        }}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold shrink-0 cursor-pointer"
                      >
                        {lang === 'zh' ? '确定' : 'OK'}
                      </button>
                    </div>
                    {availableGroups && availableGroups.length > 0 && (
                      <div className="flex flex-col gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400">{lang === 'zh' ? '选择已有分组:' : 'Existing groups:'}</span>
                        <div className="flex flex-wrap gap-1">
                          {availableGroups.map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => {
                                onChange({ ...signal, group: g });
                                setShowGroupPicker(false);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Indicators for configured secondary properties in simple mode */}
          {!isProMode && !showSettings && (
            <div className="flex items-center gap-1.5">
              {signal.period && signal.period > 1 && (
                <span
                  className="h-6 inline-flex items-center px-2.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[11px] font-bold border border-amber-300 dark:border-amber-800 cursor-pointer select-none"
                  onClick={() => setShowSettings(true)}
                  title={lang === 'zh' ? '点击展开修改分频' : 'Click to change divider'}
                >
                  {lang === 'zh' ? '分频' : 'Div'}: {signal.period}x
                </span>
              )}

              {signal.phase !== undefined && signal.phase !== 0 && (
                <span
                  className="h-6 inline-flex items-center px-2.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-mono text-[11px] font-bold border border-cyan-300 dark:border-cyan-800 cursor-pointer select-none"
                  onClick={() => setShowSettings(true)}
                  title={lang === 'zh' ? '点击展开修改延时' : 'Click to change phase'}
                >
                  {lang === 'zh' ? '延时' : 'Phase'}: {signal.phase > 0 ? `+${signal.phase}` : signal.phase}T
                </span>
              )}

              {activeNodesCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowNodeTrack(!showNodeTrack)}
                  className="h-6 inline-flex items-center gap-1 px-2.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[11px] font-bold border border-purple-300 dark:border-purple-800 cursor-pointer select-none"
                  title={lang === 'zh' ? '点击切换节点轨道' : 'Toggle node track'}
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>{activeNodesCount} {lang === 'zh' ? '节点' : 'nodes'}</span>
                </button>
              )}

              {signal.data && signal.data.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDataEditor(!showDataEditor)}
                  className="h-6 inline-flex items-center px-2.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-300 text-[11px] font-bold border border-violet-300 dark:border-violet-800 cursor-pointer select-none"
                >
                  {lang === 'zh' ? '数据' : 'Data'}({signal.data.length})
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Action Tools: Direct Quick Tap & Node placement right in signal header */}
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          {/* Quick Hardware Pipeline Tap (+1D) Button directly in signal box */}
          {onAddPipelineTapSignal && (
            <button
              type="button"
              onClick={onAddPipelineTapSignal}
              className="h-7 inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 cursor-pointer shadow-2xs transition-colors"
              title={lang === 'zh' ? '自动为此信号快速打一拍：生成延后 1 周期的 _d1 寄存器延时信号' : 'Generate a 1-cycle delayed _d1 register signal'}
            >
              <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t('tap_pipeline')}</span>
            </button>
          )}

          {/* Quick Node Tagging Toggle directly in signal box */}
          <button
            type="button"
            onClick={() => setShowNodeTrack(!showNodeTrack)}
            className={`h-7 inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
              showNodeTrack
                ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100'
            }`}
            title={lang === 'zh' ? '展开/收起此信号的节点标注轨道，可在各周期直接点击放置或删除节点' : 'Toggle node marker track to place or remove timing nodes'}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>{showNodeTrack ? t('node_track_close') : activeNodesCount > 0 ? `${activeNodesCount} ${t('nodes_count')}` : t('node_track_open')}</span>
          </button>

          {/* Toggle More Options / Advanced Tools Drawer */}
          {!isProMode && (
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`h-7 inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                showSettings
                  ? 'bg-slate-700 text-white border-slate-700 shadow-2xs dark:bg-slate-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title={lang === 'zh' ? '展开/收起高级选项 (分频、延时、总线数据、代码模式等)' : 'Toggle advanced options (divider, phase delay, bus data, raw wave)'}
            >
              <span>{showSettings ? t('less_config') : t('more_config')}</span>
            </button>
          )}

          {/* Duplicate Signal Row */}
          <button
            onClick={onDuplicate}
            className="h-7 w-7 inline-flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
            title={lang === 'zh' ? '复制此信号生成新副本' : 'Duplicate signal'}
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete Signal Row */}
          <button
            onClick={onDelete}
            disabled={totalSignals <= 1}
            className="h-7 w-7 inline-flex items-center justify-center hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg text-slate-400 hover:text-rose-600 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
            title={lang === 'zh' ? '删除此信号行' : 'Delete signal row'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Advanced Tools Sub-Bar (Shown when in Pro Mode OR when user clicks '更多配置') */}
      {(isProMode || showSettings) && (
        <div className="px-3 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs animate-in fade-in duration-100">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Clock Domain / Period Multiplier Controller */}
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg px-2 py-0.5 text-xs">
              <Gauge className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span className="text-[11px] text-amber-900 dark:text-amber-300 font-medium">{lang === 'zh' ? '分频:' : 'Div:'}</span>
              <select
                value={signalPeriod}
                onChange={(e) => handlePeriodChange(parseInt(e.target.value) || 1)}
                className="bg-transparent font-mono font-bold text-amber-700 dark:text-amber-300 text-xs focus:outline-hidden cursor-pointer"
                title={lang === 'zh' ? '设置此信号的周期长度 multiplier (例如 2 代表时钟周期为基准的2倍，方便多时钟域如 1GHz 与 500MHz 对齐)' : 'Set period length multiplier for multi-clock domain alignment'}
              >
                <option value="1">1x {lang === 'zh' ? '(基准)' : '(Base)'}</option>
                <option value="2">2x {lang === 'zh' ? '(2分频)' : '(/2)'}</option>
                <option value="3">3x {lang === 'zh' ? '(3分频)' : '(/3)'}</option>
                <option value="4">4x {lang === 'zh' ? '(4分频)' : '(/4)'}</option>
                <option value="5">5x {lang === 'zh' ? '(5分频)' : '(/5)'}</option>
                <option value="8">8x {lang === 'zh' ? '(8分频)' : '(/8)'}</option>
              </select>
            </div>

            {/* Signal Delay / Phase Controller */}
            <div className="flex items-center gap-1 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-900/60 rounded-lg px-2 py-0.5 text-xs">
              <Clock className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span className="text-[11px] text-cyan-900 dark:text-cyan-300 font-medium">{lang === 'zh' ? '延时:' : 'Phase:'}</span>
              <select
                value={signal.phase ?? 0}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChange({
                    ...signal,
                    phase: isNaN(val) || val === 0 ? undefined : val,
                  });
                }}
                className="bg-transparent font-mono font-bold text-cyan-700 dark:text-cyan-300 text-xs focus:outline-hidden cursor-pointer"
                title={lang === 'zh' ? '设置信号延时/相位偏移 (phase)' : 'Set signal phase delay/offset'}
              >
                <option value="0">0 {lang === 'zh' ? '(无延时)' : '(No delay)'}</option>
                <option value="0.25">+0.25{lang === 'zh' ? '拍' : 'T'}</option>
                <option value="0.5">+0.5{lang === 'zh' ? '拍 (半周期延时)' : 'T (Half-cycle)'}</option>
                <option value="0.75">+0.75{lang === 'zh' ? '拍' : 'T'}</option>
                <option value="1">+1.0{lang === 'zh' ? '拍' : 'T'}</option>
                <option value="1.5">+1.5{lang === 'zh' ? '拍' : 'T'}</option>
                <option value="2">+2.0{lang === 'zh' ? '拍' : 'T'}</option>
                <option value="-0.25">-0.25{lang === 'zh' ? '拍 (超前)' : 'T (Lead)'}</option>
                <option value="-0.5">-0.5{lang === 'zh' ? '拍 (超前半拍)' : 'T (Lead half)'}</option>
              </select>
            </div>

            {/* Smart Auto-Hold Toggle Button */}
            <button
              type="button"
              onClick={() => setAutoHold(!autoHold)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                autoHold
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
              }`}
              title={lang === 'zh' ? "智能自动保持模式：定义关键转折节点即可，无需手动反复输入 '.' 保持符号" : "Smart Auto-Hold: define key transition edges without manual '.' symbols"}
            >
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>{autoHold ? (lang === 'zh' ? '自动保持: 开' : 'Auto-Hold: ON') : (lang === 'zh' ? '自动保持: 关' : 'Auto-Hold: OFF')}</span>
            </button>

            {/* Node Track Toggle Button */}
            <button
              type="button"
              onClick={() => setShowNodeTrack(!showNodeTrack)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                showNodeTrack
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900 hover:bg-purple-50'
              }`}
              title={lang === 'zh' ? '显示或隐藏此信号专用的节点标注轨道' : 'Show or hide dedicated node track'}
            >
              <Tag className="w-3 h-3" />
              <span>{showNodeTrack ? (lang === 'zh' ? '收起节点轨' : 'Hide Nodes') : (lang === 'zh' ? '+ 标注节点' : '+ Node Track')}</span>
            </button>

            {onAddPipelineTapSignal && (
              <button
                type="button"
                onClick={onAddPipelineTapSignal}
                className="px-2 py-0.5 rounded-lg text-[11px] border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-medium cursor-pointer transition-colors"
                title={lang === 'zh' ? '为此信号快速打一拍：生成延后 1 周期的 _d1 寄存器信号' : 'Pipeline tap: Generate delayed 1 cycle _d1 signal'}
              >
                + {lang === 'zh' ? '打一拍 (+1D)' : 'Tap (+1D)'}
              </button>
            )}

            {/* Quick Signal Presets */}
            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
              <button
                onClick={() => handleSetClock(false)}
                className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer"
                title={lang === 'zh' ? '设为正时钟 p....' : 'Set as clock p....'}
              >
                {lang === 'zh' ? '时钟(p)' : 'Clock(p)'}
              </button>
              <button
                onClick={handleInvert}
                className="px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer"
                title={lang === 'zh' ? '0/1 及时钟信号反相' : 'Invert 0/1 and clock'}
              >
                {lang === 'zh' ? '反相' : 'Invert'}
              </button>
              <button
                onClick={() => handleSetAll('0')}
                className="px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer font-mono"
                title={lang === 'zh' ? '设为全 0' : 'Set all to 0'}
              >
                {lang === 'zh' ? '全0' : 'All 0'}
              </button>
              <button
                onClick={() => handleSetAll('1')}
                className="px-1 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-[11px] text-slate-700 dark:text-slate-300 cursor-pointer font-mono"
                title={lang === 'zh' ? '设为全 1' : 'Set all to 1'}
              >
                {lang === 'zh' ? '全1' : 'All 1'}
              </button>
            </div>

            {/* Bus Data Button */}
            <button
              onClick={() => setShowDataEditor(!showDataEditor)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] border cursor-pointer ${
                showDataEditor || (signal.data && signal.data.length > 0)
                  ? 'bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-300 border-violet-300 dark:border-violet-800 font-medium'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
              title={lang === 'zh' ? '编辑总线数据文本' : 'Edit bus data text'}
            >
              <Tag className="w-3 h-3" />
              <span>{lang === 'zh' ? '总线数据' : 'Bus Data'}{signal.data?.length ? `(${signal.data.length})` : ''}</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyFullWave}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 cursor-pointer"
              title={lang === 'zh' ? '复制整行波形原生代码字符串' : 'Copy raw wave string'}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handlePasteFullWave}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 cursor-pointer"
              title={lang === 'zh' ? '粘贴代码字符串覆盖此行' : 'Paste raw wave string to row'}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowDirectWaveInput(!showDirectWaveInput)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 cursor-pointer"
              title={lang === 'zh' ? '手动编辑 Wave 原生字符串' : 'Edit raw wave string manually'}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            {onMoveToTop && (
              <button
                onClick={onMoveToTop}
                disabled={index === 0}
                className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer disabled:opacity-30"
                title={lang === 'zh' ? '置顶' : 'Top'}
              >
                {lang === 'zh' ? '置顶' : 'Top'}
              </button>
            )}
            {onMoveToBottom && (
              <button
                onClick={onMoveToBottom}
                disabled={index === totalSignals - 1}
                className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer disabled:opacity-30"
                title={lang === 'zh' ? '置底' : 'Bottom'}
              >
                {lang === 'zh' ? '置底' : 'Bottom'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Expanded Body */}
      {!isCollapsed && (
        <div className="px-2.5 py-1.5 flex flex-col gap-1.5">
          {/* Direct Wave String Text Editor */}
          {showDirectWaveInput && (
            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 animate-in fade-in duration-100">
              <span className="text-[11px] font-mono text-slate-500">{lang === 'zh' ? 'Wave 原始代码:' : 'Wave Raw Code:'}</span>
              <input
                type="text"
                value={signal.wave}
                onChange={(e) => onChange({ ...signal, wave: e.target.value })}
                className="flex-1 font-mono text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                placeholder={lang === 'zh' ? '例如: 01.p...=..' : 'e.g.: 01.p...=..'}
              />
              <button
                type="button"
                onClick={() => setShowDirectWaveInput(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-1"
              >
                {lang === 'zh' ? '完成' : 'Done'}
              </button>
            </div>
          )}

          {/* Toast Message Notification */}
          {toastMsg && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs rounded-lg animate-in fade-in duration-100">
              <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Interactive Timeline Grid (Scrollable if cycles are many) */}
          <div
            className="overflow-x-auto pb-1"
            onMouseDown={() => setIsMouseDown(true)}
            onMouseUp={() => setIsMouseDown(false)}
            onMouseLeave={() => setIsMouseDown(false)}
          >
            <div className="flex items-center gap-1.5 min-w-max pt-2">
              {displayItems.map((item) => {
                if (item.type === 'folded') {
                  const heldSymbol = effectiveHeldSymbols[item.start] || '.';
                  const busText = cycleBusData[item.start];
                  return (
                    <FoldedCycleCell
                      key={`folded_${signal.id}_${item.start}_${item.end}`}
                      start={item.start}
                      end={item.end}
                      count={item.count}
                      symbol={heldSymbol}
                      busDataText={busText}
                      density={density}
                      onUnfold={() => onUnfoldRange?.(item.start, item.end)}
                    />
                  );
                }

                const cIdx = item.cycleIndex;
                const char = waveChars[cIdx] || '.';
                return (
                  <CycleCell
                    key={`cell_${signal.id}_${cIdx}`}
                    symbol={char}
                    cycleIndex={cIdx}
                    totalCycles={effectiveCycles}
                    density={density}
                    nodeTag={nodeChars[cIdx] !== '.' ? nodeChars[cIdx] : undefined}
                    busDataText={cycleBusData[cIdx]}
                    activeTool={activeTool}
                    prevEffectiveSymbol={effectiveHeldSymbols[cIdx]}
                    copiedSymbol={effectiveCopiedSymbol}
                    activeBrush={effectiveBrush}
                    isMouseDown={isMouseDown}
                    isExternalHovered={hoveredCycle === cIdx}
                    isLocked={lockedCycle === cIdx}
                    onHoverCycle={onHoverCycle}
                    onLockCycle={onLockCycle}
                    onChange={(newSym) => handleCellChange(cIdx, newSym)}
                    onSetNodeTag={(tag) => handleNodeChange(cIdx, tag)}
                    onCopyState={(sym) => {
                      setLocalCopiedSymbol(sym);
                      onCopySymbol?.(sym);
                      setToastMsg(lang === 'zh' ? `已复制状态 [${sym}] (随时按 V 或右键可直接粘贴)` : `Copied state [${sym}] (Press V or right-click to paste)`);
                      setTimeout(() => setToastMsg(null), 2000);
                    }}
                    onPasteState={() => {
                      setToastMsg(lang === 'zh' ? `已粘贴状态` : `Pasted state`);
                      setTimeout(() => setToastMsg(null), 1500);
                    }}
                    onFillToEnd={(sym) => {
                      const chars = [...waveChars];
                      for (let i = cIdx; i < effectiveCycles; i++) {
                        chars[i] = sym;
                      }
                      onChange({
                        ...signal,
                        wave: chars.join(''),
                      });
                      setToastMsg(lang === 'zh' ? `已将状态 [${sym}] 填充至行末尾` : `Filled state [${sym}] to row end`);
                      setTimeout(() => setToastMsg(null), 2000);
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Dedicated Visual Node Track (Directly shows where nodes are and allows 1-click add) */}
          {showNodeTrack && (
            <div className="mt-1 p-2 bg-purple-50/70 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900/60 flex flex-col gap-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] text-purple-900 dark:text-purple-300">
                <div className="flex items-center gap-1 font-bold">
                  <Tag className="w-3 h-3 text-purple-600" />
                  <span>{lang === 'zh' ? '节点标注轨道 (Node Track) - 直接在下方对应时钟周期方块点击即可标注节点：' : 'Node Track - Click cycle boxes below to annotate nodes:'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNodeTrack(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <div className="flex items-center gap-1.5 min-w-max py-1">
                  {waveChars.map((_, cIdx) => {
                    const tag = nodeChars[cIdx] !== '.' ? nodeChars[cIdx] : '';
                    const isEditingThis = editingNodeCycle === cIdx;

                    if (isEditingThis) {
                      return (
                        <div
                          key={`node_track_${signal.id}_${cIdx}`}
                          className="w-9 flex flex-col items-center justify-center"
                        >
                          <input
                            autoFocus
                            type="text"
                            maxLength={3}
                            value={editingNodeVal}
                            onChange={(e) => setEditingNodeVal(e.target.value)}
                            onBlur={() => {
                              const trimmed = editingNodeVal.trim();
                              handleNodeChange(cIdx, trimmed.length > 0 ? trimmed[0] : '');
                              setEditingNodeCycle(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const trimmed = editingNodeVal.trim();
                                handleNodeChange(cIdx, trimmed.length > 0 ? trimmed[0] : '');
                                setEditingNodeCycle(null);
                              } else if (e.key === 'Escape') {
                                setEditingNodeCycle(null);
                              }
                            }}
                            className="w-7 h-6 text-center font-mono font-bold text-xs bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 border-2 border-purple-600 rounded-md shadow-xs focus:outline-hidden"
                            placeholder="A-Z"
                          />
                          <span className="text-[8px] text-purple-600 font-mono mt-0.5 font-bold">{lang === 'zh' ? '回车存' : 'Enter'}</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`node_track_${signal.id}_${cIdx}`}
                        className="w-9 flex flex-col items-center justify-center"
                      >
                        {tag ? (
                          <div className="relative group/tag">
                            <button
                              type="button"
                              onClick={() => {
                                // Cycle to next letter on left click
                                const nextCode = tag.charCodeAt(0) >= 122 ? 97 : tag.charCodeAt(0) + 1;
                                handleNodeChange(cIdx, String.fromCharCode(nextCode));
                              }}
                              onContextMenu={(e) => {
                                // User Request: 节点标注轨道节点要增加一个右击直接编辑
                                e.preventDefault();
                                setEditingNodeCycle(cIdx);
                                setEditingNodeVal(tag);
                              }}
                              className="w-7 h-6 flex items-center justify-center rounded-md bg-purple-600 hover:bg-purple-700 text-white font-mono text-xs font-bold shadow-xs cursor-pointer select-none"
                              title={lang === 'zh' ? `节点 [${tag}] (左击切换字母，【右击直接输入编辑】，点右上角×删除)` : `Node [${tag}] (Left click to cycle, right click to edit, × to delete)`}
                            >
                              {tag}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNodeChange(cIdx, '');
                              }}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-xs cursor-pointer transition-colors"
                              title={lang === 'zh' ? '删除此节点' : 'Delete node'}
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              // Automatically find first unused letter a..z
                              const usedTags = new Set((signal.node || '').split('').filter((c) => c !== '.' && c !== ' '));
                              let chosen = 'a';
                              for (let i = 0; i < 26; i++) {
                                const ch = String.fromCharCode(97 + i);
                                if (!usedTags.has(ch)) {
                                  chosen = ch;
                                  break;
                                }
                              }
                              handleNodeChange(cIdx, chosen);
                            }}
                            onContextMenu={(e) => {
                              // User Request: 节点标注轨道节点要增加一个右击直接编辑
                              e.preventDefault();
                              setEditingNodeCycle(cIdx);
                              setEditingNodeVal('');
                            }}
                            className="w-7 h-6 rounded-md border border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-400 dark:text-purple-500 hover:text-purple-700 dark:hover:text-purple-300 flex items-center justify-center text-[11px] font-bold cursor-pointer transition-colors select-none"
                            title={lang === 'zh' ? '左击标记新节点，【右击直接输入自定义字母】' : 'Left-click for new node, right-click to type letter'}
                          >
                            +
                          </button>
                        )}
                        <span className="text-[8px] text-slate-400 font-mono mt-0.5">T{cIdx}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Bus Data Drawer */}
          {showDataEditor && (
            <div className="p-3 bg-violet-50/60 dark:bg-violet-950/30 rounded-lg border border-violet-200 dark:border-violet-900/60 flex flex-col gap-2 text-xs animate-in fade-in duration-100">
              <div className="flex items-center justify-between font-semibold text-violet-900 dark:text-violet-200">
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-violet-600" />
                  <span>{lang === 'zh' ? '总线数据列表 (Bus Data Mapping)' : 'Bus Data Mapping'}</span>
                </div>
                <button
                  onClick={handleAddBusData}
                  className="flex items-center gap-1 px-2 py-0.5 bg-violet-600 hover:bg-violet-700 text-white rounded text-[11px] cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{lang === 'zh' ? '添加数据项' : 'Add Data Item'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'zh'
                  ? '当信号中出现总线符号（`=` 或彩色总线 `2..9`）时，数据项将依次映射到各个总线段中：'
                  : 'When bus symbols (`=` or color buses `2..9`) appear, data items will map sequentially into each segment:'}
              </p>

              <div className="flex flex-wrap gap-2">
                {(signal.data || []).map((val, dIdx) => (
                  <div
                    key={dIdx}
                    className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800 rounded-lg px-2 py-1 shadow-xs"
                  >
                    <span className="font-mono text-slate-400 text-[10px]">#{dIdx + 1}:</span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => handleUpdateBusData(dIdx, e.target.value)}
                      className="font-mono text-xs w-24 bg-transparent focus:outline-hidden text-violet-900 dark:text-violet-200 font-bold"
                    />
                    <button
                      onClick={() => handleRemoveBusData(dIdx)}
                      className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      title={lang === 'zh' ? '删除此项' : 'Delete item'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {(!signal.data || signal.data.length === 0) && (
                  <div className="text-slate-400 italic text-xs py-1">
                    {lang === 'zh' ? '暂无数据。点击“添加数据项”输入如 0x8000, READ, ACK 等。' : 'No data yet. Click "Add Data Item" to input e.g. 0x8000, READ, ACK.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
