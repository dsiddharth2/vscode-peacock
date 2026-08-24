import * as vscode from 'vscode';
import * as tinycolor from 'tinycolor2';
import { peacockGreen } from './models';
import { isValidColorInput } from './color-library';

export interface ColorPickerMessage {
  command: 'apply' | 'cancel';
  color?: string;
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function parseColorPickerMessage(message: unknown): ColorPickerMessage | undefined {
  if (!message || typeof message !== 'object') {
    return undefined;
  }

  const command = (message as { command?: unknown }).command;
  if (command === 'cancel') {
    return { command: 'cancel' };
  }
  if (command !== 'apply') {
    return undefined;
  }

  const color = (message as { color?: unknown }).color;
  if (typeof color !== 'string') {
    return undefined;
  }

  return { command: 'apply', color };
}

export function expandShortHex(hex: string) {
  const value = hex.trim();
  if (value.length === 4) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  return value;
}

export function isHexColorInput(value: string) {
  return HEX_RE.test(value.trim());
}

export function sanitizeHexForColorInput(color: string) {
  if (!isValidColorInput(color)) {
    return peacockGreen;
  }
  return tinycolor(color).toHexString();
}

export function getColorPickerHtml(initialColor: string) {
  const initial = sanitizeHexForColorInput(initialColor);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<title>Pick Color</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: var(--vscode-editor-background);
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh;
  }
  .card {
    background: var(--vscode-editorWidget-background);
    border: 1px solid var(--vscode-editorWidget-border, #3c3c3c);
    border-radius: 8px;
    padding: 28px 32px;
    width: 280px;
    display: flex; flex-direction: column; gap: 20px;
  }
  h2 { font-size: 1em; font-weight: 600; }
  .swatch-row {
    display: flex; align-items: center; gap: 14px;
  }
  input[type="color"] {
    width: 52px; height: 52px;
    border: 2px solid var(--vscode-editorWidget-border, #3c3c3c);
    border-radius: 6px;
    padding: 2px;
    background: none;
    cursor: pointer;
    flex-shrink: 0;
  }
  input[type="text"] {
    flex: 1;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border, #3c3c3c);
    border-radius: 4px;
    padding: 6px 10px;
    font-family: var(--vscode-editor-font-family, monospace);
    font-size: 0.95em;
  }
  input[type="text"]:focus {
    outline: 1px solid var(--vscode-focusBorder, #007acc);
  }
  .error { color: var(--vscode-inputValidation-errorForeground, #f48771); font-size: 0.85em; min-height: 1.2em; }
  .actions { display: flex; gap: 10px; justify-content: flex-end; }
  button {
    padding: 6px 16px;
    border: none; border-radius: 4px;
    font-size: 0.95em; cursor: pointer;
  }
  #btn-apply {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
  }
  #btn-apply:hover { background: var(--vscode-button-hoverBackground); }
  #btn-cancel {
    background: var(--vscode-button-secondaryBackground, #3a3a3a);
    color: var(--vscode-button-secondaryForeground, #ccc);
  }
  #btn-cancel:hover { background: var(--vscode-button-secondaryHoverBackground, #4a4a4a); }
</style>
</head>
<body>
<div class="card">
  <h2>Custom Color</h2>
  <div class="swatch-row">
    <input type="color" id="picker" value="${initial}">
    <input type="text"  id="hex"    value="${initial}" maxlength="7" spellcheck="false">
  </div>
  <div class="error" id="err"></div>
  <div class="actions">
    <button id="btn-cancel">Cancel</button>
    <button id="btn-apply">Apply</button>
  </div>
</div>
<script>
  const vscode  = acquireVsCodeApi();
  const picker  = document.getElementById('picker');
  const hexInput = document.getElementById('hex');
  const err     = document.getElementById('err');
  const HEX_RE  = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

  function expand(h) {
    return h.length === 4
      ? '#' + h[1]+h[1] + h[2]+h[2] + h[3]+h[3]
      : h;
  }

  picker.addEventListener('input', () => {
    hexInput.value = picker.value;
    err.textContent = '';
  });

  hexInput.addEventListener('input', () => {
    const v = hexInput.value.trim();
    if (HEX_RE.test(v)) {
      picker.value = expand(v);
      err.textContent = '';
    } else {
      err.textContent = 'Enter a valid hex color (e.g. #1a73e8).';
    }
  });

  document.getElementById('btn-apply').addEventListener('click', () => {
    const v = hexInput.value.trim();
    if (!HEX_RE.test(v)) { err.textContent = 'Enter a valid hex color (e.g. #1a73e8).'; return; }
    vscode.postMessage({ command: 'apply', color: expand(v) });
  });

  document.getElementById('btn-cancel').addEventListener('click', () => {
    vscode.postMessage({ command: 'cancel' });
  });
</script>
</body>
</html>`;
}

export function promptForCustomColor(initialColor = peacockGreen): Promise<string | undefined> {
  const initial = sanitizeHexForColorInput(initialColor);
  const panel = vscode.window.createWebviewPanel(
    'peacock.customColorPicker',
    'Peacock — Custom Color',
    vscode.ViewColumn.Active,
    { enableScripts: true, retainContextWhenHidden: false },
  );
  panel.webview.html = getColorPickerHtml(initial);

  return new Promise(resolve => {
    let settled = false;
    const settle = (value?: string) => {
      if (settled) {
        return;
      }
      settled = true;
      panel.dispose();
      resolve(value);
    };

    panel.webview.onDidReceiveMessage((message: unknown) => {
      const parsed = parseColorPickerMessage(message);
      if (!parsed) {
        return;
      }
      if (parsed.command === 'cancel') {
        settle(undefined);
        return;
      }
      if (!parsed.color || !isHexColorInput(parsed.color)) {
        return;
      }
      const hex = expandShortHex(parsed.color);
      if (!isValidColorInput(hex)) {
        return;
      }
      settle(sanitizeHexForColorInput(hex));
    });

    panel.onDidDispose(() => settle(undefined));
  });
}

export const colorPickerApi = {
  promptForCustomColor,
};
