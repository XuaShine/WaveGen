export interface SymbolMeta {
  symbol: string;
  name: string;
  nameZh?: string;
  category: 'logic' | 'clock' | 'bus' | 'state' | 'control';
  desc: string;
  descZh?: string;
  badgeBg: string;
  textColor: string;
}

export const WAVE_SYMBOLS: SymbolMeta[] = [
  { symbol: '0', name: 'Low (0)', nameZh: '低电平 (0)', category: 'logic', desc: 'Logic Low level (0)', descZh: '标准逻辑低电平 (0)', badgeBg: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200', textColor: 'text-slate-600' },
  { symbol: '1', name: 'High (1)', nameZh: '高电平 (1)', category: 'logic', desc: 'Logic High level (1)', descZh: '标准逻辑高电平 (1)', badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300', textColor: 'text-emerald-600' },
  { symbol: '.', name: 'Hold (.)', nameZh: '电平保持 (.)', category: 'control', desc: 'Continue / hold previous state', descZh: '延续并保持前一时钟周期电平状态', badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300', textColor: 'text-indigo-500' },
  { symbol: 'p', name: 'Clk Pos (p)', nameZh: '上升沿时钟 (p)', category: 'clock', desc: 'Positive clock with edge arrow', descZh: '带上升沿触发箭头的正时钟周期', badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300', textColor: 'text-blue-600' },
  { symbol: 'P', name: 'Clk Pos (P)', nameZh: '上升沿无标时钟 (P)', category: 'clock', desc: 'Positive clock without arrow', descZh: '正时钟周期（无边缘箭头标注）', badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400', textColor: 'text-blue-500' },
  { symbol: 'n', name: 'Clk Neg (n)', nameZh: '下降沿时钟 (n)', category: 'clock', desc: 'Negative clock with edge arrow', descZh: '带下降沿触发箭头的负时钟周期', badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300', textColor: 'text-sky-600' },
  { symbol: 'N', name: 'Clk Neg (N)', nameZh: '下降沿无标时钟 (N)', category: 'clock', desc: 'Negative clock without arrow', descZh: '负时钟周期（无边缘箭头标注）', badgeBg: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400', textColor: 'text-sky-500' },
  { symbol: '=', name: 'Bus (=)', nameZh: '标准总线 (=)', category: 'bus', desc: 'Standard data bus segment', descZh: '标准数据总线段（支持总线数据文本映射）', badgeBg: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300', textColor: 'text-violet-600' },
  { symbol: '2', name: 'Bus Red (2)', nameZh: '红粉总线 (2)', category: 'bus', desc: 'Color 2 (Salmon / Red)', descZh: '第2配色总线段（鲑红/浅粉）', badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300', textColor: 'text-rose-600' },
  { symbol: '3', name: 'Bus Cyan (3)', nameZh: '青蓝总线 (3)', category: 'bus', desc: 'Color 3 (Cyan / Teal)', descZh: '第3配色总线段（青色/青绿）', badgeBg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300', textColor: 'text-cyan-600' },
  { symbol: '4', name: 'Bus Purple (4)', nameZh: '紫色总线 (4)', category: 'bus', desc: 'Color 4 (Purple)', descZh: '第4配色总线段（紫色/淡紫）', badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300', textColor: 'text-purple-600' },
  { symbol: '5', name: 'Bus Green (5)', nameZh: '绿色总线 (5)', category: 'bus', desc: 'Color 5 (Green)', descZh: '第5配色总线段（翠绿）', badgeBg: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300', textColor: 'text-green-600' },
  { symbol: '6', name: 'Bus Yellow (6)', nameZh: '黄色总线 (6)', category: 'bus', desc: 'Color 6 (Yellow/Amber)', descZh: '第6配色总线段（亮黄/琥珀）', badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', textColor: 'text-amber-600' },
  { symbol: '7', name: 'Bus Blue (7)', nameZh: '深蓝总线 (7)', category: 'bus', desc: 'Color 7 (Blue)', descZh: '第7配色总线段（宝蓝/靛蓝）', badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300', textColor: 'text-indigo-600' },
  { symbol: 'x', name: 'Don\'t Care (x)', nameZh: '不定态 / 无效 (x)', category: 'state', desc: 'Undefined / cross-hatched', descZh: '未定态或无效数据（阴影交叉填充）', badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300', textColor: 'text-orange-600' },
  { symbol: 'z', name: 'High-Z (z)', nameZh: '高阻态 (z)', category: 'state', desc: 'Tri-state / floating midline', descZh: '三态高阻 / 浮空（中央细线）', badgeBg: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300', textColor: 'text-zinc-500' },
  { symbol: 'u', name: 'Up Pulse (u)', nameZh: '上升过渡脉冲 (u)', category: 'logic', desc: 'Transition up', descZh: '向上跳变过渡脉冲', badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300', textColor: 'text-teal-600' },
  { symbol: 'd', name: 'Down Pulse (d)', nameZh: '下降过渡脉冲 (d)', category: 'logic', desc: 'Transition down', descZh: '向下跳变过渡脉冲', badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', textColor: 'text-amber-600' },
  { symbol: 'h', name: 'High Pulse (h)', nameZh: '垂直高电平 (h)', category: 'logic', desc: 'High pulse with transition', descZh: '垂直方波高电平脉冲（无斜率对齐）', badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300', textColor: 'text-emerald-600' },
  { symbol: 'l', name: 'Low Pulse (l)', nameZh: '垂直低电平 (l)', category: 'logic', desc: 'Low pulse with transition', descZh: '垂直方波低电平脉冲（无斜率对齐）', badgeBg: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200', textColor: 'text-slate-600' },
  { symbol: '8', name: 'Bus Dark (8)', nameZh: '石板灰总线 (8)', category: 'bus', desc: 'Color 8 (Slate / Dark)', descZh: '第8配色总线段（深石板灰）', badgeBg: 'bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-200', textColor: 'text-slate-700' },
  { symbol: '9', name: 'Bus Amber (9)', nameZh: '金褐总线 (9)', category: 'bus', desc: 'Color 9 (Deep Amber)', descZh: '第9配色总线段（深琥珀/金褐）', badgeBg: 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200', textColor: 'text-amber-700' },
  { symbol: '|', name: 'Time Gap (|)', nameZh: '时序断裂标记 (|)', category: 'control', desc: 'Time break marker', descZh: '波形省略/长等待折断线标记', badgeBg: 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300', textColor: 'text-neutral-600' },
];

export const SYMBOL_QUICK_CYCLE = ['0', '1', 'p', '=', '3', 'x', 'z', '.'];
