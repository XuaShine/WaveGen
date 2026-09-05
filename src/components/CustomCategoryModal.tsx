import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Tag, Check, Palette, Pencil } from 'lucide-react';
import { CategoryMeta, SIGNAL_CATEGORIES } from '../types';
import { useI18n } from '../lib/i18n';

interface CustomCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customCategories: CategoryMeta[];
  onSaveCustomCategories: (categories: CategoryMeta[]) => void;
}

const PRESET_ICONS = [
  '⭐', '🚀', '📡', '🛰️', '💡', '🛡️', '⚙️', '🔑', '🎛️', '🚩',
  '🧩', '🔌', '📐', '🔬', '💾', '🎯', '📦', '🗂️', '📊', '⚡'
];

const PRESET_COLORS: Array<{
  name: string;
  enName: string;
  dotColor: string;
  badgeClass: string;
}> = [
  {
    name: '经典蓝',
    enName: 'Classic Blue',
    dotColor: '#3b82f6',
    badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300 dark:border-blue-800',
  },
  {
    name: '翡翠绿',
    enName: 'Emerald Green',
    dotColor: '#10b981',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  },
  {
    name: '紫罗兰',
    enName: 'Violet',
    dotColor: '#8b5cf6',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-300 dark:border-purple-800',
  },
  {
    name: '活力橙',
    enName: 'Vibrant Orange',
    dotColor: '#f97316',
    badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border-orange-300 dark:border-orange-800',
  },
  {
    name: '玫瑰红',
    enName: 'Rose Red',
    dotColor: '#f43f5e',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  },
  {
    name: '青空蓝',
    enName: 'Sky Cyan',
    dotColor: '#06b6d4',
    badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
  },
  {
    name: '琥珀金',
    enName: 'Amber Gold',
    dotColor: '#f59e0b',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  },
  {
    name: '极客粉',
    enName: 'Geek Pink',
    dotColor: '#ec4899',
    badgeClass: 'bg-pink-100 text-pink-800 dark:bg-pink-950/80 dark:text-pink-300 border-pink-300 dark:border-pink-800',
  },
  {
    name: '深石灰',
    enName: 'Slate Gray',
    dotColor: '#64748b',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  },
];

export const CustomCategoryModal: React.FC<CustomCategoryModalProps> = ({
  isOpen,
  onClose,
  customCategories,
  onSaveCustomCategories,
}) => {
  const { lang, t } = useI18n();
  const [newCatName, setNewCatName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('⭐');
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorMsg(lang === 'zh' ? '请输入分类名称' : 'Please enter category name');
      return;
    }

    // Check if name already exists in built-in or custom
    const allNames = [
      ...SIGNAL_CATEGORIES.map((c) => c.name),
      ...customCategories.map((c) => c.name),
    ];
    if (allNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(lang === 'zh' ? '分类名称已存在，请换一个名称' : 'Category name already exists');
      return;
    }

    const colorConfig = PRESET_COLORS[selectedColorIdx] || PRESET_COLORS[0];
    const newCategory: CategoryMeta = {
      id: `custom_${Date.now()}`,
      name: trimmed,
      label: trimmed,
      icon: selectedIcon,
      badgeClass: colorConfig.badgeClass,
      badgeCls: colorConfig.badgeClass,
      dotColor: colorConfig.dotColor,
    };

    onSaveCustomCategories([...customCategories, newCategory]);
    setNewCatName('');
    setErrorMsg('');
  };

  const handleStartEdit = (cat: CategoryMeta) => {
    setEditingCatId(cat.id);
    setEditingName(cat.name);
  };

  const handleSaveEdit = (catId: string) => {
    const trimmed = editingName.trim();
    if (!trimmed) {
      setEditingCatId(null);
      return;
    }
    const updated = customCategories.map((c) => {
      if (c.id === catId) {
        return { ...c, name: trimmed, label: trimmed };
      }
      return c;
    });
    onSaveCustomCategories(updated);
    setEditingCatId(null);
  };

  const handleDeleteCategory = (catId: string) => {
    const updated = customCategories.filter((c) => c.id !== catId);
    onSaveCustomCategories(updated);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {lang === 'zh' ? '自定义信号分类管理' : 'Signal Category Manager'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'zh'
                  ? '创建与管理项目专属信号分类（如 SPI、AXI、GPIO、调试等）'
                  : 'Create and organize custom categories (e.g. SPI, AXI, GPIO, Debug)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-700 dark:text-slate-300">
          {/* Create New Category Form */}
          <form onSubmit={handleCreateCategory} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3.5">
            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === 'zh' ? '添加新分类' : 'Add New Category'}</span>
            </div>

            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-slate-600 dark:text-slate-400 font-medium">
                {lang === 'zh' ? '分类名称:' : 'Category Name:'}
              </label>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => {
                  setNewCatName(e.target.value);
                  setErrorMsg('');
                }}
                placeholder={lang === 'zh' ? '例如: SPI接口, AXI总线, GPIO, 调试...' : 'e.g. SPI, AXI_Bus, GPIO, Debug...'}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden text-slate-900 dark:text-slate-100 font-medium"
              />
              {errorMsg && <p className="text-[11px] text-rose-500">{errorMsg}</p>}
            </div>

            {/* Icon Selection */}
            <div className="space-y-1">
              <label className="text-slate-600 dark:text-slate-400 font-medium">
                {lang === 'zh' ? '选择分类图标:' : 'Choose Icon:'}
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                {PRESET_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={`w-7 h-7 flex items-center justify-center rounded-md text-sm transition-all cursor-pointer ${
                      selectedIcon === icon
                        ? 'bg-blue-100 dark:bg-blue-900 border border-blue-400 scale-110'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette Selection */}
            <div className="space-y-1">
              <label className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                <Palette className="w-3.5 h-3.5 text-slate-500" />
                <span>{lang === 'zh' ? '选择标签颜色风格:' : 'Choose Badge Color:'}</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_COLORS.map((col, idx) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => setSelectedColorIdx(idx)}
                    className={`px-2 py-1.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${col.badgeClass} ${
                      selectedColorIdx === idx ? 'ring-2 ring-blue-500 font-bold scale-[1.02]' : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <span className="text-[11px]">{lang === 'zh' ? col.name : col.enName}</span>
                    {selectedColorIdx === idx && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '确认添加分类' : 'Confirm Add Category'}</span>
            </button>
          </form>

          {/* Current Custom Categories List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>{lang === 'zh' ? `已创建的自定义分类 (${customCategories.length})` : `Custom Categories (${customCategories.length})`}</span>
            </h3>

            {customCategories.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400">
                {lang === 'zh' ? '暂无自定义分类，在上方表单添加即可' : 'No custom categories yet. Add one above!'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                {customCategories.map((cat) => {
                  const isEditing = editingCatId === cat.id;
                  return (
                    <div key={cat.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 mr-2">
                          <span className="text-sm">{cat.icon}</span>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(cat.id);
                              if (e.key === 'Escape') setEditingCatId(null);
                            }}
                            className="px-2 py-1 text-xs border border-blue-500 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium flex-1 focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(cat.id)}
                            className="p-1 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
                            title={lang === 'zh' ? '保存修改' : 'Save'}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded cursor-pointer text-[10px]"
                          >
                            {lang === 'zh' ? '取消' : 'Cancel'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${cat.badgeClass}`}>
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </span>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                            title={lang === 'zh' ? '重命名此分类' : 'Rename category'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title={lang === 'zh' ? '删除此分类' : 'Delete category'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Built-in Categories Reference */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <span className="text-[11px] text-slate-400">
              {lang === 'zh' ? '默认基础分类（系统常驻）：' : 'Built-in Categories (System):'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SIGNAL_CATEGORIES.map((c) => (
                <span key={c.id} className={`px-2 py-0.5 rounded-full text-[11px] border flex items-center gap-1 opacity-70 ${c.badgeClass}`}>
                  <span>{c.icon}</span>
                  <span>{lang === 'en' ? (c.enName || c.name) : (c.label || c.name)}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-300"
          >
            {lang === 'zh' ? '完成' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
