import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'zh' | 'en';

export interface Translations {
  [key: string]: {
    zh: string;
    en: string;
  };
}

export const I18N_DICT = {
  // App & Navbar
  app_title: { zh: 'WaveDrom 时序波形工作台', en: 'WaveDrom Timing Diagram Studio' },
  new_project: { zh: '新建工程', en: 'New Project' },
  template_library: { zh: '模板库', en: 'Templates' },
  user_guide: { zh: '使用指南', en: 'Guide' },
  project_manage: { zh: '工程管理', en: 'Projects' },
  snapshots: { zh: '工程快照', en: 'Snapshots' },
  save_status_saved: { zh: '自动保存', en: 'Auto Saved' },
  save_status_saving: { zh: '保存中...', en: 'Saving...' },
  save_status_dirty: { zh: '未保存改动', en: 'Unsaved' },
  layout_split: { zh: '左右分屏', en: 'Split View' },
  layout_stacked: { zh: '上下视图', en: 'Stacked View' },
  split_view: { zh: '左右分屏', en: 'Split' },
  stacked_view: { zh: '上下视图', en: 'Stacked' },
  theme_light: { zh: '浅色模式', en: 'Light' },
  theme_dark: { zh: '深色模式', en: 'Dark' },
  theme_system: { zh: '跟随系统', en: 'System' },
  undo: { zh: '撤销', en: 'Undo' },
  redo: { zh: '重做', en: 'Redo' },
  help: { zh: '帮助与语法', en: 'Help' },
  text_guide: { zh: '文字标注指南', en: 'Text Guide' },
  lang_switch: { zh: '语言切换', en: 'Language' },
  project_rename: { zh: '重命名工程', en: 'Rename' },

  // Signal Matrix & Toolbar
  signal_matrix_title: { zh: '信号时序矩阵', en: 'Signal Timing Matrix' },
  signal_timing_matrix: { zh: '信号时序矩阵', en: 'Signal Matrix' },
  realtime_waveform: { zh: '波形实时渲染', en: 'Waveform Preview' },
  base_total_cycles: { zh: '总周期', en: 'Cycles' },
  total_cycles: { zh: '总周期', en: 'Cycles' },
  cycles_unit: { zh: '拍', en: 'cyc' },
  folding_auto: { zh: '规律折叠', en: 'Fold Cycles' },
  folding_unfold_all: { zh: '全部展开', en: 'Unfold All' },
  fold_cycles: { zh: '智能收起周期', en: 'Fold Cycles' },
  unfold_cycles: { zh: '展开全部', en: 'Unfold All' },
  grid_density: { zh: '网格间距', en: 'Density' },
  density_mini: { zh: '微缩', en: 'Mini' },
  density_compact: { zh: '紧凑', en: 'Compact' },
  density_standard: { zh: '标准', en: 'Standard' },
  mode_simple: { zh: '常用', en: 'Basic' },
  mode_pro: { zh: '进阶', en: 'Pro' },
  basic_mode: { zh: '常用', en: 'Basic' },
  pro_mode: { zh: '进阶', en: 'Pro' },
  add_group: { zh: '+ 分组', en: '+ Group' },
  add_signal: { zh: '添加信号', en: 'Add Signal' },
  add_spacer: { zh: '插入间隙行', en: 'Insert Spacer' },
  brush_mode: { zh: '连续画笔', en: 'Brush' },
  continuous_brush: { zh: '连续画笔', en: 'Brush' },
  continuous_brush_mode: { zh: '连续刷模式:', en: 'Brush Mode:' },
  advanced_tools: { zh: '高级工具', en: 'Advanced' },
  search_placeholder: { zh: '搜索信号名...', en: 'Search signals...' },
  clear_search: { zh: '清除搜索', en: 'Clear' },

  // Categories & Direct Jump
  category: { zh: '分类', en: 'Category' },
  category_nav: { zh: '分类导航', en: 'Categories' },
  category_all: { zh: '全部', en: 'All' },
  cat_all: { zh: '全部', en: 'All' },
  cat_clock: { zh: '时钟', en: 'Clock' },
  cat_reset: { zh: '复位', en: 'Reset' },
  cat_control: { zh: '控制', en: 'Control' },
  cat_address: { zh: '地址', en: 'Address' },
  cat_bus: { zh: '数据', en: 'Data' },
  cat_status: { zh: '状态', en: 'Status' },
  cat_other: { zh: '其它', en: 'Other' },
  manage_categories: { zh: '+ 分类', en: '+ Category' },
  add_category: { zh: '+ 分类', en: '+ Category' },
  reset_filter: { zh: '重置筛选', en: 'Reset' },
  signal_direct_jump: { zh: '信号直达', en: 'Direct Jump' },
  direct_jump: { zh: '信号直达:', en: 'Jump:' },
  direct_jump_hint: { zh: '点击信号快速定位', en: 'Click to jump to signal' },
  fold_all_signals: { zh: '折叠全部', en: 'Collapse All' },
  unfold_all_signals: { zh: '展开全部', en: 'Expand All' },
  project_management: { zh: '工程管理', en: 'Projects' },
  insert_phase_track: { zh: '+ 插入阶段文字轨', en: '+ Insert Phase Track' },
  cdc_calculator: { zh: '⏱️ 跨时钟域对齐计算', en: '⏱️ CDC Alignment Calculator' },
  setup_hold_window: { zh: '📐 建立/保持时间窗口', en: '📐 Setup/Hold Timing Window' },
  sticky_matrix_title: { zh: '时序矩阵常驻吸顶:', en: 'Pin Matrix to Top:' },
  status_enabled: { zh: '已开启', en: 'Enabled' },
  status_disabled: { zh: '已关闭', en: 'Disabled' },
  active_label: { zh: '激活中:', en: 'Active:' },
  exit_esc: { zh: '退出 (Esc)', en: 'Exit (Esc)' },
  brush_hint: { zh: '选择画笔后拖拽方块即可连续输入', en: 'Select brush then drag cells to paint' },
  advanced_toolbox: { zh: '高级辅助工具箱', en: 'Advanced Tools' },

  // Signal Row Controls
  tap_pipeline: { zh: '快速打拍 (+1D)', en: 'Pipeline Tap (+1D)' },
  tap_pipeline_desc: { zh: '自动为此信号生成延后1个周期的 _d1 信号', en: 'Generate a 1-cycle delayed _d1 signal' },
  node_track: { zh: '节点打标', en: 'Node Markers' },
  node_track_open: { zh: '+ 节点打标', en: '+ Node Markers' },
  node_track_close: { zh: '收起节点', en: 'Hide Nodes' },
  nodes_count: { zh: '个节点', en: 'nodes' },
  node_track_desc: { zh: '左键点击切换下一个字母，右键直接编辑修改，×删除', en: 'Left-click cycles letters, Right-click edits directly, × deletes' },
  more_config: { zh: '更多配置', en: 'More' },
  less_config: { zh: '收起配置', en: 'Hide' },
  copy_signal: { zh: '复制', en: 'Duplicate' },
  delete_signal: { zh: '删除', en: 'Delete' },
  shift_to_top: { zh: '置顶', en: 'Top' },
  shift_to_bottom: { zh: '置底', en: 'Bottom' },
  move_up: { zh: '上移', en: 'Up' },
  move_down: { zh: '下移', en: 'Down' },
  insert_below: { zh: '插入信号', en: 'Insert Below' },
  divider_period: { zh: '分频', en: 'Divider' },
  delay_phase: { zh: '延时', en: 'Delay' },
  auto_hold: { zh: '自动保持', en: 'Auto-Hold' },
  invert: { zh: '反相', en: 'Invert' },
  set_clock_p: { zh: '时钟(p)', en: 'Clock(p)' },
  all_zero: { zh: '全0', en: 'All 0' },
  all_one: { zh: '全1', en: 'All 1' },
  bus_data_btn: { zh: '总线数据', en: 'Bus Data' },
  sticky_matrix: { zh: '吸顶', en: 'Sticky' },

  // Waveform Preview & Font Settings
  waveform_title: { zh: '波形预览', en: 'Waveform' },
  waveform_skin: { zh: '皮肤', en: 'Skin' },
  waveform_ruler: { zh: '标尺', en: 'Ruler' },
  waveform_font: { zh: '字体', en: 'Font' },
  waveform_height: { zh: '波形高度', en: 'Height' },
  waveform_fill: { zh: '占满底部', en: 'Fill' },
  waveform_fit: { zh: '自适应', en: 'Auto Fit' },
  waveform_zoom: { zh: '缩放', en: 'Zoom' },
  waveform_copy: { zh: '复制', en: 'Copy' },
  waveform_export: { zh: '导出', en: 'Export' },
  ratio: { zh: '比例:', en: 'Ratio:' },
  right_pane: { zh: '右侧', en: 'Right' },
  height_label: { zh: '高度', en: 'Height' },
  height_fill: { zh: '占满底部', en: 'Fill' },
  height_auto: { zh: '自适应', en: 'Auto' },
  height_custom: { zh: '固定高度', en: 'Fixed' },
  font_settings: { zh: '波形字体', en: 'Waveform Font' },
  font_settings_title: { zh: '波形字体配置', en: 'Waveform Typography' },
  font_size: { zh: '字体大小', en: 'Font Size' },
  font_weight: { zh: '字体粗细', en: 'Font Weight' },
  font_weight_normal: { zh: '常规 (400)', en: 'Normal (400)' },
  font_weight_medium: { zh: '中等 (500)', en: 'Medium (500)' },
  font_weight_bold: { zh: '加粗 (700)', en: 'Bold (700)' },
  font_weight_black: { zh: '特粗 (900)', en: 'Heavy (900)' },
  font_family: { zh: '字体族', en: 'Font Family' },
  font_family_mono: { zh: '代码等宽 (Monospace)', en: 'Monospace' },
  font_family_sans: { zh: '现代无衬线 (Sans-Serif)', en: 'Sans-Serif' },
  font_family_serif: { zh: '经典衬线 (Serif)', en: 'Serif' },
  font_color: { zh: '文字颜色', en: 'Text Color' },
  font_color_auto: { zh: '自适应', en: 'Auto' },
  font_color_custom: { zh: '自定义', en: 'Custom' },
  font_reset: { zh: '重置', en: 'Reset' },

  // Preview Actions
  zoom_in: { zh: '放大', en: 'Zoom In' },
  zoom_out: { zh: '缩小', en: 'Zoom Out' },
  zoom_reset: { zh: '重置', en: 'Reset Zoom' },
  fit_canvas: { zh: '自适应画板', en: 'Fit Canvas' },
  guideline_toggle: { zh: '时序对齐参考线', en: 'Timing Alignment Crosshair' },
  skin_selector: { zh: '皮肤主题', en: 'Waveform Skin' },
  copy_svg: { zh: '复制 SVG', en: 'Copy SVG' },
  copied: { zh: '已复制！', en: 'Copied!' },
  download_svg: { zh: '导出 SVG', en: 'Export SVG' },
  download_png: { zh: '导出 PNG', en: 'Export PNG' },
  ruler_settings: { zh: '周期标尺设置', en: 'Ruler Config' },

  // Edge & Timing Annotations
  edge_editor_title: { zh: '时序标注与箭头连线 (Edges)', en: 'Timing Arrows & Edges' },
  add_edge: { zh: '添加时序连线', en: 'Add Edge' },
  arrow_type: { zh: '箭头样式', en: 'Arrow Style' },
  source_node: { zh: '起点节点', en: 'Source Node' },
  target_node: { zh: '终点节点', en: 'Target Node' },
  edge_label: { zh: '标注文字 (例如 t_setup)', en: 'Annotation Label' },
  active_edges_count: { zh: '当前已配置时序连线', en: 'Configured Edges' },
  no_edges: { zh: '暂无连线标注', en: 'No edges configured' },
  delete_edge: { zh: '删除连线', en: 'Delete Edge' },

  // Custom Templates & Modals
  custom_templates: { zh: '我的预设', en: 'My Custom Presets' },
  save_as_custom: { zh: '将当前工程保存为自定义模板', en: 'Save Current as Template' },
  delete_template_confirm: { zh: '确定删除此自定义模板？', en: 'Are you sure to delete this template?' },
  confirm_delete: { zh: '确认删除', en: 'Confirm Delete' },
  cancel: { zh: '取消', en: 'Cancel' },
  save: { zh: '保存', en: 'Save' },
  apply: { zh: '应用', en: 'Apply' },
  close: { zh: '关闭', en: 'Close' },
  reset_confirm_title: { zh: '确认重置波形？', en: 'Reset Waveform?' },
  reset_confirm_message: {
    zh: '确认重置波形工程吗？所有未导出的波形修改将被清除并恢复为默认模板。',
    en: 'Reset current waveform? All unsaved modifications will be cleared and restored to default template.',
  },
  reset_confirm_btn: { zh: '确认重置', en: 'Reset Now' },
  new_project_confirm_title: { zh: '新建波形工程', en: 'New Project' },
  new_project_confirm_message: {
    zh: '新建工程将清空当前画布，确定新建吗？',
    en: 'Creating a new project will clear the current canvas. Continue?',
  },
  layout_switch_stacked: { zh: '切为上下视图', en: 'Stacked View' },
  layout_switch_split: { zh: '切为分屏视图', en: 'Split View' },
  split_ratio: { zh: '分屏比例', en: 'Split Ratio' },
} as const;

interface I18nContextType {
  lang: Language;
  language: Language;
  setLang: (lang: Language) => void;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof I18N_DICT) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'zh',
  language: 'zh',
  setLang: () => {},
  setLanguage: () => {},
  t: (key) => I18N_DICT[key]?.zh || String(key),
});

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('wavedrom_lang');
      if (saved === 'en' || saved === 'zh') return saved;
    } catch {}
    return 'zh';
  });

  const setLang = (nextLang: Language) => {
    setLangState(nextLang);
    try {
      localStorage.setItem('wavedrom_lang', nextLang);
    } catch {}
  };

  const t = (key: keyof typeof I18N_DICT): string => {
    const entry = I18N_DICT[key];
    if (!entry) return String(key);
    return entry[lang] || entry.zh || String(key);
  };

  return (
    <I18nContext.Provider
      value={{
        lang,
        language: lang,
        setLang,
        setLanguage: setLang,
        t,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
