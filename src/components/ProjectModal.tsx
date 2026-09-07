import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  FolderOpen,
  History,
  FilePlus,
  Download,
  Upload,
  Check,
  Clock,
  Trash2,
  Copy,
  FileCode,
  AlertCircle,
  Sparkles,
  Pencil,
  Bookmark,
  CheckCircle2,
  FileText,
  RefreshCw,
  PlusCircle,
} from 'lucide-react';
import { SignalItem, EdgeAnnotation, HeadFootConfig, DiagramConfig, WaveJson, ProtocolTemplate } from '../types';
import { parseWaveJson } from '../lib/waveParser';
import { useI18n } from '../lib/i18n';

export interface ProjectSnapshot {
  id: string;
  timestamp: number;
  label: string;
  totalCycles: number;
  signalsCount: number;
  data: {
    signals: SignalItem[];
    edges: EdgeAnnotation[];
    head: HeadFootConfig;
    foot: HeadFootConfig;
    config: DiagramConfig;
    totalCycles: number;
  };
}

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDesign: {
    signals: SignalItem[];
    edges: EdgeAnnotation[];
    head: HeadFootConfig;
    foot: HeadFootConfig;
    config: DiagramConfig;
    totalCycles: number;
  };
  currentWaveJson: WaveJson;
  onLoadProject: (projectData: {
    signals: SignalItem[];
    edges: EdgeAnnotation[];
    head: HeadFootConfig;
    foot: HeadFootConfig;
    config: DiagramConfig;
    totalCycles: number;
  }) => void;
  onImportWaveJson: (imported: {
    signals: SignalItem[];
    edges: EdgeAnnotation[];
    head: HeadFootConfig;
    foot: HeadFootConfig;
    config: DiagramConfig;
  }) => void;
  onNewProject: () => void;
  snapshots: ProjectSnapshot[];
  onRestoreSnapshot: (snapshot: ProjectSnapshot) => void;
  onClearSnapshots: () => void;
  onCreateSnapshot?: (label?: string) => void;
  onDeleteSnapshot?: (id: string) => void;
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  initialTab?: 'project' | 'code' | 'history';
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  currentDesign,
  currentWaveJson,
  onLoadProject,
  onImportWaveJson,
  onNewProject,
  snapshots,
  onRestoreSnapshot,
  onClearSnapshots,
  onCreateSnapshot,
  onDeleteSnapshot,
  projectName,
  onUpdateProjectName,
  initialTab = 'project',
}) => {
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState<'project' | 'code' | 'history'>(initialTab);
  const [copiedProject, setCopiedProject] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [nameInput, setNameInput] = useState(projectName || (lang === 'zh' ? '我的波形工程' : 'My_Timing_Project'));
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [nameSavedFeedback, setNameSavedFeedback] = useState(false);
  const [jsonCodeText, setJsonCodeText] = useState('');
  const [codeParseError, setCodeParseError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Snapshot input
  const [manualSnapshotLabel, setManualSnapshotLabel] = useState('');
  const [snapshotSuccessNotice, setSnapshotSuccessNotice] = useState<string | null>(null);

  // Custom Preset Template saving
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<'Basic' | 'Bus' | 'Serial' | 'Memory' | 'Clock' | 'Control' | 'Timing' | 'Custom'>('Custom');
  const [templateDesc, setTemplateDesc] = useState('');
  const [saveTemplateNotice, setSaveTemplateNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNameInput(projectName || (lang === 'zh' ? '我的波形工程' : 'My_Timing_Project'));
      setJsonCodeText(JSON.stringify(currentWaveJson, null, 2));
      setCodeParseError(null);
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, projectName, currentWaveJson, initialTab, lang]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCommitProjectName = () => {
    const trimmed = nameInput.trim() || 'MyTimingDiagram';
    setNameInput(trimmed);
    onUpdateProjectName(trimmed);
    setIsNameEditing(false);
    setNameSavedFeedback(true);
    setTimeout(() => setNameSavedFeedback(false), 1500);
  };

  // Export .wavedrom Project File
  const handleExportProjectFile = () => {
    const finalName = nameInput.trim() || 'WaveDrom_Project';
    onUpdateProjectName(finalName);

    const projectPayload = {
      format: 'WaveDrom_Project',
      version: '3.8',
      projectName: finalName,
      savedAt: new Date().toISOString(),
      totalCycles: currentDesign.totalCycles,
      signals: currentDesign.signals,
      edges: currentDesign.edges,
      head: currentDesign.head,
      foot: currentDesign.foot,
      config: currentDesign.config,
    };

    const jsonStr = JSON.stringify(projectPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${finalName.replace(/\s+/g, '_')}.wavedrom`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export WaveJSON .json file
  const handleDownloadWaveJsonFile = () => {
    const finalName = nameInput.trim() || 'wave';
    const blob = new Blob([JSON.stringify(currentWaveJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${finalName.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Process text for import
  const processImportText = (text: string) => {
    try {
      const parsed = JSON.parse(text);

      // Case 1: Full WaveDrom project file (.wavedrom)
      if (parsed.signals && Array.isArray(parsed.signals)) {
        if (parsed.projectName) {
          onUpdateProjectName(parsed.projectName);
        }
        onLoadProject({
          signals: parsed.signals,
          edges: parsed.edges || [],
          head: parsed.head || {},
          foot: parsed.foot || {},
          config: parsed.config || { hscale: 1, skin: 'default' },
          totalCycles: parsed.totalCycles || 16,
        });
        onClose();
      }
      // Case 2: Native WaveJSON object file (.json) with 'signal' array
      else if (parsed.signal && Array.isArray(parsed.signal)) {
        const result = parseWaveJson(text);
        if (result.error) {
          alert((lang === 'zh' ? 'WaveJSON 解析失败: ' : 'WaveJSON parse error: ') + result.error);
        } else {
          onImportWaveJson(result);
          onClose();
        }
      } else {
        alert(lang === 'zh' ? '文件格式不匹配：请选择 .wavedrom 工程文件或标准 WaveJSON 配置文件。' : 'Unsupported format: please select a .wavedrom project or WaveJSON file.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert((lang === 'zh' ? '文件加载或 JSON 解析失败: ' : 'File load / JSON parse error: ') + msg);
    }
  };

  // Smart File Import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processImportText(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Drag & drop file support
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processImportText(text);
    };
    reader.readAsText(file);
  };

  // Copy Project JSON
  const handleCopyProjectJson = () => {
    const projectPayload = {
      format: 'WaveDrom_Project',
      version: '3.8',
      projectName: nameInput.trim() || 'WaveDrom_Project',
      savedAt: new Date().toISOString(),
      totalCycles: currentDesign.totalCycles,
      signals: currentDesign.signals,
      edges: currentDesign.edges,
      head: currentDesign.head,
      foot: currentDesign.foot,
      config: currentDesign.config,
    };
    navigator.clipboard.writeText(JSON.stringify(projectPayload, null, 2));
    setCopiedProject(true);
    setTimeout(() => setCopiedProject(false), 2000);
  };

  // Save As Copy
  const handleSaveAsCopy = () => {
    const copyName = `${nameInput.trim() || 'Project'}_Copy`;
    setNameInput(copyName);
    onUpdateProjectName(copyName);
    if (onCreateSnapshot) {
      onCreateSnapshot(lang === 'zh' ? `工程副本 (${copyName})` : `Project Copy (${copyName})`);
    }
    setSnapshotSuccessNotice(lang === 'zh' ? `已生成副本「${copyName}」并保存快照` : `Created copy "${copyName}"`);
    setTimeout(() => setSnapshotSuccessNotice(null), 2500);
  };

  // Save As Preset Template
  const handleSaveAsPresetTemplate = () => {
    const finalName = nameInput.trim() || (lang === 'zh' ? '自定义预设模板' : 'Custom_Preset_Template');
    const newTpl: ProtocolTemplate = {
      id: `custom_${Date.now()}`,
      name: finalName,
      category: templateCategory,
      description: templateDesc.trim() || (lang === 'zh' ? `基于工程「${finalName}」保存的自定义协议模板` : `Template based on ${finalName}`),
      signals: JSON.parse(JSON.stringify(currentDesign.signals)),
      edges: JSON.parse(JSON.stringify(currentDesign.edges)),
      head: JSON.parse(JSON.stringify(currentDesign.head)),
      foot: JSON.parse(JSON.stringify(currentDesign.foot)),
      config: JSON.parse(JSON.stringify(currentDesign.config)),
      totalCycles: currentDesign.totalCycles,
    };
    try {
      const existingRaw = localStorage.getItem('wavedrom_custom_templates_v1');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [newTpl, ...(Array.isArray(existing) ? existing : [])];
      localStorage.setItem('wavedrom_custom_templates_v1', JSON.stringify(updated));
      setSaveTemplateNotice(lang === 'zh' ? `已成功将「${finalName}」保存到模板库！` : `Saved "${finalName}" to templates!`);
      setTimeout(() => {
        setSaveTemplateNotice(null);
        setIsSavingTemplate(false);
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert((lang === 'zh' ? '保存预设模板失败: ' : 'Failed to save template: ') + msg);
    }
  };

  // Code Tab: Copy WaveJSON Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(jsonCodeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Code Tab: Format / Prettify
  const handlePrettifyCode = () => {
    try {
      const parsed = JSON.parse(jsonCodeText);
      setJsonCodeText(JSON.stringify(parsed, null, 2));
      setCodeParseError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCodeParseError(msg);
    }
  };

  // Code Tab: Apply Edited WaveJSON
  const handleApplyCodeImport = () => {
    const result = parseWaveJson(jsonCodeText);
    if (result.error) {
      setCodeParseError(result.error);
      return;
    }
    onImportWaveJson(result);
    onClose();
  };

  // Manual snapshot creation
  const handleManualCreateSnapshot = () => {
    const label = manualSnapshotLabel.trim() || (lang === 'zh' ? `版本快照 · ${nameInput}` : `Snapshot · ${nameInput}`);
    if (onCreateSnapshot) {
      onCreateSnapshot(label);
      setManualSnapshotLabel('');
      setSnapshotSuccessNotice(lang === 'zh' ? '已成功创建快照点！' : 'Snapshot created successfully!');
      setTimeout(() => setSnapshotSuccessNotice(null), 2000);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diff < 30) return lang === 'zh' ? '刚刚' : 'just now';
    if (diff < 60) return lang === 'zh' ? `${diff} 秒前` : `${diff}s ago`;
    const min = Math.floor(diff / 60);
    if (min < 60) return lang === 'zh' ? `${min} 分钟前` : `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return lang === 'zh' ? `${hr} 小时前` : `${hr}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs cursor-pointer animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Modern Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {lang === 'zh' ? '工程管理中心' : 'Project Management'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  {currentDesign.signals.length} {lang === 'zh' ? '信号' : 'signals'} · {currentDesign.totalCycles} {lang === 'zh' ? '拍' : 'cycles'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {lang === 'zh'
                  ? '工程出入库归档、WaveJSON 原生代码同步与版本快照恢复'
                  : 'Project archive export, WaveJSON code synchronization and version snapshots'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('project')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
              activeTab === 'project'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '工程与归档 (.wavedrom)' : 'Project & Archive'}</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
              activeTab === 'code'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-500" />
            <span>{lang === 'zh' ? 'WaveJSON 代码' : 'WaveJSON Code'}</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-500" />
            <span>{lang === 'zh' ? '历史快照' : 'Snapshots'}</span>
            {snapshots.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded-full text-[10px] font-bold">
                {snapshots.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Project & Archive */}
        {activeTab === 'project' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Project Meta Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-500" />
                  {lang === 'zh' ? '当前工程基础信息' : 'Current Project Details'}
                </span>
                <div className="flex items-center gap-2">
                  {nameSavedFeedback && (
                    <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="w-3 h-3" />
                      {lang === 'zh' ? '工程名已保存' : 'Name updated'}
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 font-mono">
                    {lang === 'zh' ? `包含 ${currentDesign.edges.length} 个关联箭头` : `${currentDesign.edges.length} edge arrows`}
                  </span>
                </div>
              </div>

              {/* Editable Project Name */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommitProjectName();
                    }}
                    onBlur={handleCommitProjectName}
                    placeholder={lang === 'zh' ? '请输入波形设计工程名' : 'Enter project name'}
                    className="w-full pl-8 pr-16 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                  <Pencil className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <button
                    type="button"
                    onClick={handleCommitProjectName}
                    className="absolute right-1.5 top-1.5 px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                  >
                    {lang === 'zh' ? '保存' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Export Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {/* Export .wavedrom */}
                <button
                  type="button"
                  onClick={handleExportProjectFile}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-xs cursor-pointer group"
                  title={lang === 'zh' ? '导出完整工程包，包含所有波形、文字、边沿箭头与配置' : 'Download complete project'}
                >
                  <div className="flex items-center gap-1.5">
                    <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                    <span className="text-xs font-bold">{lang === 'zh' ? '导出工程 (.wavedrom)' : 'Export (.wavedrom)'}</span>
                  </div>
                  <span className="text-[10px] opacity-80">{lang === 'zh' ? '可随时再次导入还原' : 'Full diagram schema'}</span>
                </button>

                {/* Copy Project JSON */}
                <button
                  type="button"
                  onClick={handleCopyProjectJson}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-blue-400 text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5">
                    {copiedProject ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />}
                    <span className="text-xs font-bold">{copiedProject ? (lang === 'zh' ? '已复制到剪贴板' : 'Copied!') : (lang === 'zh' ? '复制工程 JSON' : 'Copy Project JSON')}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{lang === 'zh' ? '直接粘贴发送给协作者' : 'Shareable JSON object'}</span>
                </button>

                {/* Export WaveJSON (.json) */}
                <button
                  type="button"
                  onClick={handleDownloadWaveJsonFile}
                  className="flex flex-col items-center justify-center gap-1 p-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-emerald-400 text-slate-700 dark:text-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-emerald-600 group-hover:-translate-y-0.5 transition-transform" />
                    <span className="text-xs font-bold">{lang === 'zh' ? '导出 WaveJSON (.json)' : 'Export WaveJSON (.json)'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{lang === 'zh' ? '适用于外部 WaveDrom 工具' : 'Compatible with WaveDrom'}</span>
                </button>
              </div>
            </div>

            {/* Import / Drag-Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingFile(true);
              }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer text-center ${
                isDraggingFile
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 scale-[1.01]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".wavedrom,.json"
                onChange={handleImportFile}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {lang === 'zh' ? '点击选择或将工程文件拖拽到此处打开' : 'Click to select or drop project file here'}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {lang === 'zh' ? '支持 .wavedrom 完整工程文件与标准 WaveJSON .json 描述' : 'Supports .wavedrom full project and standard WaveJSON .json'}
              </span>
            </div>

            {/* Save Current Project as Reusable Preset Template */}
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/20 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Bookmark className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {lang === 'zh' ? '存为预设模板库 (Save as Template)' : 'Save as Custom Template'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2 hidden sm:inline">
                      {lang === 'zh' ? '将当前波形结构存入模板库，随时一键复用' : 'Save current design into templates'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSavingTemplate(!isSavingTemplate)}
                  className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline cursor-pointer"
                >
                  {isSavingTemplate ? (lang === 'zh' ? '收起配置' : 'Collapse') : (lang === 'zh' ? '保存为模板 →' : 'Save to Templates →')}
                </button>
              </div>

              {saveTemplateNotice && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveTemplateNotice}</span>
                </div>
              )}

              {isSavingTemplate && (
                <div className="flex flex-col gap-2.5 pt-2 border-t border-purple-200 dark:border-purple-800/40 text-xs animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {lang === 'zh' ? '预设分类:' : 'Category:'}
                      </span>
                      <select
                        value={templateCategory}
                        onChange={(e) => setTemplateCategory(e.target.value as any)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium"
                      >
                        <option value="Basic">{lang === 'zh' ? '📁 基础与通用 (Basic)' : '📁 Basic'}</option>
                        <option value="Custom">{lang === 'zh' ? '⭐ 我的预设 (Custom)' : '⭐ Custom'}</option>
                        <option value="Timing">{lang === 'zh' ? '⏱️ 时序与建立保持 (Timing)' : '⏱️ Timing & Setup/Hold'}</option>
                        <option value="Serial">{lang === 'zh' ? '📡 串行通信 (SPI/I2C/UART)' : '📡 Serial'}</option>
                        <option value="Bus">{lang === 'zh' ? '🚌 系统总线 (AXI/AHB)' : '🚌 System Bus'}</option>
                        <option value="Memory">{lang === 'zh' ? '💾 存储器与高速 (DDR/SRAM)' : '💾 Memory'}</option>
                        <option value="Clock">{lang === 'zh' ? '⚡ 时钟与控制 (Clock/Reset)' : '⚡ Clock & Reset'}</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {lang === 'zh' ? '预设描述说明:' : 'Description:'}
                      </span>
                      <input
                        type="text"
                        value={templateDesc}
                        onChange={(e) => setTemplateDesc(e.target.value)}
                        placeholder={lang === 'zh' ? '选填：如 双通道 SPI 流水线时序' : 'Optional description'}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsSavingTemplate(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {lang === 'zh' ? '取消' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveAsPresetTemplate}
                      className="flex items-center gap-1 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{lang === 'zh' ? '确认存入模板库' : 'Save to Templates'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100/70 dark:bg-slate-800/40 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveAsCopy}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-medium cursor-pointer shadow-2xs"
                  title={lang === 'zh' ? '以当前工程为底稿，建立新副本' : 'Create a duplicate project'}
                >
                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                  <span>{lang === 'zh' ? '另存为新副本工程' : 'Save As Copy'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  onNewProject();
                  onClose();
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-lg font-medium cursor-pointer"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>{lang === 'zh' ? '新建空白工程' : 'New Blank Project'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: WaveJSON Code (Bidirectional) */}
        {activeTab === 'code' && (
          <div className="flex-1 overflow-hidden flex flex-col p-4">
            {codeParseError && (
              <div className="flex items-center gap-2 px-4 py-2 mb-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-lg animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lang === 'zh' ? '代码解析错误: ' : 'Parse error: '}{codeParseError}</span>
              </div>
            )}

            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
              <span>
                {lang === 'zh'
                  ? '在下方可直接复制 WaveDrom 原生代码，或粘贴外部 WaveJSON 点击“导入并同步”立即反向生成画布:'
                  : 'Copy native WaveDrom code, or edit and click "Import & Sync":'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrettifyCode}
                  className="px-2 py-0.5 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 cursor-pointer font-medium"
                >
                  {lang === 'zh' ? '格式化 Prettify' : 'Prettify'}
                </button>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                  WaveJSON 3.0
                </span>
              </div>
            </div>

            <div className="flex-1 min-h-[320px] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-inner">
              <textarea
                value={jsonCodeText}
                onChange={(e) => {
                  setJsonCodeText(e.target.value);
                  setCodeParseError(null);
                }}
                className="w-full flex-1 p-3 font-mono text-xs leading-relaxed bg-slate-950 text-emerald-400 focus:outline-hidden resize-none selection:bg-blue-800"
                spellCheck={false}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? (lang === 'zh' ? '已复制代码' : 'Copied') : (lang === 'zh' ? '复制代码' : 'Copy Code')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadWaveJsonFile}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'zh' ? '下载 .json' : 'Download .json'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleApplyCodeImport}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
                  title={lang === 'zh' ? '解析并导入代码，同步到波形矩阵与可视化参数' : 'Parse and import code into waveform editor'}
                >
                  <Upload className="w-4 h-4" />
                  <span>{lang === 'zh' ? '导入代码并同步到画布' : 'Import & Sync'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Snapshots History */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Snapshot Creator Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={manualSnapshotLabel}
                  onChange={(e) => setManualSnapshotLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualCreateSnapshot();
                  }}
                  placeholder={lang === 'zh' ? `输入快照名称 (默认: 版本快照 · ${nameInput})` : 'Snapshot label'}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleManualCreateSnapshot}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-2xs"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '立即保存快照' : 'Capture Snapshot'}</span>
                </button>
              </div>

              {snapshots.length > 0 && (
                <button
                  type="button"
                  onClick={onClearSnapshots}
                  className="flex items-center justify-center gap-1 text-[11px] text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-2 py-1 rounded cursor-pointer self-end sm:self-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '清空全部快照' : 'Clear All'}</span>
                </button>
              )}
            </div>

            {snapshotSuccessNotice && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{snapshotSuccessNotice}</span>
              </div>
            )}

            {snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
                <History className="w-10 h-10 stroke-1 mb-2 text-slate-300 dark:text-slate-600" />
                <span>{lang === 'zh' ? '暂无历史快照，点击上方“立即保存快照”或在画布上修改后将自动记录' : 'No snapshots yet. Click Capture Snapshot to save your work.'}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {snapshots.map((snap) => {
                  const dateStr = new Date(snap.timestamp).toLocaleString();
                  const relTime = formatRelativeTime(snap.timestamp);
                  return (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {snap.label}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                              {lang === 'zh'
                                ? `${snap.signalsCount} 条信号 · ${snap.totalCycles} 拍`
                                : `${snap.signalsCount} signals · ${snap.totalCycles} cyc`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                              {relTime}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({dateStr})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onRestoreSnapshot(snap);
                            onClose();
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>{lang === 'zh' ? '还原此版本' : 'Restore'}</span>
                        </button>
                        {onDeleteSnapshot && (
                          <button
                            type="button"
                            onClick={() => onDeleteSnapshot(snap.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'zh' ? '删除此条快照' : 'Delete snapshot'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
