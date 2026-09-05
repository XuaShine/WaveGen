import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  FolderOpen,
  History,
  FilePlus,
  Download,
  Upload,
  Check,
  AlertTriangle,
  Clock,
  Trash2,
  Copy,
  FileCode,
  AlertCircle,
  Sparkles,
  Pencil,
  Bookmark,
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
  projectName,
  onUpdateProjectName,
  initialTab = 'project',
}) => {
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState<'project' | 'code' | 'history'>(initialTab);
  const [copiedProject, setCopiedProject] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [nameInput, setNameInput] = useState(projectName || (lang === 'zh' ? '我的波形工程' : 'My_Timing_Project'));
  const [jsonCodeText, setJsonCodeText] = useState('');
  const [codeParseError, setCodeParseError] = useState<string | null>(null);

  // Custom Preset Template saving
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<'Bus' | 'Serial' | 'Memory' | 'Clock' | 'Control' | 'Timing' | 'Custom'>('Custom');
  const [templateDesc, setTemplateDesc] = useState('');
  const [saveTemplateNotice, setSaveTemplateNotice] = useState<string | null>(null);

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
      setSaveTemplateNotice(lang === 'zh' ? `已成功将「${finalName}」保存到预设模板库！` : `Saved "${finalName}" to presets!`);
      setTimeout(() => {
        setSaveTemplateNotice(null);
        setIsSavingTemplate(false);
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert((lang === 'zh' ? '保存预设模板失败: ' : 'Failed to save template: ') + msg);
    }
  };

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

  // Handle Export .wavedrom Project File
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

  // Smart File Import: Supports both .wavedrom Project files AND native .json WaveJSON files!
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
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
    reader.readAsText(file);
    e.target.value = '';
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

  // Code Tab: Copy WaveJSON Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(jsonCodeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Code Tab: Download WaveJSON File
  const handleDownloadCodeJson = () => {
    const blob = new Blob([jsonCodeText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(nameInput || 'wave').replace(/\s+/g, '_')}_wavejson.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {lang === 'zh' ? '工程管理' : 'Project Management'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {lang === 'zh'
                  ? '工程归档导出、WaveJSON 代码双向同步与版本快照'
                  : 'Archive export, bidirectional WaveJSON sync, and version snapshots'}
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('project')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
              activeTab === 'project'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{lang === 'zh' ? '工程归档 (.wavedrom / .json)' : 'Archive (.wavedrom / .json)'}</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
              activeTab === 'code'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4 text-emerald-500" />
            <span>{lang === 'zh' ? 'WaveJSON 代码' : 'WaveJSON Code'}</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-amber-500" />
            <span>{lang === 'zh' ? '历史快照' : 'Snapshots'}</span>
            {snapshots.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded-full text-[10px] font-bold">
                {snapshots.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content 1: Project File (.wavedrom / .json) */}
        {activeTab === 'project' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Project Name and Export */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Save className="w-4 h-4 text-blue-500" />
                  {lang === 'zh' ? '工程名称与文件导出' : 'Project Name & Export'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {lang === 'zh'
                    ? `当前包含 ${currentDesign.signals.length} 条信号 · ${currentDesign.edges.length} 条关联关系`
                    : `${currentDesign.signals.length} signals · ${currentDesign.edges.length} arrows`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => {
                      setNameInput(e.target.value);
                      onUpdateProjectName(e.target.value);
                    }}
                    onBlur={() => {
                      const trimmed = nameInput.trim() || 'MyTimingDiagram';
                      setNameInput(trimmed);
                      onUpdateProjectName(trimmed);
                    }}
                    placeholder={lang === 'zh' ? '请输入波形设计工程名' : 'Enter project name'}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                  <Pencil className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                </div>
                <button
                  onClick={handleExportProjectFile}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs shrink-0 cursor-pointer"
                  title={lang === 'zh' ? '保存并下载完整的可复原 .wavedrom 工程文件' : 'Download full .wavedrom project file'}
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'zh' ? '导出工程 (.wavedrom)' : 'Export (.wavedrom)'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                {lang === 'zh'
                  ? '导出的 .wavedrom 包含所有信号、周期数、边缘箭头打标、时钟周期表头和排版配置，可随时重新导入继续编辑。'
                  : 'The exported .wavedrom file contains all signals, cycles, annotations, and configs for full recovery.'}
              </p>
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
                      {lang === 'zh' ? '保存为自定义预设模板' : 'Save as Custom Template'}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                      {lang === 'zh'
                        ? '将当前工程架构保存到预设库，日后新建工程可一键复用'
                        : 'Save current structure into template library for quick reuse'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSavingTemplate(!isSavingTemplate)}
                  className="text-xs text-purple-600 dark:text-purple-400 font-medium hover:underline cursor-pointer"
                >
                  {isSavingTemplate ? (lang === 'zh' ? '收起配置' : 'Collapse') : (lang === 'zh' ? '配置并保存 →' : 'Configure & Save →')}
                </button>
              </div>

              {saveTemplateNotice && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveTemplateNotice}</span>
                </div>
              )}

              {isSavingTemplate && (
                <div className="flex flex-col gap-2.5 pt-2 border-t border-purple-200 dark:border-purple-800/40 text-xs">
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
                        <option value="Custom">{lang === 'zh' ? '⭐ 自定义预设 (Custom)' : '⭐ Custom'}</option>
                        <option value="Timing">{lang === 'zh' ? '⏱️ 时序与建立保持 (Timing)' : '⏱️ Timing & Setup/Hold'}</option>
                        <option value="Serial">{lang === 'zh' ? '📡 串行通信 (SPI/I2C/UART)' : '📡 Serial (SPI/I2C/UART)'}</option>
                        <option value="Bus">{lang === 'zh' ? '🚌 系统与片上总线 (AXI/AHB)' : '🚌 System Bus (AXI/AHB)'}</option>
                        <option value="Memory">{lang === 'zh' ? '💾 存储器与高速 (DDR/SRAM)' : '💾 Memory (DDR/SRAM)'}</option>
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
                        placeholder={lang === 'zh' ? '选填：如 AXI-Stream 双通道流水线模板' : 'Optional: e.g. AXI-Stream pipeline'}
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
                      <span>{lang === 'zh' ? '确认保存到模板库' : 'Save to Templates'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Open / Import Local File */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Import Card with Drag/Click */}
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-blue-200 dark:border-blue-900/60 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl bg-blue-50/30 dark:bg-blue-950/20 transition-all cursor-pointer group text-center">
                <input
                  type="file"
                  accept=".wavedrom,.json"
                  onChange={handleImportFile}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                  {lang === 'zh' ? '打开本地工程或代码' : 'Open Local Project / Code'}
                </span>
                <span className="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-1">
                  {lang === 'zh' ? '支持 .wavedrom 工程文件与标准 .json 代码' : 'Supports .wavedrom and .json files'}
                </span>
              </label>

              {/* New Project Card */}
              <div
                onClick={() => {
                  onNewProject();
                  onClose();
                }}
                className="flex flex-col items-center justify-center p-6 border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700 rounded-xl bg-slate-50 dark:bg-slate-800/40 transition-all cursor-pointer group text-center"
              >
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <FilePlus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 transition-colors">
                  {lang === 'zh' ? '新建空白工程' : 'New Project'}
                </span>
                <span className="text-[10px] text-slate-500 mt-1">
                  {lang === 'zh' ? '重置当前画布，开启全新的波形设计' : 'Start a fresh timing diagram design'}
                </span>
              </div>
            </div>

            {/* Quick Copy Project Payload */}
            <div className="flex items-center justify-between p-3 bg-slate-100/70 dark:bg-slate-800/30 rounded-lg text-xs text-slate-600 dark:text-slate-400">
              <span className="text-[11px]">
                {lang === 'zh' ? '亦可直接复制工程 JSON 结构分享给团队成员:' : 'Share project JSON directly with teammates:'}
              </span>
              <button
                onClick={handleCopyProjectJson}
                className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer"
              >
                {copiedProject ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedProject ? (lang === 'zh' ? '已复制' : 'Copied') : (lang === 'zh' ? '复制工程 JSON' : 'Copy Project JSON')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab Content 2: WaveJSON Code (Bidirectional) */}
        {activeTab === 'code' && (
          <div className="flex-1 overflow-hidden flex flex-col p-4">
            {codeParseError && (
              <div className="flex items-center gap-2 px-4 py-2 mb-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{lang === 'zh' ? '代码解析错误: ' : 'Parse error: '}{codeParseError}</span>
              </div>
            )}

            <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 flex items-center justify-between">
              <span>
                {lang === 'zh'
                  ? '在下方可直接复制 WaveDrom 原生代码，或粘贴外部 WaveJSON 点击“导入并同步”立即反向生成波形参数:'
                  : 'Copy native WaveDrom code, or paste WaveJSON and click "Import & Sync":'}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">WaveJSON v3.8</span>
            </div>

            <div className="flex-1 min-h-[300px] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
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
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? (lang === 'zh' ? '已复制代码' : 'Copied') : (lang === 'zh' ? '复制 JSON 代码' : 'Copy Code')}</span>
                </button>
                <button
                  onClick={handleDownloadCodeJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'zh' ? '下载 .json' : 'Download .json'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
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

        {/* Tab Content 3: Snapshots History */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {lang === 'zh' ? '本地自动保存历史快照记录' : 'Local Auto-saved Snapshots'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {lang === 'zh' ? '(系统会在每次修改后自动建立版本点，最多保留 10 个)' : '(Automatically captures up to 10 versions)'}
                </span>
              </div>
              {snapshots.length > 0 && (
                <button
                  onClick={onClearSnapshots}
                  className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{lang === 'zh' ? '清空历史记录' : 'Clear History'}</span>
                </button>
              )}
            </div>

            {snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs">
                <History className="w-10 h-10 stroke-1 mb-2 text-slate-300 dark:text-slate-600" />
                <span>{lang === 'zh' ? '暂无历史快照，在画布上修改信号或周期后将自动记录' : 'No snapshots yet. Changes will be auto-saved here.'}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {snapshots.map((snap) => {
                  const dateStr = new Date(snap.timestamp).toLocaleString();
                  return (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-colors"
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
                                ? `${snap.signalsCount} 条信号 · ${snap.totalCycles} 拍周期`
                                : `${snap.signalsCount} signals · ${snap.totalCycles} cycles`}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {dateStr}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onRestoreSnapshot(snap);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>{lang === 'zh' ? '还原此版本' : 'Restore'}</span>
                      </button>
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
