import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Search,
  Plus,
  Trash2,
  Download,
  Upload,
  Layers,
  Sparkles,
  Check,
  Clock,
  Cpu,
  Bookmark,
  FileCode,
  FolderOpen,
} from 'lucide-react';
import { ProtocolTemplate, SignalItem, EdgeAnnotation, HeadFootConfig, DiagramConfig } from '../types';
import { PROTOCOL_TEMPLATES } from '../data/templates';
import { useI18n } from '../lib/i18n';

const CUSTOM_TEMPLATES_KEY = 'wavedrom_custom_templates_v1';

interface TemplateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (template: ProtocolTemplate, replaceExisting: boolean) => void;
  currentDesign: {
    signals: SignalItem[];
    edges: EdgeAnnotation[];
    head: HeadFootConfig;
    foot: HeadFootConfig;
    config: DiagramConfig;
    totalCycles: number;
  };
}

export const TemplateLibraryModal: React.FC<TemplateLibraryModalProps> = ({
  isOpen,
  onClose,
  onLoadTemplate,
  currentDesign,
}) => {
  const { lang, t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customTemplates, setCustomTemplates] = useState<ProtocolTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load custom templates', e);
    }
    return [];
  });

  // Save current design modal state
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<'Bus' | 'Serial' | 'Memory' | 'Clock' | 'Control' | 'Timing'>('Timing');
  const [customDesc, setCustomDesc] = useState('');
  const [replaceOnLoad, setReplaceOnLoad] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync custom templates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
    } catch (e) {
      console.warn('Failed to persist custom templates', e);
    }
  }, [customTemplates]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allTemplates: ProtocolTemplate[] = [...PROTOCOL_TEMPLATES, ...customTemplates];

  const categories = [
    { id: 'All', label: lang === 'zh' ? '全部模板' : 'All Templates' },
    { id: 'Timing', label: lang === 'zh' ? '时序与建立保持' : 'Timing & Setup/Hold' },
    { id: 'Serial', label: lang === 'zh' ? '串行总线 (SPI/I2C/UART)' : 'Serial (SPI/I2C/UART)' },
    { id: 'Bus', label: lang === 'zh' ? '系统与片上总线' : 'System Bus' },
    { id: 'Memory', label: lang === 'zh' ? '存储器与高速' : 'Memory & High-Speed' },
    { id: 'Clock', label: lang === 'zh' ? '时钟与控制' : 'Clock & Control' },
    { id: 'Custom', label: lang === 'zh' ? `⭐ 我的预设 (${customTemplates.length})` : `⭐ My Presets (${customTemplates.length})` },
  ];

  const filteredTemplates = allTemplates.filter((tpl) => {
    const isCustom = customTemplates.some((ct) => ct.id === tpl.id);
    if (selectedCategory === 'Custom' && !isCustom) return false;
    if (selectedCategory !== 'All' && selectedCategory !== 'Custom' && tpl.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = tpl.name.toLowerCase().includes(q);
      const matchDesc = tpl.description.toLowerCase().includes(q);
      const matchCat = tpl.category.toLowerCase().includes(q);
      const matchSig = tpl.signals.some((s) => s.name?.toLowerCase().includes(q));
      return matchName || matchDesc || matchCat || matchSig;
    }
    return true;
  });

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleSaveCurrentAsCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newCustom: ProtocolTemplate = {
      id: `custom_tpl_${Date.now()}`,
      name: customName.trim(),
      category: customCategory,
      description: customDesc.trim() || (lang === 'zh' ? '用户自定义时序波形模板预设' : 'User custom timing waveform preset'),
      totalCycles: currentDesign.totalCycles,
      signals: JSON.parse(JSON.stringify(currentDesign.signals)),
      edges: JSON.parse(JSON.stringify(currentDesign.edges)),
      head: JSON.parse(JSON.stringify(currentDesign.head)),
      foot: JSON.parse(JSON.stringify(currentDesign.foot)),
      config: JSON.parse(JSON.stringify(currentDesign.config)),
    };

    setCustomTemplates((prev) => [newCustom, ...prev]);
    setIsSavingCustom(false);
    setCustomName('');
    setCustomDesc('');
    setSelectedCategory('Custom');
    showNotification(lang === 'zh' ? `已保存自定义模板 "${newCustom.name}"！` : `Custom template "${newCustom.name}" saved!`);
  };

  const handleDeleteCustom = (id: string, name: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCustomTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to persist custom templates delete', err);
      }
      return next;
    });
    setDeletingId(null);
    showNotification(lang === 'zh' ? `已成功删除自定义模板 "${name}"` : `Deleted custom template "${name}"`);
  };

  const handleExportTemplate = (tpl: ProtocolTemplate) => {
    const jsonStr = JSON.stringify(tpl, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wavedrom-template-${tpl.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(lang === 'zh' ? `已导出模板 "${tpl.name}" JSON 文件！` : `Exported template "${tpl.name}" JSON!`);
  };

  const handleImportTemplateFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Can be a full template or raw WaveJSON
        if (parsed.signals && Array.isArray(parsed.signals)) {
          // It's a ProtocolTemplate object
          const newTpl: ProtocolTemplate = {
            id: `custom_imp_${Date.now()}`,
            name: parsed.name || file.name.replace(/\.json$/i, ''),
            category: parsed.category || 'Timing',
            description: parsed.description || (lang === 'zh' ? '导入的自定义协议时序模板' : 'Imported custom protocol timing template'),
            totalCycles: parsed.totalCycles || 16,
            signals: parsed.signals,
            edges: parsed.edges || [],
            head: parsed.head || {},
            foot: parsed.foot || {},
            config: parsed.config || { hscale: 1, skin: 'default' },
          };
          setCustomTemplates((prev) => [newTpl, ...prev]);
          setSelectedCategory('Custom');
          showNotification(lang === 'zh' ? `成功导入模板 "${newTpl.name}"！` : `Imported template "${newTpl.name}"!`);
        } else if (parsed.signal && Array.isArray(parsed.signal)) {
          // It's a WaveJSON object
          const newSignals: SignalItem[] = [];
          let maxCycles = 12;
          parsed.signal.forEach((item: any, idx: number) => {
            if (!item || !item.name) return;
            const wave = item.wave || '';
            maxCycles = Math.max(maxCycles, wave.length);
            newSignals.push({
              id: `sig_imp_${Date.now()}_${idx}`,
              name: item.name,
              wave: wave,
              period: item.period || 1,
              data: Array.isArray(item.data) ? item.data : undefined,
              node: item.node || undefined,
            });
          });

          const newTpl: ProtocolTemplate = {
            id: `custom_imp_${Date.now()}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            category: 'Timing',
            description: lang === 'zh' ? '从 WaveJSON 文件直接导入的预设模板' : 'Imported from WaveJSON file',
            totalCycles: maxCycles,
            signals: newSignals,
            edges: [],
            head: parsed.head || {},
            foot: parsed.foot || {},
            config: parsed.config || { hscale: 1, skin: 'default' },
          };
          setCustomTemplates((prev) => [newTpl, ...prev]);
          setSelectedCategory('Custom');
          showNotification(lang === 'zh' ? `成功从 WaveJSON 导入模板 "${newTpl.name}"！` : `Imported template "${newTpl.name}" from WaveJSON!`);
        } else {
          alert(lang === 'zh' ? '未能识别该文件格式，请确保为标准的 WaveDrom 模板或 WaveJSON 格式。' : 'Unrecognized file format. Please provide a standard WaveDrom template or WaveJSON format.');
        }
      } catch (err: any) {
        alert((lang === 'zh' ? '文件解析失败: ' : 'File parsing failed: ') + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden cursor-default"
      >
        {/* Header with high contrast title */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{lang === 'zh' ? '时序协议模板库与预设管理' : 'Protocol Template Library & Presets'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                  {allTemplates.length} {lang === 'zh' ? '个预设' : 'presets'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'zh'
                  ? '提供工业标准总线与关键时序裕量规范预设，支持自定义模板导入与导出保存'
                  : 'Industry-standard bus protocols & timing margin templates with custom import/export'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title={lang === 'zh' ? '关闭窗口' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action notification toast */}
        {actionNotice && (
          <div className="bg-emerald-500 text-white text-xs font-semibold px-4 py-2 text-center animate-in fade-in duration-200">
            {actionNotice}
          </div>
        )}

        {/* Top Control Bar: Search + Category Filter + Import / Save Actions */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={lang === 'zh' ? '搜索模板名称、协议、说明或信号名...' : 'Search templates, protocols, descriptions, or signals...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          {/* Action Buttons: Import & Save current */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Save Current Design as Custom Template */}
            <button
              type="button"
              onClick={() => setIsSavingCustom(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer"
              title={lang === 'zh' ? '将当前画布的时序信号与标注保存为自定义模板预设' : 'Save current design as custom template'}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '将当前设计存为模板' : 'Save Current as Template'}</span>
            </button>

            {/* Import Template File */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '导入模板文件 (.json)' : 'Import Template (.json)'}</span>
              <input
                type="file"
                accept=".json,.wavedrom"
                onChange={handleImportTemplateFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto text-xs">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Main Content Area: Templates Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 dark:bg-slate-950/40">
          {/* Save Current Design Drawer / Form if active */}
          {isSavingCustom && (
            <form
              onSubmit={handleSaveCurrentAsCustom}
              className="mb-6 p-4 rounded-xl border-2 border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-sm animate-in slide-in-from-top-3 duration-150"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'zh' ? '保存当前设计为自定义模板' : 'Save Current Design as Custom Template'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSavingCustom(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'zh' ? '模板名称 *' : 'Template Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'zh' ? '如: 自定义 DDR4 读写时序' : 'e.g.: Custom DDR4 Timing'}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'zh' ? '所属分类' : 'Category'}
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Timing">{lang === 'zh' ? '时序分析 (Timing)' : 'Timing Analysis'}</option>
                    <option value="Serial">{lang === 'zh' ? '串行接口 (Serial)' : 'Serial Bus'}</option>
                    <option value="Bus">{lang === 'zh' ? '系统总线 (Bus)' : 'System Bus'}</option>
                    <option value="Memory">{lang === 'zh' ? '存储接口 (Memory)' : 'Memory Interface'}</option>
                    <option value="Clock">{lang === 'zh' ? '时钟系统 (Clock)' : 'Clock System'}</option>
                    <option value="Control">{lang === 'zh' ? '控制逻辑 (Control)' : 'Control Logic'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {lang === 'zh' ? '简要说明 (可选)' : 'Description (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={lang === 'zh' ? '如: 包含 CS/CLK/DQ 采样窗口' : 'e.g.: Includes CS/CLK/DQ window'}
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-blue-200 dark:border-blue-900">
                <span className="text-slate-500 dark:text-slate-400">
                  {lang === 'zh'
                    ? `包含 ${currentDesign.signals.length} 条信号，${currentDesign.edges.length} 条箭头，共 ${currentDesign.totalCycles} 周期`
                    : `${currentDesign.signals.length} signals, ${currentDesign.edges.length} arrows, ${currentDesign.totalCycles} cycles`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSavingCustom(false)}
                    className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
                  >
                    {lang === 'zh' ? '确认保存' : 'Save Template'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {lang === 'zh' ? '未找到匹配的模板' : 'No Matching Templates Found'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm">
                {lang === 'zh'
                  ? '可以尝试更换搜索关键词，或者导入外部模板文件 / 将当前设计保存为自定义模板。'
                  : 'Try searching with different keywords, or import an external template file.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((tpl) => {
                const isCustom = customTemplates.some((c) => c.id === tpl.id);
                const isSetupHold = tpl.id === 'setup_hold_window';

                return (
                  <div
                    key={tpl.id}
                    className={`flex flex-col justify-between rounded-xl border p-4 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all ${
                      isSetupHold
                        ? 'border-purple-300 dark:border-purple-800/80 ring-1 ring-purple-300 dark:ring-purple-900/60'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Top badges */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isCustom
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                : isSetupHold
                                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300'
                                : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {isCustom ? (lang === 'zh' ? '⭐ 自定义预设' : '⭐ Custom Preset') : tpl.category}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                            {tpl.totalCycles} {lang === 'zh' ? '周期' : 'cycles'} · {tpl.signals.length} {lang === 'zh' ? '信号' : 'signals'}
                            {tpl.edges && tpl.edges.length > 0 && ` · ${tpl.edges.length} ${lang === 'zh' ? '标注' : 'arrows'}`}
                          </span>
                        </div>

                        {/* Custom actions: export or delete */}
                        {isCustom && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportTemplate(tpl);
                              }}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                              title={lang === 'zh' ? '导出此自定义模板 JSON 文件' : 'Export custom template JSON'}
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {deletingId === tpl.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] animate-in fade-in duration-100">
                                <span className="font-semibold">{lang === 'zh' ? '确认删除?' : 'Confirm?'}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCustom(tpl.id, tpl.name, e)}
                                  className="px-1.5 py-0.2 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold cursor-pointer shadow-2xs"
                                >
                                  {lang === 'zh' ? '删除' : 'Delete'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingId(null);
                                  }}
                                  className="px-1 py-0.2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                                >
                                  {lang === 'zh' ? '取消' : 'Cancel'}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(tpl.id);
                                }}
                                className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"
                                title={lang === 'zh' ? '删除此自定义模板' : 'Delete custom template'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Template Title */}
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                        <span>{tpl.name}</span>
                        {isSetupHold && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-600 text-white font-medium">
                            {lang === 'zh' ? '官方优化规范' : 'Standard Timing Spec'}
                          </span>
                        )}
                      </h4>

                      {/* Description */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                        {tpl.description}
                      </p>

                      {/* Signal Chips Preview */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-4">
                        {tpl.signals.slice(0, 5).map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-700 dark:text-slate-300 font-medium"
                          >
                            {s.name || `SIG_${idx + 1}`}
                          </span>
                        ))}
                        {tpl.signals.length > 5 && (
                          <span className="text-[10px] text-slate-400">
                            +{tpl.signals.length - 5} {lang === 'zh' ? '更多...' : 'more...'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions: Load options */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <label className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={replaceOnLoad}
                            onChange={(e) => setReplaceOnLoad(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500 w-3 h-3"
                          />
                          <span>{lang === 'zh' ? '替换当前画布' : 'Replace Canvas'}</span>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onLoadTemplate(tpl, replaceOnLoad);
                            onClose();
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer ${
                            isSetupHold
                              ? 'bg-purple-600 hover:bg-purple-700'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{lang === 'zh' ? '载入模板' : 'Load Template'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Footer bar */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>{lang === 'zh' ? '支持导入 WaveJSON / WaveDrom 标准时序格式文件' : 'Supports standard WaveJSON / WaveDrom diagram files'}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            {lang === 'zh' ? '关闭' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
