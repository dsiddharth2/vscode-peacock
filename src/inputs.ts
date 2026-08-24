import * as vscode from 'vscode';
import { customColorQuickPickLabel, favoriteColorSeparator, peacockGreen } from './models';
import { getEnvironmentAwareColor, getFavoriteColors } from './configuration';
import { applyColor, unapplyColors } from './apply-color';
import { colorPickerApi } from './color-picker';

export function getFavoriteColorQuickPickMenu(favoriteMenu: string[] = []) {
  return [...favoriteMenu, customColorQuickPickLabel];
}

export function isCustomColorQuickPickAction(item: string) {
  return item === customColorQuickPickLabel;
}

export async function promptForColor() {
  const options: vscode.InputBoxOptions = {
    ignoreFocusOut: true,
    placeHolder: peacockGreen,
    prompt:
      'Enter a background color for the title bar in RGB hex format or a valid HTML color name',
    value: peacockGreen,
  };
  const inputColor = (await vscode.window.showInputBox(options)) || '';
  return inputColor.trim();
}

export async function promptForFavoriteColorName(color: string) {
  if (!color) {
    return;
  }
  const options: vscode.InputBoxOptions = {
    ignoreFocusOut: true,
    placeHolder: 'Mandalorian Blue',
    prompt: `Enter a name for the color ${color}`,
    value: '',
  };
  const inputName = await vscode.window.showInputBox(options);
  return inputName || '';
}

export async function promptForFavoriteColor() {
  const { menu, values: favoriteColors } = getFavoriteColors();
  const startingColor = getEnvironmentAwareColor();
  const items = getFavoriteColorQuickPickMenu(favoriteColors && favoriteColors.length ? menu : []);
  const options = {
    placeHolder: 'Pick a favorite color, or choose Custom color…',
    onDidSelectItem: tryColorWithPeacock(startingColor),
  };
  const selection = (await vscode.window.showQuickPick(items, options)) || '';
  if (!selection) {
    return '';
  }
  if (isCustomColorQuickPickAction(selection)) {
    return (await colorPickerApi.promptForCustomColor(startingColor || peacockGreen)) || '';
  }
  return parseFavoriteColorValue(selection) || '';
}

export function parseFavoriteColorValue(text: string) {
  const sep = favoriteColorSeparator;
  return text.substring(text.indexOf(sep) + sep.length + 1);
}

function tryColorWithPeacock(startingColor: string) {
  return async (item: string) => {
    if (isCustomColorQuickPickAction(item)) {
      if (startingColor) {
        return applyColor(startingColor);
      }
      return unapplyColors();
    }
    const color = parseFavoriteColorValue(item);
    return applyColor(color);
  };
}
