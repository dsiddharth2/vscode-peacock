import * as vscode from 'vscode';
import { applyColor } from './apply-color';
import { isValidColorInput, getColorHex } from './color-library';
import { peacockGreen } from './models';

export type ColorPickerMessageType = 'preview' | 'apply' | 'cancel';

export interface ColorPickerMessage {
  type: ColorPickerMessageType;
  color?: string;
}

export function parseColorPickerMessage(message: unknown): ColorPickerMessage | undefined {
  if (!message || typeof message !== 'object') {
    return undefined;
  }

  const type = (message as { type?: unknown }).type;
  if (type !== 'preview' && type !== 'apply' && type !== 'cancel') {
    return undefined;
  }

  if (type === 'cancel') {
    return { type };
  }

  const color = (message as { color?: unknown }).color;
  if (typeof color !== 'string') {
    return undefined;
  }

  return { type, color };
}

export function getColorPickerNonce() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export function sanitizeColorForPicker(color: string) {
  if (isValidColorInput(color)) {
    return getColorHex(color);
  }
  return peacockGreen;
}

export function buildColorPickerHtml(initialColor: string, nonce: string) {
  const color = sanitizeColorForPicker(initialColor);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Peacock Color Picker</title>
  <style>
    :root {
      --bg: var(--vscode-editor-background, #1e1e1e);
      --fg: var(--vscode-editor-foreground, #cccccc);
      --border: var(--vscode-widget-border, #454545);
      --button-bg: var(--vscode-button-background, #0e639c);
      --button-fg: var(--vscode-button-foreground, #ffffff);
      --secondary-bg: var(--vscode-button-secondaryBackground, #3a3d41);
      --secondary-fg: var(--vscode-button-secondaryForeground, #ffffff);
      --input-bg: var(--vscode-input-background, #3c3c3c);
      --input-fg: var(--vscode-input-foreground, #cccccc);
      --input-border: var(--vscode-input-border, #6b6b6b);
    }
    html, body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--fg);
      font-family: var(--vscode-font-family, sans-serif);
    }
    .wrap {
      box-sizing: border-box;
      max-width: 520px;
      margin: 0 auto;
      padding: 16px;
    }
    h1 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 12px;
    }
    .picker {
      display: grid;
      grid-template-columns: 1fr 28px 72px;
      gap: 12px;
      align-items: stretch;
    }
    #sv-box, #hue-bar, #preview {
      border: 1px solid var(--border);
      border-radius: 4px;
      position: relative;
    }
    #sv-box {
      height: 220px;
      cursor: crosshair;
    }
    #hue-bar {
      cursor: ns-resize;
      background: linear-gradient(
        to bottom,
        #ff0000 0%,
        #ffff00 17%,
        #00ff00 33%,
        #00ffff 50%,
        #0000ff 67%,
        #ff00ff 83%,
        #ff0000 100%
      );
    }
    #preview {
      min-height: 72px;
    }
    .sv-white, .sv-black {
      position: absolute;
      inset: 0;
      border-radius: 3px;
    }
    .sv-white {
      background: linear-gradient(to right, #fff, rgba(255,255,255,0));
    }
    .sv-black {
      background: linear-gradient(to top, #000, rgba(0,0,0,0));
    }
    .cursor, .hue-cursor {
      position: absolute;
      pointer-events: none;
      box-sizing: border-box;
    }
    .cursor {
      width: 14px;
      height: 14px;
      border: 2px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 1px #000;
      transform: translate(-50%, -50%);
    }
    .hue-cursor {
      left: 2px;
      right: 2px;
      height: 4px;
      background: #fff;
      border: 1px solid #000;
      transform: translateY(-50%);
    }
    .fields {
      display: grid;
      grid-template-columns: 72px 1fr 1fr 1fr;
      gap: 8px;
      margin-top: 16px;
    }
    label {
      display: flex;
      flex-direction: column;
      font-size: 12px;
      gap: 4px;
    }
    input {
      background: var(--input-bg);
      color: var(--input-fg);
      border: 1px solid var(--input-border);
      border-radius: 2px;
      padding: 6px 8px;
      font-family: var(--vscode-editor-font-family, monospace);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    button {
      border: none;
      border-radius: 2px;
      padding: 8px 14px;
      cursor: pointer;
      font-size: 13px;
    }
    .apply {
      background: var(--button-bg);
      color: var(--button-fg);
    }
    .cancel {
      background: var(--secondary-bg);
      color: var(--secondary-fg);
    }
    p.hint {
      margin: 12px 0 0;
      font-size: 12px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Pick any color</h1>
    <div class="picker">
      <div id="sv-box" role="slider" aria-label="Saturation and brightness">
        <div class="sv-white"></div>
        <div class="sv-black"></div>
        <div class="cursor" id="sv-cursor"></div>
      </div>
      <div id="hue-bar" role="slider" aria-label="Hue">
        <div class="hue-cursor" id="hue-cursor"></div>
      </div>
      <div id="preview" aria-label="Selected color preview"></div>
    </div>
    <div class="fields">
      <label>Hex<input id="hex" type="text" maxlength="7" spellcheck="false" /></label>
      <label>R<input id="r" type="number" min="0" max="255" /></label>
      <label>G<input id="g" type="number" min="0" max="255" /></label>
      <label>B<input id="b" type="number" min="0" max="255" /></label>
    </div>
    <div class="actions">
      <button class="cancel" id="cancel" type="button">Cancel</button>
      <button class="apply" id="apply" type="button">Apply Color</button>
    </div>
    <p class="hint">Drag the square or hue bar, or type any hex/RGB value. This picker can select any 24-bit color, not just favorites.</p>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const initialHex = ${JSON.stringify(color)};
    const svBox = document.getElementById('sv-box');
    const hueBar = document.getElementById('hue-bar');
    const preview = document.getElementById('preview');
    const svCursor = document.getElementById('sv-cursor');
    const hueCursor = document.getElementById('hue-cursor');
    const hexInput = document.getElementById('hex');
    const rInput = document.getElementById('r');
    const gInput = document.getElementById('g');
    const bInput = document.getElementById('b');
    let hsv = { h: 0, s: 1, v: 1 };
    let lastPosted = '';

    function hsvToRgb(h, s, v) {
      h = ((h % 360) + 360) % 360;
      const c = v * s;
      const x = c * (1 - Math.abs((h / 60) % 2 - 1));
      const m = v - c;
      let r = 0, g = 0, b = 0;
      if (h < 60) { r = c; g = x; }
      else if (h < 120) { r = x; g = c; }
      else if (h < 180) { g = c; b = x; }
      else if (h < 240) { g = x; b = c; }
      else if (h < 300) { r = x; b = c; }
      else { r = c; b = x; }
      return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
      };
    }

    function rgbToHex(r, g, b) {
      const toHex = n => n.toString(16).padStart(2, '0');
      return '#' + toHex(r) + toHex(g) + toHex(b);
    }

    function hexToRgb(hex) {
      const value = hex.trim();
      const shortMatch = /^#?([0-9a-f]{3})$/i.exec(value);
      if (shortMatch) {
        const s = shortMatch[1];
        return {
          r: parseInt(s[0] + s[0], 16),
          g: parseInt(s[1] + s[1], 16),
          b: parseInt(s[2] + s[2], 16)
        };
      }
      const match = /^#?([0-9a-f]{6})$/i.exec(value);
      if (!match) {
        return null;
      }
      const n = parseInt(match[1], 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }

    function rgbToHsv(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const d = max - min;
      let h = 0;
      const s = max === 0 ? 0 : d / max;
      const v = max;
      if (d !== 0) {
        if (max === r) {
          h = (g - b) / d + (g < b ? 6 : 0);
        } else if (max === g) {
          h = (b - r) / d + 2;
        } else {
          h = (r - g) / d + 4;
        }
        h *= 60;
      }
      return { h, s, v };
    }

    function currentRgb() {
      return hsvToRgb(hsv.h, hsv.s, hsv.v);
    }

    function currentHex() {
      const rgb = currentRgb();
      return rgbToHex(rgb.r, rgb.g, rgb.b);
    }

    function postPreview() {
      const hex = currentHex();
      if (hex === lastPosted) {
        return;
      }
      lastPosted = hex;
      vscode.postMessage({ type: 'preview', color: hex });
    }

    function render(skipHex) {
      const rgb = currentRgb();
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      const hueRgb = hsvToRgb(hsv.h, 1, 1);
      svBox.style.background = rgbToHex(hueRgb.r, hueRgb.g, hueRgb.b);
      preview.style.background = hex;
      svCursor.style.left = (hsv.s * 100) + '%';
      svCursor.style.top = ((1 - hsv.v) * 100) + '%';
      hueCursor.style.top = ((hsv.h / 360) * 100) + '%';
      rInput.value = String(rgb.r);
      gInput.value = String(rgb.g);
      bInput.value = String(rgb.b);
      if (!skipHex) {
        hexInput.value = hex;
      }
      postPreview();
    }

    function setFromHex(hex) {
      const rgb = hexToRgb(hex);
      if (!rgb) {
        return false;
      }
      hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      render();
      return true;
    }

    function pointerRatio(el, event, vertical) {
      const rect = el.getBoundingClientRect();
      if (vertical) {
        const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
        return rect.height ? y / rect.height : 0;
      }
      const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
      return rect.width ? x / rect.width : 0;
    }

    function bindDrag(el, handler) {
      const move = event => handler(event);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      el.addEventListener('pointerdown', event => {
        event.preventDefault();
        el.setPointerCapture(event.pointerId);
        handler(event);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
    }

    bindDrag(svBox, event => {
      hsv.s = pointerRatio(svBox, event, false);
      hsv.v = 1 - pointerRatio(svBox, event, true);
      render();
    });

    bindDrag(hueBar, event => {
      hsv.h = pointerRatio(hueBar, event, true) * 360;
      render();
    });

    hexInput.addEventListener('input', () => {
      const rgb = hexToRgb(hexInput.value);
      if (!rgb) {
        return;
      }
      hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      render(true);
    });

    function readRgbInputs() {
      const r = Math.min(255, Math.max(0, Number(rInput.value) || 0));
      const g = Math.min(255, Math.max(0, Number(gInput.value) || 0));
      const b = Math.min(255, Math.max(0, Number(bInput.value) || 0));
      hsv = rgbToHsv(r, g, b);
      render();
    }

    rInput.addEventListener('input', readRgbInputs);
    gInput.addEventListener('input', readRgbInputs);
    bInput.addEventListener('input', readRgbInputs);

    document.getElementById('apply').addEventListener('click', () => {
      vscode.postMessage({ type: 'apply', color: currentHex() });
    });
    document.getElementById('cancel').addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });
    window.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        vscode.postMessage({ type: 'apply', color: currentHex() });
      }
      if (event.key === 'Escape') {
        vscode.postMessage({ type: 'cancel' });
      }
    });

    setFromHex(initialHex);
  </script>
</body>
</html>`;
}

export async function promptForColorPicker(
  initialColor = peacockGreen,
): Promise<string | undefined> {
  const color = sanitizeColorForPicker(initialColor);
  const panel = vscode.window.createWebviewPanel(
    'peacock.colorPicker',
    'Peacock: Pick a Color',
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    },
  );

  const nonce = getColorPickerNonce();
  panel.webview.html = buildColorPickerHtml(color, nonce);

  return new Promise(resolve => {
    let settled = false;
    let lastPreview = '';

    const finish = (selected?: string) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(selected);
      panel.dispose();
    };

    panel.webview.onDidReceiveMessage(async (message: unknown) => {
      const parsed = parseColorPickerMessage(message);
      if (!parsed) {
        return;
      }

      if (parsed.type === 'cancel') {
        finish(undefined);
        return;
      }

      if (!parsed.color || !isValidColorInput(parsed.color)) {
        return;
      }

      const hex = getColorHex(parsed.color);

      if (parsed.type === 'preview') {
        if (hex !== lastPreview) {
          lastPreview = hex;
          await applyColor(hex);
        }
        return;
      }

      finish(hex);
    });

    panel.onDidDispose(() => finish(undefined));
  });
}

export const colorPickerApi = {
  promptForColorPicker,
};
