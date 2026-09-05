import * as wavedromModule from 'wavedrom';
import * as onmlModule from 'onml';
import { WaveJson, WaveformFontConfig, WaveSkin } from '../types';
import { SKIN_DICTIONARY, getFreshSkinDictionary, getSkinInfo } from './skins';

export const SKIN_MAP = SKIN_DICTIONARY;

const wd = wavedromModule?.default || wavedromModule;
const onml = onmlModule?.default || onmlModule;

/**
 * Post-processes SVG elements to guarantee crisp readability and high contrast,
 * especially in dark, blueprint, matrix, and cyberpunk skins where default WaveDrom text can be dark or invisible.
 */
export function postProcessSvgColors(svgEl: SVGElement, skinName: string): void {
  const info = getSkinInfo(skinName);
  svgEl.setAttribute('data-skin', skinName);

  // 0. Crucial Fix: WaveDrom hard-codes `<rect width="..." height="..." style="stroke:none;fill:white"/>`
  // inside `<g id="waves_0">`. For dark, blueprint, matrix, cyberpunk, and paper skins, this hardcoded white rect
  // covers the background with white, causing white/cyan/lime text to become completely invisible!
  // We locate all background rects inside the SVG and set their fill to info.bgColor.
  const bgRects = svgEl.querySelectorAll(
    'g[id^="waves"] > rect, rect.background, rect[fill="white"], rect[fill="#ffffff"], rect[fill="#fff"]'
  );
  bgRects.forEach((rect) => {
    rect.setAttribute('style', `stroke:none;fill:${info.bgColor}`);
    rect.setAttribute('fill', info.bgColor);
  });

  // Also ensure root svgEl has correct backgroundColor style
  svgEl.style.backgroundColor = info.bgColor;

  if (
    info.category === 'dark' ||
    skinName === 'dark' ||
    skinName === 'blueprint' ||
    skinName === 'matrix' ||
    skinName === 'cyberpunk'
  ) {
    // 1. Inject or update custom <style> directly in the SVG root
    let styleEl = svgEl.querySelector('#wd-custom-theme-style') as SVGStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style') as SVGStyleElement;
      styleEl.setAttribute('id', 'wd-custom-theme-style');
      styleEl.setAttribute('type', 'text/css');
      svgEl.insertBefore(styleEl, svgEl.firstChild);
    }

    let cssRules = `
      text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace, sans-serif !important; }
      g[id^="waves"] > rect, rect[fill="white"] { fill: ${info.bgColor} !important; }
      g[id^="wavearcs"] rect, rect[style*="fill:#FFF"], rect[style*="fill:#fff"], rect[style*="fill:white"] {
        fill: ${skinName === 'matrix' ? '#052e16' : skinName === 'blueprint' ? '#0c4a6e' : skinName === 'cyberpunk' ? '#3b0764' : '#1e293b'} !important;
        stroke: ${skinName === 'matrix' ? '#15803d' : skinName === 'blueprint' ? '#0284c7' : skinName === 'cyberpunk' ? '#a855f7' : '#475569'} !important;
        stroke-width: 0.8px !important;
        rx: 3px !important;
        ry: 3px !important;
      }
    `;

    if (skinName === 'matrix') {
      cssRules += `
        text { fill: #86efac !important; }
        .info, text.info { fill: #4ade80 !important; font-weight: 700 !important; }
        .muted, text.muted { fill: #22c55e !important; font-weight: 500 !important; }
        path.s1, path.s2 { stroke: #22c55e !important; }
        g[id^="wavearcs"] path { stroke: #22c55e !important; }
        g[id^="wavearcs"] text { fill: #4ade80 !important; font-weight: 700 !important; }
      `;
    } else if (skinName === 'blueprint') {
      cssRules += `
        text { fill: #e0f2fe !important; }
        .info, text.info { fill: #38bdf8 !important; font-weight: 700 !important; }
        .muted, text.muted { fill: #7dd3fc !important; font-weight: 500 !important; }
        path.s1, path.s2 { stroke: #38bdf8 !important; }
        g[id^="wavearcs"] path { stroke: #38bdf8 !important; }
        g[id^="wavearcs"] text { fill: #38bdf8 !important; font-weight: 700 !important; }
      `;
    } else if (skinName === 'cyberpunk') {
      cssRules += `
        text { fill: #fdf2f8 !important; }
        .info, text.info { fill: #f472b6 !important; font-weight: 700 !important; }
        .muted, text.muted { fill: #c084fc !important; font-weight: 500 !important; }
        path.s1, path.s2 { stroke: #06b6d4 !important; }
        g[id^="wavearcs"] path { stroke: #ec4899 !important; }
        g[id^="wavearcs"] text { fill: #f472b6 !important; font-weight: 700 !important; }
      `;
    } else {
      // Dark (深空极客黑)
      cssRules += `
        text { fill: #f8fafc !important; }
        .info, text.info { fill: #38bdf8 !important; font-weight: 700 !important; }
        .muted, text.muted { fill: #cbd5e1 !important; font-weight: 500 !important; }
        path.s1, path.s2 { stroke: #f8fafc !important; }
        g[id^="wavearcs"] path { stroke: #38bdf8 !important; }
        g[id^="wavearcs"] text { fill: #38bdf8 !important; font-weight: 700 !important; }
      `;
    }
    styleEl.textContent = cssRules;

    // 2. Directly set fill attributes on all <text> elements to defeat any external/default black inheritance
    const textEls = svgEl.querySelectorAll('text');
    textEls.forEach((t) => {
      const cls = t.getAttribute('class') || '';
      if (cls.includes('info')) {
        t.setAttribute('fill', skinName === 'matrix' ? '#4ade80' : skinName === 'cyberpunk' ? '#f472b6' : '#38bdf8');
        t.setAttribute('font-weight', '700');
      } else if (cls.includes('muted')) {
        t.setAttribute(
          'fill',
          skinName === 'matrix' ? '#22c55e' : skinName === 'blueprint' ? '#7dd3fc' : skinName === 'cyberpunk' ? '#c084fc' : '#cbd5e1'
        );
        t.setAttribute('font-weight', '500');
      } else {
        const defaultFill =
          skinName === 'matrix'
            ? '#86efac'
            : skinName === 'blueprint'
            ? '#e0f2fe'
            : skinName === 'cyberpunk'
            ? '#fdf2f8'
            : '#f8fafc';
        t.setAttribute('fill', defaultFill);
      }
    });

    // 3. Traces stroke color enhancement
    if (skinName === 'matrix') {
      svgEl.querySelectorAll('path.s1, path.s2').forEach((p) => p.setAttribute('stroke', '#22c55e'));
    } else if (skinName === 'blueprint') {
      svgEl.querySelectorAll('path.s1, path.s2').forEach((p) => p.setAttribute('stroke', '#38bdf8'));
    } else if (skinName === 'cyberpunk') {
      svgEl.querySelectorAll('path.s1, path.s2').forEach((p) => p.setAttribute('stroke', '#06b6d4'));
    }

    // 4. Directly override hardcoded white background rects on node markers and edge labels in dark themes
    const nodeBg =
      skinName === 'matrix' ? '#052e16' : skinName === 'blueprint' ? '#0c4a6e' : skinName === 'cyberpunk' ? '#3b0764' : '#1e293b';
    const nodeStroke =
      skinName === 'matrix' ? '#15803d' : skinName === 'blueprint' ? '#0284c7' : skinName === 'cyberpunk' ? '#a855f7' : '#475569';
    const edgeStroke =
      skinName === 'matrix' ? '#22c55e' : skinName === 'blueprint' ? '#38bdf8' : skinName === 'cyberpunk' ? '#ec4899' : '#38bdf8';

    const arcGroups = svgEl.querySelectorAll('g[id^="wavearcs"], g[id*="arc"], g[id*="label"]');
    arcGroups.forEach((group) => {
      group.querySelectorAll('rect').forEach((r) => {
        r.setAttribute('style', `fill:${nodeBg};stroke:${nodeStroke};stroke-width:0.8px;rx:3px;ry:3px;`);
        r.setAttribute('fill', nodeBg);
        r.setAttribute('stroke', nodeStroke);
      });
      group.querySelectorAll('path').forEach((p) => {
        p.setAttribute('stroke', edgeStroke);
      });
      group.querySelectorAll('text').forEach((t) => {
        t.setAttribute('fill', skinName === 'matrix' ? '#4ade80' : skinName === 'cyberpunk' ? '#f472b6' : '#38bdf8');
        t.setAttribute('font-weight', '700');
      });
    });

    // Also catch any stray rect with fill white/FFF across the SVG (except the main canvas background)
    svgEl.querySelectorAll('rect').forEach((r) => {
      const style = r.getAttribute('style') || '';
      const fill = r.getAttribute('fill') || '';
      const isWhite =
        style.includes('fill:#FFF') ||
        style.includes('fill:#fff') ||
        style.includes('fill:white') ||
        style.includes('fill: #ffffff') ||
        fill.toLowerCase() === '#fff' ||
        fill.toLowerCase() === '#ffffff' ||
        fill === 'white';

      if (isWhite) {
        const isBackgroundRect = r.parentElement?.id?.startsWith('waves');
        if (!isBackgroundRect) {
          r.setAttribute('style', `fill:${nodeBg};stroke:${nodeStroke};stroke-width:0.8px;rx:3px;ry:3px;`);
          r.setAttribute('fill', nodeBg);
          r.setAttribute('stroke', nodeStroke);
        }
      }
    });

    // Arrowheads in defs
    svgEl.querySelectorAll('marker#arrowhead path, marker path').forEach((m) => {
      m.setAttribute('fill', edgeStroke);
      m.setAttribute('stroke', edgeStroke);
    });
  } else if (skinName === 'paper') {
    // For Paper skin, update style to ensure paper background
    const bgRect = svgEl.querySelector('g[id^="waves"] > rect');
    if (bgRect) {
      bgRect.setAttribute('style', `stroke:none;fill:${info.bgColor}`);
      bgRect.setAttribute('fill', info.bgColor);
    }
  }
}

function getFamilyString(fam?: string): string {
  if (fam === 'monospace') {
    return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
  }
  if (fam === 'serif') {
    return 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif';
  }
  if (fam === 'sans-serif') {
    return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  }
  return 'system-ui, sans-serif';
}

/**
 * Custom typography post-processing: applies custom font size, weight, family, and color
 * across all text nodes inside the rendered WaveDrom SVG via both direct attribute mutation
 * and high-specificity stylesheet injection, supporting distinct configs for Title, Signals, Bus Data, and Footer.
 */
export function applyFontConfigToSvg(
  svgEl: SVGElement,
  fontConfig?: WaveformFontConfig,
  waveJson?: WaveJson
): void {
  if (!fontConfig) return;

  const defaultFont = {
    fontSize: fontConfig.fontSize || 14,
    fontWeight: fontConfig.fontWeight || '500',
    fontFamily: fontConfig.fontFamily || 'monospace',
    customColor: fontConfig.customColor || '#0f172a',
    useCustomColor: !!fontConfig.useCustomColor,
  };

  const titleFont = fontConfig.title || {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: defaultFont.fontFamily,
    customColor: defaultFont.customColor,
    useCustomColor: defaultFont.useCustomColor,
  };

  const signalFont = fontConfig.signal || {
    fontSize: defaultFont.fontSize,
    fontWeight: defaultFont.fontWeight,
    fontFamily: defaultFont.fontFamily,
    customColor: defaultFont.customColor,
    useCustomColor: defaultFont.useCustomColor,
  };

  const busFont = fontConfig.bus || {
    fontSize: Math.max(10, Math.round(defaultFont.fontSize * 0.9)),
    fontWeight: '500',
    fontFamily: defaultFont.fontFamily,
    customColor: defaultFont.customColor,
    useCustomColor: defaultFont.useCustomColor,
  };

  const footerFont = fontConfig.footer || {
    fontSize: Math.max(10, Math.round(defaultFont.fontSize * 0.85)),
    fontWeight: '400',
    fontFamily: defaultFont.fontFamily,
    customColor: defaultFont.customColor,
    useCustomColor: defaultFont.useCustomColor,
  };

  // Extract known title and footer text strings for exact matching
  const headText = (waveJson?.head?.text ? String(waveJson.head.text).trim() : '').toLowerCase();
  const footText = (waveJson?.foot?.text ? String(waveJson.foot.text).trim() : '').toLowerCase();

  // 1. Inject or update dedicated high-priority style tag inside SVG
  let customStyle = svgEl.querySelector('style#wavedrom-custom-font-style') as HTMLStyleElement | null;
  if (!customStyle) {
    customStyle = document.createElementNS('http://www.w3.org/2000/svg', 'style') as unknown as HTMLStyleElement;
    customStyle.id = 'wavedrom-custom-font-style';
    svgEl.prepend(customStyle);
  }

  customStyle.textContent = `
    /* Base default for any untargeted text */
    svg text, svg text *, svg tspan {
      font-family: ${getFamilyString(defaultFont.fontFamily)} !important;
      font-weight: ${defaultFont.fontWeight} !important;
      font-size: ${defaultFont.fontSize}px !important;
      ${defaultFont.useCustomColor && defaultFont.customColor ? `fill: ${defaultFont.customColor} !important;` : ''}
    }
  `;

  // 2. Directly set inline styles on all text nodes with accurate classification
  const allTexts = svgEl.querySelectorAll('text');
  allTexts.forEach((el) => {
    const textEl = el as SVGTextElement;
    const parentId = textEl.parentElement?.id || '';
    const parentClass = textEl.parentElement?.getAttribute('class') || '';
    const textClass = textEl.getAttribute('class') || '';
    const anchor = textEl.getAttribute('text-anchor') || '';
    const yVal = parseFloat(textEl.getAttribute('y') || '0');
    const content = (textEl.textContent || '').trim().toLowerCase();

    let targetFont = defaultFont;

    // A. Title (Head)
    if (
      (headText && content === headText) ||
      parentId.includes('head') ||
      parentClass.includes('head') ||
      textClass.includes('head') ||
      (anchor === 'middle' && yVal < 0 && !parentClass.includes('muted'))
    ) {
      targetFont = titleFont;
    }
    // B. Footer (Foot)
    else if (
      (footText && content === footText) ||
      parentId.includes('foot') ||
      parentClass.includes('foot') ||
      textClass.includes('foot') ||
      (anchor === 'middle' && yVal > 50 && !parentClass.includes('muted') && !parentId.startsWith('wavelane_'))
    ) {
      targetFont = footerFont;
    }
    // C. Signal Name (Left hand label - has text-anchor="end")
    else if (
      anchor === 'end' ||
      (parentId.startsWith('wavelane_') && textClass.includes('info'))
    ) {
      targetFont = signalFont;
    }
    // D. Bus Data (Data inside the waveform lanes)
    else if (
      parentId.startsWith('wavelane_') &&
      anchor === 'middle' &&
      !textClass.includes('info')
    ) {
      targetFont = busFont;
    }
    // E. Ruler Ticks / Numbers
    else if (
      parentClass.includes('muted') ||
      parentId.includes('mark') ||
      parentId.includes('tick')
    ) {
      targetFont = signalFont;
    } else {
      targetFont = defaultFont;
    }

    const famStr = getFamilyString(targetFont.fontFamily);
    textEl.style.setProperty('font-family', famStr, 'important');
    textEl.setAttribute('font-family', famStr);

    textEl.style.setProperty('font-weight', targetFont.fontWeight, 'important');
    textEl.setAttribute('font-weight', targetFont.fontWeight);

    textEl.style.setProperty('font-size', `${targetFont.fontSize}px`, 'important');
    textEl.setAttribute('font-size', `${targetFont.fontSize}px`);

    if (targetFont.useCustomColor && targetFont.customColor) {
      textEl.setAttribute('fill', targetFont.customColor);
      textEl.style.setProperty('fill', targetFont.customColor, 'important');
    }

    const tspans = textEl.querySelectorAll('tspan');
    tspans.forEach((ts) => {
      ts.style.setProperty('font-family', famStr, 'important');
      ts.style.setProperty('font-weight', targetFont.fontWeight, 'important');
      ts.style.setProperty('font-size', `${targetFont.fontSize}px`, 'important');
      if (targetFont.useCustomColor && targetFont.customColor) {
        ts.setAttribute('fill', targetFont.customColor);
        ts.style.setProperty('fill', targetFont.customColor, 'important');
      }
    });
  });
}

/**
 * Renders a WaveJSON object into the specified DOM container element.
 */
export function renderWaveToElement(
  waveJson: WaveJson,
  container: HTMLElement,
  skinName: string = 'default'
): { success: boolean; error?: string } {
  try {
    if (!container) return { success: false, error: 'Target container not found' };

    // WaveDrom selects the skin matching config.skin from the skinDictionary
    const preparedWaveJson: WaveJson = {
      ...waveJson,
      config: {
        hscale: waveJson.config?.hscale ?? 1,
        ...(waveJson.config || {}),
        skin: (skinName || 'default') as WaveSkin,
      },
    };

    // Always supply a fresh, unmutated skin dictionary clone
    const skinDict = getFreshSkinDictionary();

    const effectiveFont = waveJson.config?.font || (waveJson.config as any)?.fontConfig;

    // Use wavedrom renderWaveElement directly
    if (typeof wd.renderWaveElement === 'function') {
      wd.renderWaveElement(0, preparedWaveJson, container, skinDict);
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        postProcessSvgColors(svgEl as unknown as SVGElement, skinName);
        applyFontConfigToSvg(svgEl as unknown as SVGElement, effectiveFont, preparedWaveJson);
      }
      return { success: true };
    }

    // Fallback using renderAny + onml
    if (typeof wd.renderAny === 'function') {
      const tree = wd.renderAny(0, preparedWaveJson, skinDict);
      let svgString = onml.stringify(tree);
      container.innerHTML = svgString;
      const svgEl = container.querySelector('svg');
      if (svgEl) {
        postProcessSvgColors(svgEl as unknown as SVGElement, skinName);
        applyFontConfigToSvg(svgEl as unknown as SVGElement, effectiveFont, preparedWaveJson);
      }
      return { success: true };
    }

    return { success: false, error: 'WaveDrom rendering function not available' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Generates raw SVG markup string for download or copying.
 */
export function getWaveSvgString(
  waveJson: WaveJson,
  skinName: string = 'default'
): string | null {
  try {
    const preparedWaveJson: WaveJson = {
      ...waveJson,
      config: {
        hscale: waveJson.config?.hscale ?? 1,
        ...(waveJson.config || {}),
        skin: (skinName || 'default') as WaveSkin,
      },
    };

    const skinDict = getFreshSkinDictionary();

    if (typeof wd.renderAny === 'function') {
      const tree = wd.renderAny(0, preparedWaveJson, skinDict);
      const svgStr = onml.stringify(tree);
      
      const effectiveFont = waveJson.config?.font || (waveJson.config as any)?.fontConfig;

      // Post-process string using a temporary DOM parser
      if (typeof DOMParser !== 'undefined') {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgStr, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (svgEl) {
          postProcessSvgColors(svgEl as unknown as SVGElement, skinName);
          applyFontConfigToSvg(svgEl as unknown as SVGElement, effectiveFont, preparedWaveJson);
          return new XMLSerializer().serializeToString(svgEl);
        }
      }
      return svgStr;
    }
    return null;
  } catch (err) {
    console.error('Failed to get SVG string:', err);
    return null;
  }
}

/**
 * Exports the SVG inside a container to a PNG image DataURL.
 */
export async function exportSvgToPngDataUrl(
  container: HTMLElement,
  scale: number = 2,
  skinName: string = 'default'
): Promise<string> {
  const svgEl = container.querySelector('svg');
  if (!svgEl) throw new Error('No SVG element found to export');

  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  return new Promise((resolve, reject) => {
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = (svgEl.clientWidth || img.width || 800) * scale;
        canvas.height = (svgEl.clientHeight || img.height || 400) * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas 2D context not supported'));
          return;
        }

        // Fill background based on active skin
        const skinInfo = getSkinInfo(skinName);
        ctx.fillStyle = skinInfo.bgColor || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
