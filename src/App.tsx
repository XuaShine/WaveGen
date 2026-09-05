import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Navbar, ThemeMode } from './components/Navbar';
import { WaveformPreview } from './components/WaveformPreview';
import { SignalRow } from './components/SignalRow';
import { EdgeEditor, EdgeEditorPosition } from './components/EdgeEditor';
import { HeadFootEditor } from './components/HeadFootEditor';
import { HeadFootConfigModal } from './components/HeadFootConfigModal';
import { HelpAndGuideModal } from './components/HelpAndGuideModal';
import { ClockDomainModal } from './components/ClockDomainModal';
import { SetupHoldModal } from './components/SetupHoldModal';
import { TemplateLibraryModal } from './components/TemplateLibraryModal';
import { ProjectModal, ProjectSnapshot } from './components/ProjectModal';
import { NewProjectModal } from './components/NewProjectModal';
import { CustomCategoryModal } from './components/CustomCategoryModal';
import { WaveformTypographyModal } from './components/WaveformTypographyModal';
import { PROTOCOL_TEMPLATES } from './data/templates';
import {
  SignalItem,
  EdgeAnnotation,
  HeadFootConfig,
  DiagramConfig,
  ProtocolTemplate,
  EditorTool,
  ViewLayout,
  SignalCategory,
  CategoryMeta,
  CellDensity,
  SIGNAL_CATEGORIES,
  getCategoryMeta,
  inferSignalCategory,
  DEFAULT_FONT_CONFIG,
} from './types';
import {
  buildWaveJson,
  resizeWaveString,
  resizeNodeString,
  setNodeAtCycle,
  autoInsertHoldSymbols,
} from './lib/waveParser';
import { detectFoldableRanges, FoldedRange } from './lib/cycleFolding';
import { useI18n } from './lib/i18n';
import {
  Plus,
  Layers,
  Sparkles,
  Search,
  MousePointer,
  Tag,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronRight,
  Pin,
  X,
  Clock,
  Wand2,
  ChevronsUp,
  ChevronsDown,
  FileText,
  Paintbrush,
  ClipboardPaste,
  Wrench,
  Check,
  SlidersHorizontal,
  Folder,
  FolderPlus,
  GripVertical,
  RotateCcw,
} from 'lucide-react';

const STORAGE_KEY = 'wavedrom_builder_saved_state_v4';

export default function App() {
  const defaultTemplate = PROTOCOL_TEMPLATES[0]; // SPI Mode 0

  // Core WaveDrom Data States
  const [signals, setSignals] = useState<SignalItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.signals) && parsed.signals.length > 0) {
          return parsed.signals;
        }
      }
    } catch (e) {
      console.warn('Could not load saved signals, using template', e);
    }
    return defaultTemplate.signals;
  });

  const { t, lang, language } = useI18n();

  // Signal Row Collapse State Management (User Request: 默认把信号啊节点这些都是折叠起来的要不然默认全展开太占用空间)
  // Map of signalId -> boolean (true: collapsed, false: expanded)
  const [collapsedSignals, setCollapsedSignals] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const s of signals) {
      initial[s.id] = true; // 默认所有信号全部折叠起来！
    }
    return initial;
  });

  const handleToggleSignalCollapse = (signalId: string, collapsed?: boolean) => {
    setCollapsedSignals((prev) => ({
      ...prev,
      [signalId]: collapsed !== undefined ? collapsed : !(prev[signalId] ?? true),
    }));
  };

  const handleCollapseAllSignals = () => {
    const next: Record<string, boolean> = {};
    for (const s of signals) {
      next[s.id] = true;
    }
    setCollapsedSignals(next);
  };

  const handleExpandAllSignals = () => {
    const next: Record<string, boolean> = {};
    for (const s of signals) {
      next[s.id] = false;
    }
    setCollapsedSignals(next);
  };

  const [edges, setEdges] = useState<EdgeAnnotation[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.edges)) {
          return parsed.edges;
        }
      }
    } catch (e) {
      console.warn('Could not load saved edges', e);
    }
    return defaultTemplate.edges || [];
  });

  const [head, setHead] = useState<HeadFootConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.head) return parsed.head;
      }
    } catch (e) {
      console.warn('Could not load saved head', e);
    }
    return defaultTemplate.head || { text: 'SPI 传输协议时序图', tick: 0, every: 1 };
  });

  const [foot, setFoot] = useState<HeadFootConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.foot) return parsed.foot;
      }
    } catch (e) {
      console.warn('Could not load saved foot', e);
    }
    return defaultTemplate.foot || { text: '图例: SCLK 上升沿发起采样, 下降沿数据切换', tock: 0 };
  });

  const [config, setConfig] = useState<DiagramConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.config) return parsed.config;
      }
    } catch (e) {
      console.warn('Could not load saved config', e);
    }
    return defaultTemplate.config || { hscale: 1, skin: 'default' };
  });

  const [totalCycles, setTotalCycles] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.totalCycles === 'number' && parsed.totalCycles > 0) {
          return parsed.totalCycles;
        }
      }
    } catch (e) {
      console.warn('Could not load totalCycles', e);
    }
    const maxLen = signals.reduce((max, s) => Math.max(max, s.wave?.length || 0), 0);
    return Math.max(8, maxLen || defaultTemplate.totalCycles);
  });

  // Theme Mode State: 'light' | 'dark' | 'system' (User Request: 支持整个界面的主题设置，浅色深色跟随系统之类的)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('wavedrom_theme_mode');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved as ThemeMode;
      }
    } catch {}
    return 'system';
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const effectiveDarkMode = themeMode === 'system' ? systemPrefersDark : themeMode === 'dark';

  // Undo / Redo History Stack (User Request: 要支持操作撤销)
  interface HistorySnapshot {
    signals: SignalItem[];
    edges: EdgeAnnotation[];
    totalCycles: number;
    head: HeadFootConfig;
    foot: HeadFootConfig;
    config: DiagramConfig;
  }

  const [historyPast, setHistoryPast] = useState<HistorySnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<HistorySnapshot[]>([]);
  const isUndoRedoingRef = useRef<boolean>(false);

  const createCurrentSnapshot = useCallback((): HistorySnapshot => {
    return {
      signals: JSON.parse(JSON.stringify(signals)),
      edges: JSON.parse(JSON.stringify(edges)),
      totalCycles,
      head: JSON.parse(JSON.stringify(head)),
      foot: JSON.parse(JSON.stringify(foot)),
      config: JSON.parse(JSON.stringify(config)),
    };
  }, [signals, edges, totalCycles, head, foot, config]);

  const recordUndoPoint = useCallback(() => {
    if (isUndoRedoingRef.current) return;
    const snap = createCurrentSnapshot();
    setHistoryPast((prev) => {
      const next = [...prev, snap];
      if (next.length > 35) next.shift();
      return next;
    });
    setHistoryFuture([]);
  }, [createCurrentSnapshot]);

  const handleUndo = useCallback(() => {
    if (historyPast.length === 0) return;
    const current = createCurrentSnapshot();
    const previous = historyPast[historyPast.length - 1];
    const newPast = historyPast.slice(0, historyPast.length - 1);

    isUndoRedoingRef.current = true;
    setHistoryFuture((prev) => [current, ...prev]);
    setHistoryPast(newPast);

    setSignals(previous.signals);
    setEdges(previous.edges);
    setTotalCycles(previous.totalCycles);
    setHead(previous.head);
    setFoot(previous.foot);
    setConfig(previous.config);

    setTimeout(() => {
      isUndoRedoingRef.current = false;
    }, 50);
  }, [historyPast, createCurrentSnapshot]);

  const handleRedo = useCallback(() => {
    if (historyFuture.length === 0) return;
    const current = createCurrentSnapshot();
    const next = historyFuture[0];
    const newFuture = historyFuture.slice(1);

    isUndoRedoingRef.current = true;
    setHistoryPast((prev) => [...prev, current]);
    setHistoryFuture(newFuture);

    setSignals(next.signals);
    setEdges(next.edges);
    setTotalCycles(next.totalCycles);
    setHead(next.head);
    setFoot(next.foot);
    setConfig(next.config);

    setTimeout(() => {
      isUndoRedoingRef.current = false;
    }, 50);
  }, [historyFuture, createCurrentSnapshot]);

  // Global Keyboard Shortcuts (Ctrl+Z, Cmd+Z, Ctrl+Y, Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Layout mode defaults to 'split' (waveform on right with resizable width ratio)
  const [layoutMode, setLayoutMode] = useState<ViewLayout>(() => {
    try {
      const saved = localStorage.getItem('wavedrom_layout_mode');
      if (saved === 'split') return 'split';
      return 'split';
    } catch {
      return 'split';
    }
  });

  // Edge editor position: 'left_bottom' (under signals in left pane) or 'right_bottom' (under waveform in right pane)
  const [edgeEditorPosition, setEdgeEditorPosition] = useState<EdgeEditorPosition>(() => {
    try {
      const saved = localStorage.getItem('wavedrom_edge_editor_position');
      return saved === 'right_bottom' ? 'right_bottom' : 'left_bottom';
    } catch {
      return 'left_bottom';
    }
  });

  const handleEdgeEditorPositionChange = (pos: EdgeEditorPosition) => {
    setEdgeEditorPosition(pos);
    try {
      localStorage.setItem('wavedrom_edge_editor_position', pos);
    } catch {}
  };
  // Sticky preview state: When pinned, scrolling down keeps the waveform visible at top
  const [isPinned, setIsPinned] = useState<boolean>(true);
  // Compact preview height toggle
  const [isCompactPreview, setIsCompactPreview] = useState<boolean>(false);
  const waveformSectionRef = useRef<HTMLElement>(null);
  const [previewHeight, setPreviewHeight] = useState<number>(240);

  useEffect(() => {
    if (!waveformSectionRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.height > 0) {
          setPreviewHeight(Math.round(entry.contentRect.height));
        }
      }
    });
    observer.observe(waveformSectionRef.current);
    return () => observer.disconnect();
  }, [layoutMode, isPinned, isCompactPreview, signals, totalCycles]);

  // Active drawing brush tool: 'select' (default) or '0', '1', '.', 'p', '=', 'x', 'z', 'node'
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  // Search keyword for filtering signals
  const [signalSearchQuery, setSignalSearchQuery] = useState('');
  // Category filter for signals
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<SignalCategory | 'all'>('all');
  // Highlighting focused signal row after quick jump
  const [focusedSignalId, setFocusedSignalId] = useState<string | null>(null);

  // Global Continuous Brush & Clipboard States (Moved to Signal Timing Matrix toolbar)
  const [globalBrush, setGlobalBrush] = useState<string | null>(null);
  const [globalCopiedSymbol, setGlobalCopiedSymbol] = useState<string | null>(null);
  const [isMatrixPinned, setIsMatrixPinned] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wavedrom_matrix_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleMatrixPin = () => {
    setIsMatrixPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wavedrom_matrix_pinned', String(next));
      } catch {}
      return next;
    });
  };

  // Keyboard shortcut: Esc exits active brush mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && globalBrush) {
        setGlobalBrush(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalBrush]);

  // Project Name & Snapshots persistence
  const SNAPSHOTS_STORAGE_KEY = 'wavedrom_project_snapshots_v1';
  const PROJECT_NAME_KEY = 'wavedrom_current_project_name';

  const [projectName, setProjectName] = useState<string>(() => {
    return localStorage.getItem(PROJECT_NAME_KEY) || 'MyTimingDiagram';
  });

  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem(SNAPSHOTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load project snapshots', e);
    }
    return [];
  });

  // Modals
  const [isHeadFootConfigModalOpen, setIsHeadFootConfigModalOpen] = useState(false);
  const [isWaveformFontModalOpen, setIsWaveformFontModalOpen] = useState(false);
  const [isHelpAndGuideModalOpen, setIsHelpAndGuideModalOpen] = useState(false);
  const [helpGuideInitialTab, setHelpGuideInitialTab] = useState<'symbols' | 'textGuide' | 'shortcuts'>('symbols');
  const [isClockDomainModalOpen, setIsClockDomainModalOpen] = useState(false);
  const [isSetupHoldModalOpen, setIsSetupHoldModalOpen] = useState(false);
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isCustomCategoryModalOpen, setIsCustomCategoryModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isNewProjectConfirmOpen, setIsNewProjectConfirmOpen] = useState(false);

  // Left pane reference for scrollable left signals pane
  const leftPaneRef = useRef<HTMLDivElement | null>(null);

  // Custom Categories State (User Request: 增加可以自定义分类的功能)
  const [customCategories, setCustomCategories] = useState<CategoryMeta[]>(() => {
    try {
      const saved = localStorage.getItem('wavedrom_custom_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load custom categories', e);
    }
    return [];
  });

  const handleSaveCustomCategories = (cats: CategoryMeta[]) => {
    setCustomCategories(cats);
    try {
      localStorage.setItem('wavedrom_custom_categories', JSON.stringify(cats));
    } catch (e) {
      console.warn('Failed to save custom categories', e);
    }
  };

  // UI Simplification & Workspace modes
  const [isProMode, setIsProMode] = useState<boolean>(false);
  const [showContinuousBrush, setShowContinuousBrush] = useState<boolean>(false);
  const [showToolsDropdown, setShowToolsDropdown] = useState<boolean>(false);

  // Cycle Folding & Density States (User Request: 将有规律的cycle cell以规则收起来，用户想查看可以点击展开)
  const [foldedRanges, setFoldedRanges] = useState<FoldedRange[]>([]);
  const [cellDensity, setCellDensity] = useState<CellDensity>('standard');
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupNameInput, setNewGroupNameInput] = useState('');
  const [selectedSignalIdsForGroup, setSelectedSignalIdsForGroup] = useState<string[]>([]);

  // Vertical Timing Crosshair & Cycle Alignment Highlight (User Request: 悬停/框选周期在波形预览区高亮垂直辅助线与建立保持比对)
  const [hoveredCycle, setHoveredCycle] = useState<number | null>(null);
  const [lockedCycle, setLockedCycle] = useState<number | null>(null);

  // Auto detect foldable static ranges
  const detectedFoldable = useMemo(() => {
    return detectFoldableRanges(signals, totalCycles);
  }, [signals, totalCycles]);

  const handleToggleAutoFold = () => {
    if (foldedRanges.length > 0) {
      setFoldedRanges([]);
    } else {
      if (detectedFoldable.length > 0) {
        setFoldedRanges(detectedFoldable);
      } else {
        // Fallback: detect any static sequences of length >= 3 in active signals
        const fallback = detectFoldableRanges(signals, totalCycles);
        if (fallback.length > 0) {
          setFoldedRanges(fallback);
        } else {
          // If none found across all signals, notify
          alert('当前波形中未检测到连续 3 拍以上的完全静止周期');
        }
      }
    }
  };

  // Group helpers
  const allGroupNames = useMemo(() => {
    const set = new Set<string>();
    signals.forEach((s) => {
      if (s.group) set.add(s.group);
    });
    return Array.from(set);
  }, [signals]);

  const handleAddSignalInGroup = (groupName: string, afterIndex: number) => {
    recordUndoPoint();
    const newSig: SignalItem = {
      id: `sig_${Date.now()}`,
      name: `${groupName}_SIG`,
      wave: '0' + '.'.repeat(Math.max(0, totalCycles - 1)),
      group: groupName,
    };
    const next = [...signals];
    next.splice(afterIndex + 1, 0, newSig);
    setSignals(next);
  };

  const handleUngroupAll = (groupName: string) => {
    recordUndoPoint();
    setSignals((prev) =>
      prev.map((s) => (s.group === groupName ? { ...s, group: undefined } : s))
    );
  };

  const handleCreateGroupWithSignals = () => {
    const trimmed = newGroupNameInput.trim();
    if (!trimmed) return;
    recordUndoPoint();
    setSignals((prev) =>
      prev.map((s) =>
        selectedSignalIdsForGroup.includes(s.id) ? { ...s, group: trimmed } : s
      )
    );
    setShowCreateGroupModal(false);
    setNewGroupNameInput('');
    setSelectedSignalIdsForGroup([]);
  };
  const [showAddMenu, setShowAddMenu] = useState<boolean>(false);
  const [autoFitTrigger, setAutoFitTrigger] = useState<number>(0);

  // Auto-save status
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving'>('saved');
  const lastSnapshotTimeRef = useRef<number>(Date.now());
  const autoSaveTimerRef = useRef<any>(null);

  // Sync dark mode class and themeMode persistence across document and body
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (effectiveDarkMode) {
      root.classList.add('dark');
      body.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
    try {
      localStorage.setItem('wavedrom_theme_mode', themeMode);
    } catch {}
  }, [themeMode, effectiveDarkMode]);

  // Sync Project Name
  useEffect(() => {
    try {
      localStorage.setItem(PROJECT_NAME_KEY, projectName);
    } catch (e) {
      console.warn('Failed to save project name', e);
    }
  }, [projectName]);

  // Auto-save to localStorage & debounced snapshot management
  useEffect(() => {
    setAutoSaveStatus('saving');
    try {
      const payload = {
        signals,
        edges,
        head,
        foot,
        config,
        totalCycles,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      setAutoSaveStatus('saved');

      // Auto snapshot creation (interval >= 40s)
      const now = Date.now();
      if (now - lastSnapshotTimeRef.current > 40000 && signals.length > 0) {
        lastSnapshotTimeRef.current = now;
        const newSnapshot: ProjectSnapshot = {
          id: `snap_${now}`,
          timestamp: now,
          label: `自动快照 (${new Date(now).toLocaleTimeString()})`,
          totalCycles,
          signalsCount: signals.filter((s) => !s.isSpacer).length,
          data: {
            signals: JSON.parse(JSON.stringify(signals)),
            edges: JSON.parse(JSON.stringify(edges)),
            head: JSON.parse(JSON.stringify(head)),
            foot: JSON.parse(JSON.stringify(foot)),
            config: JSON.parse(JSON.stringify(config)),
            totalCycles,
          },
        };
        setSnapshots((prev) => {
          const updated = [newSnapshot, ...prev.slice(0, 19)];
          try {
            localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
          } catch (err) {
            console.warn('Failed to persist snapshot list:', err);
          }
          return updated;
        });
      }
    }, 350);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [signals, edges, head, foot, config, totalCycles]);

  // Immediate save helper (User Request: 打开失焦保存)
  const saveCurrentProjectImmediately = useCallback(() => {
    try {
      const payload = {
        signals,
        edges,
        head,
        foot,
        config,
        totalCycles,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem(PROJECT_NAME_KEY, projectName);
      setAutoSaveStatus('saved');
    } catch (e) {
      console.error('Failed to immediately save to localStorage:', e);
    }
  }, [signals, edges, head, foot, config, totalCycles, projectName]);

  // User Request: 打开失焦保存 (Enable blur auto-save & tab visibility save)
  useEffect(() => {
    const handleBlur = () => {
      saveCurrentProjectImmediately();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveCurrentProjectImmediately();
      }
    };
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveCurrentProjectImmediately]);

  // Project Rename Handler (User Request: 完善新建工程等功能，包括文件重命名等)
  const handleUpdateProjectName = useCallback((newName: string) => {
    const trimmed = newName.trim() || 'MyTimingDiagram';
    setProjectName(trimmed);
    try {
      localStorage.setItem(PROJECT_NAME_KEY, trimmed);
    } catch {}
    saveCurrentProjectImmediately();
  }, [saveCurrentProjectImmediately]);

  // New Project Modal State & Creator (User Request: 完善新建工程等功能)
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);

  const handleCreateNewProject = (
    newProjName: string,
    templateData: {
      signals: SignalItem[];
      edges: EdgeAnnotation[];
      head: HeadFootConfig;
      foot: HeadFootConfig;
      config: DiagramConfig;
      totalCycles: number;
    }
  ) => {
    // 1. Take a safe snapshot of current design before creating new project
    const now = Date.now();
    const safetySnapshot: ProjectSnapshot = {
      id: `snap_${now}`,
      timestamp: now,
      label: `新建前自动归档 (${projectName || '原工程'})`,
      totalCycles,
      signalsCount: signals.filter((s) => !s.isSpacer).length,
      data: {
        signals: JSON.parse(JSON.stringify(signals)),
        edges: JSON.parse(JSON.stringify(edges)),
        head: JSON.parse(JSON.stringify(head)),
        foot: JSON.parse(JSON.stringify(foot)),
        config: JSON.parse(JSON.stringify(config)),
        totalCycles,
      },
    };
    setSnapshots((prev) => {
      const updated = [safetySnapshot, ...prev.slice(0, 19)];
      try {
        localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Load the template into active state
    setProjectName(newProjName);
    setSignals(templateData.signals);
    setEdges(templateData.edges || []);
    setHead(templateData.head || { tick: 0 });
    setFoot(templateData.foot || { tock: false });
    setConfig(templateData.config || { hscale: 1, skin: 'default' });
    setTotalCycles(templateData.totalCycles || 16);

    // 3. Reset undo/redo history
    setHistoryPast([]);
    setHistoryFuture([]);

    // 4. Save immediately to localStorage
    try {
      localStorage.setItem(PROJECT_NAME_KEY, newProjName);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          signals: templateData.signals,
          edges: templateData.edges || [],
          head: templateData.head || { tick: 0 },
          foot: templateData.foot || { tock: false },
          config: templateData.config || { hscale: 1, skin: 'default' },
          totalCycles: templateData.totalCycles || 16,
        })
      );
    } catch {}

    setAutoFitTrigger((prev) => prev + 1);
  };

  // User Request: 优化堆叠布局，波形渲染放在右侧且中间可以调节占界面右半边多少的比例
  const [rightPanePercent, setRightPanePercent] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wavedrom_right_pane_percent');
      return saved ? Math.min(75, Math.max(25, parseFloat(saved))) : 50;
    } catch {
      return 50;
    }
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const isDraggingSplitterRef = useRef<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitterRef.current = true;
    setIsDraggingSplitter(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingSplitterRef.current || !splitContainerRef.current) return;
      const containerRect = splitContainerRef.current.getBoundingClientRect();
      const rightWidth = containerRect.right - moveEvent.clientX;
      let percent = (rightWidth / containerRect.width) * 100;
      percent = Math.min(75, Math.max(25, percent));
      setRightPanePercent(percent);
      try {
        localStorage.setItem('wavedrom_right_pane_percent', percent.toFixed(1));
      } catch {}
    };

    const handleMouseUp = () => {
      isDraggingSplitterRef.current = false;
      setIsDraggingSplitter(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setAutoFitTrigger((prev) => prev + 1);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetSplitter = () => {
    setRightPanePercent(50);
    try {
      localStorage.setItem('wavedrom_right_pane_percent', '50');
    } catch {}
    setAutoFitTrigger((prev) => prev + 1);
  };

  const handleSetRatioPreset = (percent: number) => {
    setRightPanePercent(percent);
    try {
      localStorage.setItem('wavedrom_right_pane_percent', String(percent));
    } catch {}
    setAutoFitTrigger((prev) => prev + 1);
  };

  // Construct current WaveJSON
  const currentWaveJson = useMemo(() => {
    const normalizedSignals = signals.map((s) => {
      if (s.isSpacer) return s;
      const period = s.period && s.period > 0 ? s.period : 1;
      const effectiveLength = Math.max(1, Math.ceil(totalCycles / period));
      return {
        ...s,
        wave: resizeWaveString(s.wave, effectiveLength),
        node: s.node ? resizeNodeString(s.node, effectiveLength) : undefined,
      };
    });
    return buildWaveJson(normalizedSignals, edges, head, foot, config);
  }, [signals, edges, head, foot, config, totalCycles]);

  // Adjust total cycles across all signals
  const handleChangeTotalCycles = (newCount: number) => {
    recordUndoPoint();
    setTotalCycles(newCount);
    setSignals((prev) =>
      prev.map((s) => {
        if (s.isSpacer) return s;
        const period = s.period && s.period > 0 ? s.period : 1;
        const effectiveLength = Math.max(1, Math.ceil(newCount / period));
        return {
          ...s,
          wave: resizeWaveString(s.wave, effectiveLength),
          node: s.node ? resizeNodeString(s.node, effectiveLength) : undefined,
        };
      })
    );
  };

  // Signal Row Handlers
  const handleUpdateSignal = (index: number, updated: SignalItem) => {
    recordUndoPoint();
    setSignals((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  const handleMoveSignal = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= signals.length) return;
    recordUndoPoint();
    const targetId = signals[fromIdx]?.id;
    setSignals((prev) => {
      const next = [...prev];
      const item = next.splice(fromIdx, 1)[0];
      next.splice(toIdx, 0, item);
      return next;
    });
    if (targetId) {
      handleQuickJumpToSignal(targetId);
    }
  };

  const handleMoveSignalToTop = (fromIdx: number) => {
    if (fromIdx <= 0) return;
    recordUndoPoint();
    const targetId = signals[fromIdx]?.id;
    setSignals((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.unshift(item);
      return next;
    });
    if (targetId) {
      handleQuickJumpToSignal(targetId);
    }
  };

  const handleMoveSignalToBottom = (fromIdx: number) => {
    if (fromIdx >= signals.length - 1) return;
    recordUndoPoint();
    const targetId = signals[fromIdx]?.id;
    setSignals((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.push(item);
      return next;
    });
    if (targetId) {
      handleQuickJumpToSignal(targetId);
    }
  };

  // Drag and Drop Signal Row Reordering (User Request: 支持拖拽信号框上移下移)
  const [draggingSignalIndex, setDraggingSignalIndex] = useState<number | null>(null);
  const [dragOverSignalIndex, setDragOverSignalIndex] = useState<number | null>(null);

  const handleSignalDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingSignalIndex(index);
  };

  const handleSignalDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSignalIndex !== index) {
      setDragOverSignalIndex(index);
    }
  };

  const handleSignalDragLeave = (e: React.DragEvent, index: number) => {
    if (dragOverSignalIndex === index) {
      setDragOverSignalIndex(null);
    }
  };

  const handleSignalDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = sourceIndexStr !== '' ? parseInt(sourceIndexStr, 10) : draggingSignalIndex;
    if (sourceIndex !== null && !isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      handleMoveSignal(sourceIndex, targetIndex);
    }
    setDraggingSignalIndex(null);
    setDragOverSignalIndex(null);
  };

  const handleSignalDragEnd = () => {
    setDraggingSignalIndex(null);
    setDragOverSignalIndex(null);
  };

  const handleDuplicateSignal = (index: number) => {
    recordUndoPoint();
    setSignals((prev) => {
      const next = [...prev];
      const original = next[index];
      const copy: SignalItem = {
        ...original,
        id: `sig_${Date.now()}_copy`,
        name: `${original.name}_copy`,
        data: original.data ? [...original.data] : undefined,
      };
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const handleDeleteSignal = (index: number) => {
    recordUndoPoint();
    setSignals((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick jump & highlight a signal row (User Request: 信号直达要和分类导航合并，点击了就要跳转到相应的信号)
  const handleQuickJumpToSignal = (signalId: string) => {
    if (signalSearchQuery.trim()) {
      setSignalSearchQuery('');
    }
    // 自动展开目标信号，方便用户立即查看和编辑
    setCollapsedSignals((prev) => ({
      ...prev,
      [signalId]: false,
    }));
    setFocusedSignalId(signalId);
    setTimeout(() => {
      const el =
        document.getElementById(`signal_row_${signalId}`) ||
        document.getElementById(`signal-row-${signalId}`) ||
        document.querySelector(`[data-signal-id="${signalId}"]`);
      if (el) {
        if (layoutMode === 'split') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Calculate exact obstruction height from sticky headers
          const navbarHeight = 49;
          const matrixEl = document.getElementById('signal-matrix-header');
          const matrixHeight =
            isMatrixPinned && matrixEl ? matrixEl.getBoundingClientRect().height : 0;
          const totalStickyOffset = navbarHeight + matrixHeight + 16;

          const rect = el.getBoundingClientRect();
          const currentAbsoluteTop = window.pageYOffset + rect.top;
          const targetY = Math.max(0, currentAbsoluteTop - totalStickyOffset);
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      }
    }, 60);
    setTimeout(() => {
      setFocusedSignalId((curr) => (curr === signalId ? null : curr));
    }, 2500);
  };

  // Apply Setup & Hold Timing Window Generator
  const handleApplySetupHold = (
    newSignals: SignalItem[],
    newEdges: EdgeAnnotation[],
    cycles: number,
    headConfig: HeadFootConfig,
    footConfig: HeadFootConfig,
    replaceExisting: boolean,
    configUpdates?: Partial<DiagramConfig>
  ) => {
    if (replaceExisting) {
      setSignals(newSignals);
      setEdges(newEdges);
    } else {
      setSignals((prev) => [...newSignals, ...prev]);
      setEdges((prev) => [...prev, ...newEdges]);
    }
    setTotalCycles(cycles);
    setHead((prev) => ({ ...prev, ...headConfig }));
    setFoot((prev) => ({ ...prev, ...footConfig }));
    if (configUpdates) {
      setConfig((prev) => ({ ...prev, ...configUpdates }));
    }
  };

  // Add Signal to TOP (User requested: avoids having to move from the bottom)
  const handleAddSignalToTop = () => {
    const newSig: SignalItem = {
      id: `sig_${Date.now()}`,
      name: `SIG_${signals.length + 1}`,
      wave: '0' + '.'.repeat(Math.max(0, totalCycles - 1)),
      period: 1,
    };
    setSignals((prev) => [newSig, ...prev]);
    setTimeout(() => {
      handleQuickJumpToSignal(newSig.id);
    }, 80);
  };

  // Add Signal to BOTTOM
  const handleAddSignalToBottom = () => {
    const newSig: SignalItem = {
      id: `sig_${Date.now()}`,
      name: `SIG_${signals.length + 1}`,
      wave: '0' + '.'.repeat(Math.max(0, totalCycles - 1)),
      period: 1,
    };
    setSignals((prev) => [...prev, newSig]);
    setTimeout(() => {
      handleQuickJumpToSignal(newSig.id);
    }, 80);
  };

  // Insert Signal directly below a specific row
  const handleAddSignalBelow = (index: number) => {
    const newSig: SignalItem = {
      id: `sig_${Date.now()}`,
      name: `SIG_${signals.length + 1}`,
      wave: '0' + '.'.repeat(Math.max(0, totalCycles - 1)),
      period: 1,
    };
    setSignals((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, newSig);
      return next;
    });
    setTimeout(() => {
      handleQuickJumpToSignal(newSig.id);
    }, 80);
  };

  // Quick Pipeline Tap: generates delayed register signal (_d1, _d2, etc.) shifted by 1 cycle
  const handleAddPipelineTapSignal = useCallback((signalId: string) => {
    recordUndoPoint();
    let createdSignalId = '';
    setSignals((prev) => {
      const idx = prev.findIndex((s) => s.id === signalId);
      if (idx === -1) return prev;
      const target = prev[idx];
      const baseName = target.name.replace(/_d\d+$/, '');
      const dMatch = target.name.match(/_d(\d+)$/);
      const nextNum = dMatch ? parseInt(dMatch[1], 10) + 1 : 1;
      const newName = `${baseName}_d${nextNum}`;

      // Delay wave by 1 cycle: prepend '.' and truncate to totalCycles
      const delayedWave = '.' + target.wave.slice(0, Math.max(1, totalCycles - 1));
      const delayedNode = target.node ? '.' + target.node.slice(0, Math.max(1, totalCycles - 1)) : undefined;
      const newSigId = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      createdSignalId = newSigId;

      const newSignal: SignalItem = {
        ...JSON.parse(JSON.stringify(target)),
        id: newSigId,
        name: newName,
        wave: delayedWave,
        node: delayedNode,
      };

      const copy = [...prev];
      copy.splice(idx + 1, 0, newSignal);
      return copy;
    });

    if (createdSignalId) {
      setTimeout(() => {
        handleQuickJumpToSignal(createdSignalId);
      }, 80);
    }
  }, [recordUndoPoint, totalCycles]);

  // Add Phase Text Banner Track (Directly solves User Request 2!)
  const handleAddPhaseTrack = () => {
    const step = Math.max(2, Math.floor(totalCycles / 4));
    let waveStr = '';
    const colors = ['2', '3', '4', '5'];
    const dataLabels = ['阶段一: 握手就绪', '阶段二: 地址配置', '阶段三: 数据传输', '阶段四: 校验应答'];
    for (let i = 0; i < 4; i++) {
      const char = colors[i % colors.length];
      const remaining = i === 3 ? totalCycles - waveStr.length : step;
      waveStr += char + '.'.repeat(Math.max(0, remaining - 1));
    }
    waveStr = waveStr.slice(0, totalCycles);
    const newSig: SignalItem = {
      id: `sig_phase_${Date.now()}`,
      name: 'PHASE 阶段说明',
      wave: waveStr,
      data: dataLabels,
      period: 1,
    };
    setSignals((prev) => [newSig, ...prev]);
    setTimeout(() => {
      handleQuickJumpToSignal(newSig.id);
    }, 80);
  };

  // Add Sample Annotated Edge
  const handleAddSampleAnnotatedEdge = () => {
    const valid = signals.filter((s) => !s.isSpacer);
    if (valid.length >= 1) {
      handleUpdateSignalNode(valid[0].id, 1, 'a');
      if (valid.length >= 2) {
        handleUpdateSignalNode(valid[1].id, Math.min(totalCycles - 1, 3), 'b');
      } else {
        handleUpdateSignalNode(valid[0].id, Math.min(totalCycles - 1, 3), 'b');
      }
      const newEdge: EdgeAnnotation = {
        id: `edge_${Date.now()}`,
        source: 'a',
        target: 'b',
        arrow: '~>',
        label: '建立时间 t_setup ≥ 2.5ns',
      };
      setEdges((prev) => [...prev, newEdge]);
    }
  };

  const handleAddSpacer = () => {
    const spacer: SignalItem = {
      id: `spacer_${Date.now()}`,
      name: '',
      wave: '',
      isSpacer: true,
    };
    setSignals((prev) => [...prev, spacer]);
  };

  // Global Auto-Hold Optimization: converts 1111 -> 1... and 0000 -> 0... across all signals
  const handleGlobalAutoHoldOptimize = () => {
    setSignals((prev) =>
      prev.map((s) => {
        if (s.isSpacer) return s;
        return {
          ...s,
          wave: autoInsertHoldSymbols(s.wave),
        };
      })
    );
  };

  // Apply non-integer Multi-Clock Domain generation (e.g. 1GHz vs 800MHz)
  const handleApplyClockDomain = (
    newSignals: SignalItem[],
    totalTicks: number,
    headUpdates: Partial<HeadFootConfig>,
    footUpdates: Partial<HeadFootConfig>,
    replaceExisting: boolean,
    configUpdates?: Partial<DiagramConfig>,
    autoFit?: boolean
  ) => {
    if (replaceExisting) {
      setSignals(newSignals);
    } else {
      setSignals((prev) => [...newSignals, ...prev]);
    }
    setTotalCycles(totalTicks);
    setHead((prev) => ({ ...prev, ...headUpdates }));
    setFoot((prev) => ({ ...prev, ...footUpdates }));
    if (configUpdates) {
      setConfig((prev) => ({ ...prev, ...configUpdates }));
    }
    if (autoFit) {
      setAutoFitTrigger(Date.now());
    }
  };

  // Quick 1-click add signal by category (Supports built-in and user custom categories)
  const handleAddCategorySignal = (category: SignalCategory) => {
    const defaultConfigs: Record<string, { name: string; wave: string }> = {
      clock: { name: 'CLK_REF', wave: 'p' + '.'.repeat(Math.max(0, totalCycles - 1)) },
      reset: { name: 'RST_N', wave: '0' + '.'.repeat(2) + '1' + '.'.repeat(Math.max(0, totalCycles - 3)) },
      control: { name: 'CTRL_EN', wave: '01.0' + '.'.repeat(Math.max(0, totalCycles - 4)) },
      status: { name: 'STATUS_READY', wave: '0' + '.'.repeat(5) + '1' + '.'.repeat(Math.max(0, totalCycles - 6)) },
      bus: { name: 'DATA_BUS[7:0]', wave: '=2.3.4.' + '.'.repeat(Math.max(0, totalCycles - 7)) },
      other: { name: 'SIG_OTHER', wave: '01.01.' + '.'.repeat(Math.max(0, totalCycles - 6)) },
    };

    const customMatch = customCategories.find((c) => c.id === category);
    const conf = defaultConfigs[category] || {
      name: customMatch ? `${customMatch.name}_SIG` : `${category.toUpperCase()}_SIG`,
      wave: '01.01.',
    };

    const newSig: SignalItem = {
      id: `sig_${category}_${Date.now()}`,
      name: conf.name,
      wave: conf.wave.slice(0, totalCycles).padEnd(totalCycles, '.'),
      category: category,
      period: 1,
    };
    setSignals((prev) => [newSig, ...prev]);
    setSelectedCategoryFilter('all');
  };

  // Update node tag from EdgeEditor quick injector
  const handleUpdateSignalNode = (signalId: string, cycleIndex: number, tag: string) => {
    setSignals((prev) =>
      prev.map((s) => {
        if (s.id !== signalId) return s;
        const period = s.period && s.period > 0 ? s.period : 1;
        const effectiveLength = Math.max(1, Math.ceil(totalCycles / period));
        const updatedNode = setNodeAtCycle(s.node, cycleIndex, tag, effectiveLength);
        return {
          ...s,
          node: updatedNode,
        };
      })
    );
    // Focus on that signal
    handleQuickJumpToSignal(signalId);
  };

  // Template Loader
  const handleSelectTemplate = (tpl: ProtocolTemplate) => {
    setSignals(tpl.signals);
    setEdges(tpl.edges || []);
    setTotalCycles(tpl.totalCycles);
    if (tpl.head) setHead(tpl.head);
    if (tpl.foot) setFoot(tpl.foot);
    if (tpl.config) setConfig(tpl.config);
  };

  // Project loader from .wavedrom file or snapshot
  const handleLoadProject = (projectData: {
    signals: SignalItem[];
    edges: EdgeAnnotation[];
    head: HeadFootConfig;
    foot: HeadFootConfig;
    config: DiagramConfig;
    totalCycles: number;
  }) => {
    setSignals(projectData.signals);
    setEdges(projectData.edges || []);
    setHead(projectData.head || { text: '' });
    setFoot(projectData.foot || { text: '' });
    setConfig(projectData.config || { hscale: 1 });
    setTotalCycles(projectData.totalCycles || 16);
  };

  // Restore from snapshot
  const handleRestoreSnapshot = (snap: ProjectSnapshot) => {
    handleLoadProject(snap.data);
  };

  // Clear all snapshots
  const handleClearSnapshots = () => {
    setSnapshots([]);
    try {
      localStorage.removeItem(SNAPSHOTS_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear snapshots', e);
    }
  };

  // New Project
  const handleNewProject = () => {
    setIsNewProjectConfirmOpen(true);
  };

  const executeNewProject = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    handleSelectTemplate(defaultTemplate);
    setProjectName(lang === 'zh' ? '新建波形工程' : 'New Waveform Project');
    setHistoryPast([]);
    setHistoryFuture([]);
    setAutoFitTrigger((prev) => prev + 1);
    setIsNewProjectConfirmOpen(false);
  };

  // Reset to default
  const handleResetToDefault = () => {
    setIsResetConfirmOpen(true);
  };

  const executeResetToDefault = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    handleSelectTemplate(defaultTemplate);
    setHistoryPast([]);
    setHistoryFuture([]);
    setAutoFitTrigger((prev) => prev + 1);
    setIsResetConfirmOpen(false);
  };

  // Import JSON handler
  const handleImportWaveJson = (imported: any) => {
    if (!imported || !Array.isArray(imported.signal)) return;

    const newSignals: SignalItem[] = [];
    let maxCycles = 8;

    imported.signal.forEach((item: any, idx: number) => {
      if (item === null || (typeof item === 'object' && !item.name && !item.wave)) {
        newSignals.push({
          id: `spacer_import_${idx}`,
          name: '',
          wave: '',
          isSpacer: true,
        });
      } else {
        const wave = typeof item.wave === 'string' ? item.wave : '';
        maxCycles = Math.max(maxCycles, wave.length);
        newSignals.push({
          id: `sig_import_${idx}`,
          name: item.name || `SIG_${idx + 1}`,
          wave: wave,
          period: typeof item.period === 'number' ? item.period : 1,
          data: Array.isArray(item.data) ? item.data : (typeof item.data === 'string' ? item.data.split(' ') : undefined),
          node: typeof item.node === 'string' ? item.node : undefined,
          phase: typeof item.phase === 'number' ? item.phase : undefined,
        });
      }
    });

    setSignals(newSignals);
    setTotalCycles(maxCycles);

    // Import edges
    if (Array.isArray(imported.edge)) {
      const parsedEdges: EdgeAnnotation[] = imported.edge.map((raw: string, idx: number) => {
        const match = raw.match(/^([a-zA-Z0-9])\s*(->|~>|<->|-~>|<~>|-\||\|->)\s*([a-zA-Z0-9])(?:\s+(.*))?$/);
        if (match) {
          return {
            id: `edge_imp_${idx}`,
            source: match[1],
            arrow: match[2] as any,
            target: match[3],
            label: match[4] || '',
          };
        }
        return {
          id: `edge_imp_${idx}`,
          source: 'a',
          arrow: '->',
          target: 'b',
          label: raw,
        };
      });
      setEdges(parsedEdges);
    }

    if (imported.head) setHead(imported.head);
    if (imported.foot) setFoot(imported.foot);
    if (imported.config) setConfig(imported.config);
  };

  // Quick Brush Tools Definition
  const BRUSH_TOOLS: Array<{ id: EditorTool; label: string; icon: string; desc: string; color: string }> = [
    { id: 'select', label: '👆 单击循环', icon: '👆', desc: '默认选择模式，点击方块轮换状态', color: 'bg-slate-100 dark:bg-slate-800' },
    { id: '0', label: '刷 0 (低)', icon: '0', desc: '点击方块直接刷入 低电平 0', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
    { id: '1', label: '刷 1 (高)', icon: '1', desc: '点击方块直接刷入 高电平 1', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
    { id: '.', label: '刷 . (保持)', icon: '.', desc: '点击方块直接刷入 保持上一拍 .', color: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200' },
    { id: 'p', label: '刷 p (时钟)', icon: 'p', desc: '点击方块直接刷入 上升沿时钟 p', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    { id: '=', label: '刷 = (总线)', icon: '=', desc: '点击方块直接刷入 总线数据 =', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
    { id: 'x', label: '刷 x (不定)', icon: 'x', desc: '点击方块直接刷入 不定态 x', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' },
    { id: 'z', label: '刷 z (高阻)', icon: 'z', desc: '点击方块直接刷入 高阻态 z', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300' },
    { id: 'node', label: '🏷️ 标注节点', icon: '🏷️', desc: '点击方块打标时序关联字母 (a, b, c...)', color: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300' },
  ];

  // Filter signals based on search query and category
  const filteredSignals = useMemo(() => {
    return signals.filter((s) => {
      if (s.isSpacer) {
        return selectedCategoryFilter === 'all' && !signalSearchQuery.trim();
      }
      if (selectedCategoryFilter !== 'all') {
        const cat = s.category || inferSignalCategory(s);
        if (cat !== selectedCategoryFilter) return false;
      }
      if (signalSearchQuery.trim()) {
        const q = signalSearchQuery.toLowerCase().trim();
        if (!s.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [signals, signalSearchQuery, selectedCategoryFilter]);

  // Grouping structure for Signal Timing Matrix
  type SignalListItem =
    | { type: 'standalone'; signal: SignalItem; originalIndex: number }
    | { type: 'group'; groupName: string; items: { signal: SignalItem; originalIndex: number }[] };

  const signalListGroups = useMemo(() => {
    const result: SignalListItem[] = [];
    let currentGroup: { groupName: string; items: { signal: SignalItem; originalIndex: number }[] } | null = null;

    for (const sig of filteredSignals) {
      const originalIndex = signals.findIndex((s) => s.id === sig.id);
      if (sig.group) {
        if (currentGroup && currentGroup.groupName === sig.group) {
          currentGroup.items.push({ signal: sig, originalIndex });
        } else {
          if (currentGroup) {
            result.push({ type: 'group', ...currentGroup });
          }
          currentGroup = { groupName: sig.group, items: [{ signal: sig, originalIndex }] };
        }
      } else {
        if (currentGroup) {
          result.push({ type: 'group', ...currentGroup });
          currentGroup = null;
        }
        result.push({ type: 'standalone', signal: sig, originalIndex });
      }
    }
    if (currentGroup) {
      result.push({ type: 'group', ...currentGroup });
    }
    return result;
  }, [filteredSignals, signals]);

  return (
    <div
      className={`${
        layoutMode === 'split' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
      } bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150`}
    >
      {/* Top Navigation Bar */}
      <Navbar
        themeMode={themeMode}
        effectiveDarkMode={effectiveDarkMode}
        onChangeThemeMode={(mode) => setThemeMode(mode)}
        layoutMode={layoutMode}
        onToggleLayoutMode={() => {
          const next = layoutMode === 'split' ? 'stacked' : 'split';
          setLayoutMode(next);
          try {
            localStorage.setItem('wavedrom_layout_mode', next);
          } catch {}
          setAutoFitTrigger((prev) => prev + 1);
        }}
        onOpenTemplateLibrary={() => setIsTemplateLibraryOpen(true)}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onOpenNewProject={() => setIsNewProjectModalOpen(true)}
        onOpenHelpModal={() => {
          setHelpGuideInitialTab('symbols');
          setIsHelpAndGuideModalOpen(true);
        }}
        onOpenTextGuide={() => {
          setHelpGuideInitialTab('textGuide');
          setIsHelpAndGuideModalOpen(true);
        }}
        onResetToDefault={handleResetToDefault}
        skin={config.skin || 'default'}
        onSkinChange={(newSkin) => {
          recordUndoPoint();
          setConfig((prev) => ({ ...prev, skin: newSkin }));
        }}
        hscale={config.hscale || 1}
        onHscaleChange={(newHscale) => {
          recordUndoPoint();
          setConfig((prev) => ({ ...prev, hscale: newHscale }));
        }}
        totalCycles={totalCycles}
        onChangeTotalCycles={handleChangeTotalCycles}
        autoSaveStatus={autoSaveStatus}
        canUndo={historyPast.length > 0}
        canRedo={historyFuture.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        projectName={projectName}
        onUpdateProjectName={handleUpdateProjectName}
      />

      {/* Main Workspace Layout */}
      <main
        className={
          layoutMode === 'split'
            ? 'flex-1 w-full px-2 sm:px-3 lg:px-4 py-1.5 flex flex-col h-[calc(100vh-3.25rem)] min-h-0 overflow-hidden'
            : 'flex-1 w-full px-2 sm:px-3 lg:px-4 py-2 flex flex-col gap-2.5'
        }
      >
        {/* Real-time WaveDrom Preview Section (Stacked mode only) */}
        {layoutMode === 'stacked' && (
          <section
            ref={waveformSectionRef}
            className={`transition-all duration-150 ${
              isPinned
                ? 'sticky top-[49px] z-30 shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl'
                : 'shadow-xs'
            }`}
          >
            <WaveformPreview
              waveJson={currentWaveJson}
              skin={config.skin || 'default'}
              isPinned={isPinned}
              onTogglePin={() => setIsPinned(!isPinned)}
              isCompact={isCompactPreview}
              onToggleCompact={() => setIsCompactPreview(!isCompactPreview)}
              onSkinChange={(newSkin) => setConfig((prev) => ({ ...prev, skin: newSkin }))}
              onOpenHeadFootConfig={() => setIsHeadFootConfigModalOpen(true)}
              onOpenFontModal={() => setIsWaveformFontModalOpen(true)}
              autoFitTrigger={autoFitTrigger}
              hoveredCycle={hoveredCycle}
              onHoverCycleChange={setHoveredCycle}
              lockedCycle={lockedCycle}
              onLockCycleChange={setLockedCycle}
              totalCycles={totalCycles}
              layoutMode="stacked"
              onToggleLayoutMode={() => {
                setLayoutMode('split');
                try {
                  localStorage.setItem('wavedrom_layout_mode', 'split');
                } catch {}
                setAutoFitTrigger((prev) => prev + 1);
              }}
            />
          </section>
        )}

        {/* Dynamic Split / Stacked Layout Container */}
        <div
          ref={splitContainerRef}
          className={
            layoutMode === 'split'
              ? 'flex flex-row items-stretch w-full relative gap-0 h-full min-h-0 flex-1 overflow-hidden'
              : 'flex flex-col gap-2.5'
          }
        >
          {/* Left / Main Column: Signals Grid, Tools & Edge Annotations (Independently scrollable) */}
          <div
            ref={leftPaneRef}
            className={`flex flex-col gap-2.5 min-w-0 ${
              layoutMode === 'split'
                ? 'w-full lg:w-auto shrink-0 h-full min-h-0 overflow-y-auto pr-2 pb-24 select-text'
                : 'w-full'
            }`}
            style={
              layoutMode === 'split'
                ? {
                    width: `calc(100% - ${rightPanePercent}% - 14px)`,
                    maxWidth: `calc(100% - ${rightPanePercent}% - 14px)`,
                  }
                : undefined
            }
          >

            {/* Signal Timing Matrix - Streamlined Master Control Bar */}
            <div
              id="signal-matrix-header"
              className={`px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-1.5 transition-all ${
                isMatrixPinned
                  ? layoutMode === 'split'
                    ? 'sticky top-0 z-20 shadow-md backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-blue-400 dark:border-blue-600 ring-1 ring-blue-400/30'
                    : 'sticky top-0 z-20 shadow-md backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-blue-400 dark:border-blue-600 ring-1 ring-blue-400/30'
                  : ''
              }`}
            >
              {/* Top Row: Title, Total Cycles, Folding, Density, and Core Operations */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {t('signal_timing_matrix')}
                    </h2>
                  </div>

                  {/* Total Cycles Controller (总周期) */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap text-[11px]">{t('total_cycles')}:</span>
                    <button
                      type="button"
                      onClick={() => handleChangeTotalCycles(totalCycles - 1)}
                      disabled={totalCycles <= 2}
                      className="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 cursor-pointer font-bold border border-slate-200 dark:border-slate-600 select-none text-xs"
                      title="减少 1 拍"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="2"
                      max="128"
                      value={totalCycles}
                      onChange={(e) => handleChangeTotalCycles(parseInt(e.target.value) || 2)}
                      className="w-9 text-center font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-1 py-0.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      title="总周期数（可直接手动输入数字）"
                    />
                    <button
                      type="button"
                      onClick={() => handleChangeTotalCycles(totalCycles + 1)}
                      disabled={totalCycles >= 128}
                      className="w-5 h-5 flex items-center justify-center rounded bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 cursor-pointer font-bold border border-slate-200 dark:border-slate-600 select-none text-xs"
                      title="增加 1 拍"
                    >
                      +
                    </button>
                    <span className="text-slate-400 text-[10px]">{t('cycles_unit')}</span>
                  </div>

                  {/* Cycle Folding Button */}
                  <button
                    type="button"
                    onClick={handleToggleAutoFold}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      foldedRanges.length > 0
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 shadow-2xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                    title={
                      foldedRanges.length > 0
                        ? lang === 'zh'
                          ? '点击展开所有已收起的周期'
                          : 'Click to unfold all folded cycles'
                        : lang === 'zh'
                        ? '智能收起长段静止周期，收起后点击折叠方块可随时单独展开'
                        : 'Auto-fold long repeating idle cycles'
                    }
                  >
                    <span>
                      {foldedRanges.length > 0
                        ? lang === 'zh'
                          ? `展开全部 (${foldedRanges.length}处折叠)`
                          : `Unfold All (${foldedRanges.length})`
                        : detectedFoldable.length > 0
                        ? lang === 'zh'
                          ? `智能收起周期 (${detectedFoldable.length}处静止)`
                          : `Fold Cycles (${detectedFoldable.length})`
                        : t('fold_cycles')}
                    </span>
                  </button>

                  {/* Cell Density Switcher (Mini / Compact / Standard) */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCellDensity('mini')}
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-medium ${
                        cellDensity === 'mini'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="微缩网格：最紧凑视图，适合长周期全局一览"
                    >
                      {t('density_mini')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCellDensity('compact')}
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-medium ${
                        cellDensity === 'compact'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="紧凑网格：适中视图，兼顾密集排布"
                    >
                      {t('density_compact')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCellDensity('standard')}
                      className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-medium ${
                        cellDensity === 'standard'
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs font-bold'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                      title="标准网格：默认大小"
                    >
                      {t('density_standard')}
                    </button>
                  </div>

                  {/* Operational Mode Toggle: 常用 vs 进阶 (User request: 常用/进阶按钮宽一点) */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsProMode(false)}
                      className={`px-3.5 py-1 rounded-md font-semibold transition-all cursor-pointer min-w-[54px] text-center ${
                        !isProMode
                          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                      title="常用模式：界面清爽，收起次要工具与冗余配置，专注波形绘制"
                    >
                      {t('basic_mode')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsProMode(true)}
                      className={`px-3.5 py-1 rounded-md font-semibold transition-all cursor-pointer min-w-[54px] text-center ${
                        isProMode
                          ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                      title="进阶模式：默认展开高级属性（分频、延时、画笔条、快速定位与完整快捷操作）"
                    >
                      {t('pro_mode')}
                    </button>
                  </div>
                </div>

                {/* Right Action Tools Group */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Add Signal Group Button */}
                  <button
                    type="button"
                    onClick={() => setShowCreateGroupModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
                    title={lang === 'zh' ? "新建信号分组（波形左侧将以中括号包裹同组成员）" : "Create signal group"}
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
                    <span>{t('add_group')}</span>
                  </button>

                  {/* Add Signal Dropdown (With 1-click classification templates) */}
                  <div className="relative">
                    <div className="flex items-center rounded-lg bg-blue-600 text-white shadow-2xs">
                      <button
                        type="button"
                        onClick={handleAddSignalToTop}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold hover:bg-blue-700 rounded-l-lg cursor-pointer transition-colors"
                        title={lang === 'zh' ? "在最上方快速添加默认信号" : "Add default signal to top"}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('add_signal')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        className="p-1.5 hover:bg-blue-700 rounded-r-lg border-l border-blue-500/70 cursor-pointer transition-colors"
                        title={lang === 'zh' ? "按分类添加 (通道 A/B/C/D、时钟、总线、模拟量、电源、中断等)" : "Add signal by category"}
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAddMenu ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {showAddMenu && (
                      <div className="absolute left-0 top-full mt-1.5 z-50 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-2 text-xs flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {lang === 'zh' ? '选择信号添加方式' : 'Add Signal Option'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAddMenu(false)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              handleAddSignalToTop();
                              setShowAddMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium cursor-pointer"
                          >
                            <span>⬆️ {lang === 'zh' ? '在最上方添加通用信号' : 'Add Signal to Top'}</span>
                            <span className="text-[10px] text-slate-400">{lang === 'zh' ? '顶部' : 'Top'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAddSignalToBottom();
                              setShowAddMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium cursor-pointer"
                          >
                            <span>⬇️ {lang === 'zh' ? '在最下方添加通用信号' : 'Add Signal to Bottom'}</span>
                            <span className="text-[10px] text-slate-400">{lang === 'zh' ? '底部' : 'Bottom'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleAddSpacer();
                              setShowAddMenu(false);
                            }}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-medium text-slate-600 dark:text-slate-400 cursor-pointer"
                          >
                            <span>➖ {lang === 'zh' ? '插入空白隔离行 (Spacer)' : 'Insert Spacer Row'}</span>
                            <span className="text-[10px] text-slate-400">{lang === 'zh' ? '分割' : 'Spacer'}</span>
                          </button>
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center justify-between px-1 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              {lang === 'zh' ? '按分类一键添加信号' : 'Add by Category'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddMenu(false);
                                setIsCustomCategoryModalOpen(true);
                              }}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                            >
                              {lang === 'zh' ? '+ 自定义分类' : '+ Custom Categories'}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                            {SIGNAL_CATEGORIES.map((cat) => (
                              <button
                                key={`add_cat_${cat.id}`}
                                type="button"
                                onClick={() => {
                                  handleAddCategorySignal(cat.id);
                                  setShowAddMenu(false);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-100 dark:border-slate-800 cursor-pointer transition-colors"
                              >
                                <span>{cat.icon}</span>
                                <span className="truncate">{lang === 'en' && cat.enName ? cat.enName : (cat.label || cat.name)}</span>
                              </button>
                            ))}
                            {customCategories.map((cat) => (
                              <button
                                key={`add_custom_cat_${cat.id}`}
                                type="button"
                                onClick={() => {
                                  handleAddCategorySignal(cat.id);
                                  setShowAddMenu(false);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 border border-slate-100 dark:border-slate-800 cursor-pointer transition-colors"
                              >
                                <span>{cat.icon}</span>
                                <span className="truncate">{cat.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Brush Tool Palette Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowContinuousBrush(!showContinuousBrush)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                      showContinuousBrush || globalBrush
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs ring-2 ring-amber-400/40'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                    }`}
                    title={lang === 'zh' ? "展开/收起连续绘制画笔调色板 (选定后拖拽鼠标即可连续涂刷)" : "Toggle continuous brush toolbar"}
                  >
                    <Paintbrush className="w-3.5 h-3.5" />
                    <span>{globalBrush ? `${lang === 'zh' ? '画笔' : 'Brush'}[${globalBrush}]` : t('continuous_brush')}</span>
                  </button>

                  {/* Unified Secondary Tools Dropdown (Replaces scattered cluttered buttons) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                        showToolsDropdown
                          ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                      title={lang === 'zh' ? "更多高级辅助工具 (阶段文字轨、跨时钟域计算器、标尺设置、吸顶等)" : "More tools (Phase tracks, CDC calculator, sticky headers)"}
                    >
                      <Wrench className="w-3.5 h-3.5 text-purple-500" />
                      <span>{t('advanced_tools')}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showToolsDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showToolsDropdown && (
                      <div className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 text-xs flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex items-center justify-between pb-1 px-1 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {t('advanced_toolbox')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowToolsDropdown(false)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            handleAddPhaseTrack();
                            setShowToolsDropdown(false);
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-left font-medium cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-purple-500 shrink-0" />
                          <span>{t('insert_phase_track')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsClockDomainModalOpen(true);
                            setShowToolsDropdown(false);
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-left font-medium cursor-pointer"
                        >
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>{t('cdc_calculator')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsSetupHoldModalOpen(true);
                            setShowToolsDropdown(false);
                          }}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-left font-medium cursor-pointer"
                        >
                          <SlidersHorizontal className="w-4 h-4 text-blue-500 shrink-0" />
                          <span>{t('setup_hold_window')}</span>
                        </button>

                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2 py-1">
                          <span className="text-slate-500">{t('sticky_matrix_title')}</span>
                          <button
                            type="button"
                            onClick={handleToggleMatrixPin}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer border ${
                              isMatrixPinned
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {isMatrixPinned ? t('status_enabled') : t('status_disabled')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Signal Search Box placed directly on the same line as Advanced Tools (User Request: 搜索信号放在和高级工具在一行) */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 w-44 sm:w-56 shadow-2xs ml-auto">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={signalSearchQuery}
                    onChange={(e) => setSignalSearchQuery(e.target.value)}
                    placeholder={t('search_placeholder')}
                    className="bg-transparent text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden w-full font-medium"
                  />
                  {signalSearchQuery && (
                    <button
                      onClick={() => setSignalSearchQuery('')}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={t('clear_search')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Continuous Brush Tool Toolbar (Collapsible to save precious vertical space) */}
              {(showContinuousBrush || isProMode || globalBrush) && (
                <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1 text-[11px] mr-1">
                      <Paintbrush className="w-3.5 h-3.5 text-amber-600" />
                      <span>{t('continuous_brush_mode')}</span>
                    </span>

                    {[
                      { s: '0', label: lang === 'zh' ? '0低电平' : '0 Low' },
                      { s: '1', label: lang === 'zh' ? '1高电平' : '1 High' },
                      { s: '.', label: lang === 'zh' ? '·保持' : '· Hold' },
                      { s: 'p', label: lang === 'zh' ? 'p时钟' : 'p Clk' },
                      { s: 'n', label: lang === 'zh' ? 'n负钟' : 'n N-Clk' },
                      { s: '=', label: lang === 'zh' ? '=总线' : '= Bus' },
                      { s: 'x', label: lang === 'zh' ? 'x不定' : 'x Undef' },
                      { s: 'z', label: lang === 'zh' ? 'z高阻' : 'z Hi-Z' },
                      { s: '|', label: lang === 'zh' ? '|截断' : '| Gap' },
                    ].map((item) => (
                      <button
                        key={`global_brush_${item.s}`}
                        type="button"
                        onClick={() => setGlobalBrush(globalBrush === item.s ? null : item.s)}
                        className={`px-2 py-1 rounded-lg font-mono font-bold text-xs transition-all cursor-pointer flex items-center gap-1 border ${
                          globalBrush === item.s
                            ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400 shadow-xs scale-105'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                        title={lang === 'zh' ? `画笔模式 [${item.s}] - 开启后拖拽任意信号方块即可连续刷入` : `Brush [${item.s}] - Drag across cells to paint`}
                      >
                        <span>{item.s}</span>
                        <span className="text-[10px] font-normal hidden sm:inline">{item.label.slice(1)}</span>
                      </button>
                    ))}

                    {globalCopiedSymbol && (
                      <button
                        type="button"
                        onClick={() => setGlobalBrush(globalBrush === globalCopiedSymbol ? null : globalCopiedSymbol)}
                        className={`px-2 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                          globalBrush === globalCopiedSymbol
                            ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-400 shadow-xs'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                        }`}
                        title={lang === 'zh' ? `使用剪贴板状态 [${globalCopiedSymbol}] 作为画笔连续刷入` : `Use clipboard [${globalCopiedSymbol}] as continuous brush`}
                      >
                        <ClipboardPaste className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{lang === 'zh' ? `剪贴板[${globalCopiedSymbol}]` : `Clipboard[${globalCopiedSymbol}]`}</span>
                      </button>
                    )}
                  </div>

                  {globalBrush ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                        {t('active_label')} <strong>[{globalBrush}]</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setGlobalBrush(null)}
                        className="px-2 py-0.5 bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 text-[11px] rounded-md font-semibold cursor-pointer"
                      >
                        {t('exit_esc')}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 hidden md:inline">
                      {t('brush_hint')}
                    </span>
                  )}
                </div>
              )}

              {/* Category Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-xs">
                {/* Category navigation pills */}
                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                  <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap mr-0.5 select-none">
                    {t('category')}:
                  </span>

                  {/* 'All' button */}
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('all')}
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                      selectedCategoryFilter === 'all'
                        ? 'bg-blue-600 text-white shadow-2xs font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {t('category_all')} ({signals.filter((s) => !s.isSpacer).length})
                  </button>

                  {/* Built-in Categories */}
                  {SIGNAL_CATEGORIES.map((meta) => {
                    const count = signals.filter(
                      (s) => !s.isSpacer && (s.category || inferSignalCategory(s)) === meta.id
                    ).length;
                    const isSelected = selectedCategoryFilter === meta.id;

                    return (
                      <button
                        key={meta.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategoryFilter('all');
                          } else {
                            setSelectedCategoryFilter(meta.id);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 cursor-pointer transition-all border ${
                          isSelected
                            ? 'ring-2 ring-blue-500 font-bold shadow-2xs ' + (meta.badgeClass || meta.badgeCls)
                            : count > 0
                            ? 'opacity-90 hover:opacity-100 ' + (meta.badgeClass || meta.badgeCls)
                            : 'opacity-50 hover:opacity-90 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                        title={count > 0 ? (lang === 'zh' ? `筛选 ${meta.label || meta.name} 信号 (${count})` : `Filter ${meta.enName || meta.name} signals (${count})`) : (lang === 'zh' ? `暂无此分类信号` : `No signals in this category`)}
                      >
                        <span>{meta.icon}</span>
                        <span>{lang === 'en' && meta.enName ? meta.enName : (meta.label || meta.name)}</span>
                        <span className="text-[10px] font-mono opacity-80">({count})</span>
                      </button>
                    );
                  })}

                  {/* Custom Categories */}
                  {customCategories.map((cat) => {
                    const count = signals.filter((s) => !s.isSpacer && s.category === cat.id).length;
                    const isSelected = selectedCategoryFilter === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCategoryFilter('all');
                          } else {
                            setSelectedCategoryFilter(cat.id);
                          }
                        }}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 cursor-pointer transition-all border ${
                          isSelected
                            ? 'ring-2 ring-blue-500 font-bold shadow-2xs ' + cat.badgeCls
                            : count > 0
                            ? 'opacity-90 hover:opacity-100 ' + cat.badgeCls
                            : 'opacity-50 hover:opacity-90 border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                        }`}
                        title={count > 0 ? (lang === 'zh' ? `筛选 ${cat.name} 信号 (${count})` : `Filter ${cat.name} (${count})`) : (lang === 'zh' ? `暂无此分类信号` : `No signals in this category`)}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                        <span className="text-[10px] font-mono opacity-80">({count})</span>
                      </button>
                    );
                  })}

                  {/* +分类 紧跟在最后一个分类后面 (User Request: 信号时序矩阵里+分类这个要在最后一个分类后面) */}
                  <button
                    type="button"
                    onClick={() => setIsCustomCategoryModalOpen(true)}
                    className="px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer border border-dashed border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors flex items-center gap-0.5 shrink-0"
                    title={lang === 'zh' ? "自定义分类管理器：新建、编辑或删除信号分类" : "Custom Categories Manager"}
                  >
                    <span>+</span>
                    <span>{t('category')}</span>
                  </button>
                </div>

                {/* Reset category filter if filtered */}
                {selectedCategoryFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryFilter('all')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium shrink-0 ml-auto"
                  >
                    {t('reset_filter')}
                  </button>
                )}
              </div>

              {/* Dedicated Independent Row for Signal Direct Jump (User Request: 信号直达在上下布局和堆叠布局中都要另起一行，自适应换行展示) */}
              <div className="flex items-start gap-1.5 flex-wrap pt-1.5 border-t border-slate-100/90 dark:border-slate-800/80 text-xs">
                <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap pt-0.5 select-none flex items-center gap-1 shrink-0">
                  <Tag className="w-3.5 h-3.5 text-blue-500" />
                  <span>{t('signal_direct_jump')}:</span>
                </span>

                <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                  {signals
                    .filter((s) => !s.isSpacer)
                    .filter((s) => selectedCategoryFilter === 'all' || (s.category || inferSignalCategory(s)) === selectedCategoryFilter)
                    .map((s) => (
                      <button
                        key={`jump_${s.id}`}
                        type="button"
                        onClick={() => handleQuickJumpToSignal(s.id)}
                        className={`px-2 py-0.5 rounded-md text-xs font-mono cursor-pointer border transition-all ${
                          focusedSignalId === s.id
                            ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-2xs scale-105'
                            : 'bg-white hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
                        }`}
                        title={`点击定位并展开信号 ${s.name}`}
                      >
                        {s.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* List of Signal Rows with Visual Grouping Brackets (Compact Gap) */}
            <div className="flex flex-col gap-1.5">
              {signalListGroups.map((groupItem, gIdx) => {
                if (groupItem.type === 'standalone') {
                  const { signal: sig, originalIndex } = groupItem;
                  return (
                    <SignalRow
                      key={sig.id}
                      signal={sig}
                      index={originalIndex}
                      totalSignals={signals.length}
                      totalCycles={totalCycles}
                      density={cellDensity}
                      isCollapsed={collapsedSignals[sig.id] ?? true}
                      onToggleCollapse={(val) => handleToggleSignalCollapse(sig.id, val)}
                      foldedRanges={foldedRanges}
                      onUnfoldRange={(s, e) => {
                        setFoldedRanges((prev) => prev.filter((r) => !(r.start === s && r.end === e)));
                      }}
                      availableGroups={allGroupNames}
                      activeTool={activeTool}
                      isFocused={focusedSignalId === sig.id}
                      isProMode={isProMode}
                      globalBrush={globalBrush}
                      onSetGlobalBrush={setGlobalBrush}
                      globalCopiedSymbol={globalCopiedSymbol}
                      onCopySymbol={setGlobalCopiedSymbol}
                      customCategories={customCategories}
                      onOpenCustomCategoryModal={() => setIsCustomCategoryModalOpen(true)}
                      hoveredCycle={hoveredCycle}
                      lockedCycle={lockedCycle}
                      onHoverCycle={setHoveredCycle}
                      onLockCycle={setLockedCycle}
                      onAddPipelineTapSignal={() => handleAddPipelineTapSignal(sig.id)}
                      draggable={true}
                      isDragging={draggingSignalIndex === originalIndex}
                      isDragOver={dragOverSignalIndex === originalIndex && draggingSignalIndex !== originalIndex}
                      onDragStart={handleSignalDragStart}
                      onDragOver={handleSignalDragOver}
                      onDragLeave={handleSignalDragLeave}
                      onDrop={handleSignalDrop}
                      onDragEnd={handleSignalDragEnd}
                      onChange={(updated) => handleUpdateSignal(originalIndex, updated)}
                      onMoveUp={() => handleMoveSignal(originalIndex, originalIndex - 1)}
                      onMoveDown={() => handleMoveSignal(originalIndex, originalIndex + 1)}
                      onMoveToTop={() => handleMoveSignalToTop(originalIndex)}
                      onMoveToBottom={() => handleMoveSignalToBottom(originalIndex)}
                      onInsertBelow={() => handleAddSignalBelow(originalIndex)}
                      onDuplicate={() => handleDuplicateSignal(originalIndex)}
                      onDelete={() => handleDeleteSignal(originalIndex)}
                    />
                  );
                }

                // Group item with visual bracket on the left (User Request: 可以在波形左边一个括号包住多组信号，然后一个分组名字)
                const lastItemIndex = groupItem.items[groupItem.items.length - 1].originalIndex;
                return (
                  <div
                    key={`group_block_${groupItem.groupName}_${gIdx}`}
                    className="relative pl-6 sm:pl-8 py-1.5 my-1 rounded-xl bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100/60 dark:border-blue-900/30"
                  >
                    {/* Left Enclosing Bracket for this Group */}
                    <div className="absolute left-1.5 top-2 bottom-2 w-3 sm:w-4 flex flex-col items-start justify-between select-none pointer-events-none">
                      <div className="w-full h-3 border-l-2 border-t-2 border-blue-500 dark:border-blue-400 rounded-tl-md" />
                      <div className="my-auto py-1 pointer-events-auto">
                        <div
                          className="flex items-center gap-1 px-1 py-1.5 rounded bg-blue-100 dark:bg-blue-900/90 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200 text-[10px] font-bold shadow-xs whitespace-nowrap [writing-mode:vertical-lr] rotate-180"
                          title={`信号分组 [${groupItem.groupName}] - 波形左侧将以括弧包裹`}
                        >
                          <span>{groupItem.groupName}</span>
                        </div>
                      </div>
                      <div className="w-full h-3 border-l-2 border-b-2 border-blue-500 dark:border-blue-400 rounded-bl-md" />
                    </div>

                    {/* Group Header Bar */}
                    <div className="flex items-center justify-between px-2.5 py-1 mb-2 bg-blue-50/80 dark:bg-blue-950/60 rounded-lg border border-blue-200/80 dark:border-blue-800/60 text-xs">
                      <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200">
                        <Folder className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{groupItem.groupName}</span>
                        <span className="text-[11px] text-blue-600/80 dark:text-blue-400 font-normal">
                          ({groupItem.items.length} 个信号 · 波形左侧已生成括弧)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAddSignalInGroup(groupItem.groupName, lastItemIndex)}
                          className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-slate-800 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 cursor-pointer font-medium"
                        >
                          + 组内加信号
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUngroupAll(groupItem.groupName)}
                          className="px-2 py-0.5 rounded text-[11px] bg-white dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 cursor-pointer"
                          title="解散此分组（所有信号变为独立信号）"
                        >
                          解散分组
                        </button>
                      </div>
                    </div>

                    {/* Group Rows (Compact Gap) */}
                    <div className="flex flex-col gap-1.5">
                      {groupItem.items.map(({ signal: sig, originalIndex }) => (
                        <SignalRow
                          key={sig.id}
                          signal={sig}
                          index={originalIndex}
                          totalSignals={signals.length}
                          totalCycles={totalCycles}
                          density={cellDensity}
                          isCollapsed={collapsedSignals[sig.id] ?? true}
                          onToggleCollapse={(val) => handleToggleSignalCollapse(sig.id, val)}
                          foldedRanges={foldedRanges}
                          onUnfoldRange={(s, e) => {
                            setFoldedRanges((prev) => prev.filter((r) => !(r.start === s && r.end === e)));
                          }}
                          availableGroups={allGroupNames}
                          activeTool={activeTool}
                          isFocused={focusedSignalId === sig.id}
                          isProMode={isProMode}
                          globalBrush={globalBrush}
                          onSetGlobalBrush={setGlobalBrush}
                          globalCopiedSymbol={globalCopiedSymbol}
                          onCopySymbol={setGlobalCopiedSymbol}
                          customCategories={customCategories}
                          onOpenCustomCategoryModal={() => setIsCustomCategoryModalOpen(true)}
                          hoveredCycle={hoveredCycle}
                          lockedCycle={lockedCycle}
                          onHoverCycle={setHoveredCycle}
                          onLockCycle={setLockedCycle}
                          onAddPipelineTapSignal={() => handleAddPipelineTapSignal(sig.id)}
                          draggable={true}
                          isDragging={draggingSignalIndex === originalIndex}
                          isDragOver={dragOverSignalIndex === originalIndex && draggingSignalIndex !== originalIndex}
                          onDragStart={handleSignalDragStart}
                          onDragOver={handleSignalDragOver}
                          onDragLeave={handleSignalDragLeave}
                          onDrop={handleSignalDrop}
                          onDragEnd={handleSignalDragEnd}
                          onChange={(updated) => handleUpdateSignal(originalIndex, updated)}
                          onMoveUp={() => handleMoveSignal(originalIndex, originalIndex - 1)}
                          onMoveDown={() => handleMoveSignal(originalIndex, originalIndex + 1)}
                          onMoveToTop={() => handleMoveSignalToTop(originalIndex)}
                          onMoveToBottom={() => handleMoveSignalToBottom(originalIndex)}
                          onInsertBelow={() => handleAddSignalBelow(originalIndex)}
                          onDuplicate={() => handleDuplicateSignal(originalIndex)}
                          onDelete={() => handleDeleteSignal(originalIndex)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredSignals.length === 0 && (
                <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-3">
                  <p className="text-sm text-slate-500">
                    {signalSearchQuery
                      ? `未匹配到包含 "${signalSearchQuery}" 的信号`
                      : selectedCategoryFilter !== 'all'
                      ? `当前没有【${getCategoryMeta(selectedCategoryFilter as SignalCategory, customCategories)?.name || selectedCategoryFilter}】分类的信号`
                      : '当前没有配置任何信号'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    {signalSearchQuery ? (
                      <button
                        onClick={() => setSignalSearchQuery('')}
                        className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs cursor-pointer"
                      >
                        清空搜索
                      </button>
                    ) : selectedCategoryFilter !== 'all' ? (
                      <>
                        <button
                          onClick={() => handleAddCategorySignal(selectedCategoryFilter as SignalCategory)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                        >
                          + 一键创建【{getCategoryMeta(selectedCategoryFilter as SignalCategory)?.label || selectedCategoryFilter}】信号
                        </button>
                        <button
                          onClick={() => setSelectedCategoryFilter('all')}
                          className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-xs cursor-pointer font-medium"
                        >
                          查看全部信号
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleAddSignalToTop}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium cursor-pointer"
                      >
                        立即添加信号
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Edge / Arrow Annotations Editor (Shown here if left_bottom or stacked layout) */}
            {(edgeEditorPosition === 'left_bottom' || layoutMode === 'stacked') && (
              <section>
                <EdgeEditor
                  edges={edges}
                  signals={signals}
                  totalCycles={totalCycles}
                  onChange={setEdges}
                  onUpdateSignalNode={handleUpdateSignalNode}
                  onAddPipelineTapSignal={handleAddPipelineTapSignal}
                  onOpenTextGuide={() => {
                    setHelpGuideInitialTab('textGuide');
                    setIsHelpAndGuideModalOpen(true);
                  }}
                  onOpenSetupHoldModal={() => setIsSetupHoldModalOpen(true)}
                  position={edgeEditorPosition}
                  onChangePosition={handleEdgeEditorPositionChange}
                />
              </section>
            )}
          </div>

          {/* Middle Resizable Splitter Bar (User Request: 中间可以调节占界面右半边多少的比例) */}
          {layoutMode === 'split' && (
            <div
              onMouseDown={handleSplitterMouseDown}
              onDoubleClick={handleResetSplitter}
              className="hidden lg:flex w-3.5 mx-0 self-stretch shrink-0 flex-col items-center justify-center cursor-col-resize z-20 group relative select-none"
              title="按住鼠标左右拖拽调节波形右侧占比 (双击复位 50%)"
            >
              {/* Divider track line */}
              <div
                className={`w-1 h-full rounded-full transition-colors ${
                  isDraggingSplitter
                    ? 'bg-blue-600 ring-4 ring-blue-400/30'
                    : 'bg-slate-200 dark:bg-slate-800 group-hover:bg-blue-500'
                }`}
              />

              {/* Centered Drag Handle Grip */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-6 h-10 rounded-md border flex items-center justify-center shadow-xs transition-all ${
                  isDraggingSplitter
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-400 group-hover:text-blue-600 border-slate-300 dark:border-slate-700 group-hover:border-blue-400'
                }`}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              {/* Ratio indicator tooltip bubble */}
              <div
                className={`absolute top-4 px-2 py-1 bg-slate-900/90 text-white text-[10px] font-mono rounded-md shadow-md whitespace-nowrap pointer-events-none transition-opacity z-30 ${
                  isDraggingSplitter
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                右侧 {Math.round(rightPanePercent)}%
              </div>
            </div>
          )}

          {/* Right Column: Rock-solid Real-time WaveDrom Preview (Independent scrolling) */}
          {layoutMode === 'split' && (
            <div
              className="flex flex-col gap-2 shrink-0 min-w-0 w-full lg:w-auto h-full min-h-0 flex-1 overflow-hidden pb-1"
              style={{
                width: `${rightPanePercent}%`,
                maxWidth: `${rightPanePercent}%`,
              }}
            >
              <div className="flex-1 min-h-0 overflow-hidden">
                <WaveformPreview
                  waveJson={currentWaveJson}
                  skin={config.skin || 'default'}
                  isPinned={isPinned}
                  onTogglePin={() => setIsPinned(!isPinned)}
                  isCompact={isCompactPreview}
                  onToggleCompact={() => setIsCompactPreview(!isCompactPreview)}
                  onSkinChange={(newSkin) => setConfig((prev) => ({ ...prev, skin: newSkin }))}
                  onOpenHeadFootConfig={() => setIsHeadFootConfigModalOpen(true)}
                  onOpenFontModal={() => setIsWaveformFontModalOpen(true)}
                  autoFitTrigger={autoFitTrigger}
                  hoveredCycle={hoveredCycle}
                  onHoverCycleChange={setHoveredCycle}
                  lockedCycle={lockedCycle}
                  onLockCycleChange={setLockedCycle}
                  totalCycles={totalCycles}
                  fillHeight={true}
                  layoutMode="split"
                  onToggleLayoutMode={() => {
                    setLayoutMode('stacked');
                    try {
                      localStorage.setItem('wavedrom_layout_mode', 'stacked');
                    } catch {}
                    setAutoFitTrigger((prev) => prev + 1);
                  }}
                  splitRatio={rightPanePercent}
                  onSetSplitRatio={handleSetRatioPreset}
                />
              </div>

              {/* Edge / Arrow Annotations Editor at bottom of right column */}
              {edgeEditorPosition === 'right_bottom' && (
                <div className="shrink-0 pt-0.5 max-h-[42%] overflow-y-auto">
                  <EdgeEditor
                    edges={edges}
                    signals={signals}
                    totalCycles={totalCycles}
                    onChange={setEdges}
                    onUpdateSignalNode={handleUpdateSignalNode}
                    onAddPipelineTapSignal={handleAddPipelineTapSignal}
                    onOpenTextGuide={() => {
                      setHelpGuideInitialTab('textGuide');
                      setIsHelpAndGuideModalOpen(true);
                    }}
                    onOpenSetupHoldModal={() => setIsSetupHoldModalOpen(true)}
                    position={edgeEditorPosition}
                    onChangePosition={handleEdgeEditorPositionChange}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Period Ruler & Global Configuration Modal (User Request: 把周期标尺与全局配置改到工具栏上做一个按钮) */}
      <HeadFootConfigModal
        isOpen={isHeadFootConfigModalOpen}
        onClose={() => setIsHeadFootConfigModalOpen(false)}
        head={head}
        foot={foot}
        config={config}
        onHeadChange={setHead}
        onFootChange={setFoot}
        onConfigChange={setConfig}
        onOpenClockDomainModal={() => {
          setIsHeadFootConfigModalOpen(false);
          setIsClockDomainModalOpen(true);
        }}
      />

      {/* Waveform Typography & Title/Footer Notes Modal (User Request: 把右侧波形里的标尺里的图表标题与页脚备注拿出来和字体配置合并成一个工具按钮并重新命名) */}
      <WaveformTypographyModal
        isOpen={isWaveformFontModalOpen}
        onClose={() => setIsWaveformFontModalOpen(false)}
        head={head}
        foot={foot}
        onHeadChange={setHead}
        onFootChange={setFoot}
        fontConfig={config.fontConfig || DEFAULT_FONT_CONFIG}
        onFontConfigChange={(newFontConfig) => {
          setConfig((prev) => ({
            ...prev,
            fontConfig: newFontConfig,
          }));
          setAutoFitTrigger((p) => p + 1);
        }}
      />

      {/* Multi-Clock Domain Generator Modal (Supports 1GHz and 800MHz non-integer ratios and dynamic cycles) */}
      <ClockDomainModal
        isOpen={isClockDomainModalOpen}
        onClose={() => setIsClockDomainModalOpen(false)}
        onApply={handleApplyClockDomain}
        currentTotalCycles={totalCycles}
      />

      {/* Consolidated Help, WaveDrom Symbols & Text Guide Modal */}
      <HelpAndGuideModal
        isOpen={isHelpAndGuideModalOpen}
        onClose={() => setIsHelpAndGuideModalOpen(false)}
        initialTab={helpGuideInitialTab}
        onAddPhaseTrack={handleAddPhaseTrack}
        onAddSampleEdge={handleAddSampleAnnotatedEdge}
      />

      {/* Setup & Hold Timing Window Generator Modal */}
      <SetupHoldModal
        isOpen={isSetupHoldModalOpen}
        onClose={() => setIsSetupHoldModalOpen(false)}
        onApply={handleApplySetupHold}
      />

      {/* Protocol Template Library & Custom Presets Manager Modal */}
      <TemplateLibraryModal
        isOpen={isTemplateLibraryOpen}
        onClose={() => setIsTemplateLibraryOpen(false)}
        onLoadTemplate={handleSelectTemplate}
        currentDesign={{
          signals,
          edges,
          head,
          foot,
          config,
          totalCycles,
        }}
      />

      {/* Custom Signal Category Manager Modal */}
      <CustomCategoryModal
        isOpen={isCustomCategoryModalOpen}
        onClose={() => setIsCustomCategoryModalOpen(false)}
        customCategories={customCategories}
        onSave={handleSaveCustomCategories}
      />

      {/* Consolidated Project & Code Center Modal (Save/Load .wavedrom / .json & Dual-direction code sync & Snapshots) */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        currentDesign={{
          signals,
          edges,
          head,
          foot,
          config,
          totalCycles,
        }}
        currentWaveJson={currentWaveJson}
        onLoadProject={handleLoadProject}
        onImportWaveJson={handleImportWaveJson}
        onNewProject={() => {
          setIsProjectModalOpen(false);
          setIsNewProjectModalOpen(true);
        }}
        snapshots={snapshots}
        onRestoreSnapshot={handleRestoreSnapshot}
        onClearSnapshots={handleClearSnapshots}
        projectName={projectName}
        onUpdateProjectName={handleUpdateProjectName}
      />

      {/* New Project Creator & Template Modal (User Request: 完善新建工程等功能) */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onCreateProject={handleCreateNewProject}
        currentProjectName={projectName}
      />

      {/* Create Signal Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">新建信号分组 (Signal Group)</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setNewGroupNameInput('');
                  setSelectedSignalIdsForGroup([]);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                分组名称 (将在波形图左侧以大括号展示):
              </label>
              <input
                type="text"
                placeholder="如 SPI总线、控制信号、PCIe_Lane0"
                value={newGroupNameInput}
                onChange={(e) => setNewGroupNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGroupNameInput.trim()) {
                    handleCreateGroupWithSignals();
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  勾选加入此分组的信号:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const validSignals = signals.filter((s) => !s.isSpacer);
                    if (selectedSignalIdsForGroup.length === validSignals.length) {
                      setSelectedSignalIdsForGroup([]);
                    } else {
                      setSelectedSignalIdsForGroup(validSignals.map((s) => s.id));
                    }
                  }}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
                >
                  {selectedSignalIdsForGroup.length === signals.filter((s) => !s.isSpacer).length ? '全不选' : '全选'}
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto flex flex-col gap-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                {signals.filter((s) => !s.isSpacer).map((s) => {
                  const isChecked = selectedSignalIdsForGroup.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white dark:hover:bg-slate-700/60 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSignalIdsForGroup((prev) => [...prev, s.id]);
                            } else {
                              setSelectedSignalIdsForGroup((prev) => prev.filter((id) => id !== s.id));
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{s.name}</span>
                      </div>
                      {s.group && (
                        <span className="text-[10px] text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                          当前: {s.group}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowCreateGroupModal(false);
                  setNewGroupNameInput('');
                  setSelectedSignalIdsForGroup([]);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!newGroupNameInput.trim()}
                onClick={handleCreateGroupWithSignals}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold cursor-pointer transition-colors"
              >
                确认创建并分组
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Waveform Confirmation Modal (User Request: 修复顶部工具栏重置逻辑，点击了没反应) */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-5 flex flex-col gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {lang === 'zh' ? '确认重置波形？' : 'Reset Waveform?'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'zh'
                    ? '重置将清空当前所有信号与配置，并恢复为默认的基础 SPI 模板。未保存的修改将会丢失。'
                    : 'This will reset all signals and configuration to the default SPI template. Unsaved changes will be lost.'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeResetToDefault}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
              >
                {lang === 'zh' ? '确认重置' : 'Reset Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Confirmation Modal */}
      {isNewProjectConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-sm p-5 flex flex-col gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {lang === 'zh' ? '确认新建工程？' : 'Create New Project?'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'zh'
                    ? '新建工程将初始化一个全新的波形画板。请确保当前工程已保存或导出。'
                    : 'Creating a new project will initialize a blank waveform canvas. Make sure current work is saved.'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsNewProjectConfirmOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeNewProject}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
              >
                {lang === 'zh' ? '确认新建' : 'Create New'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
