import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sinon from 'sinon';
import {
  ColorSettings,
  Commands,
  IPeacockSettings,
  peacockGreen,
  pickAnyColorQuickPickLabel,
  enterColorQuickPickLabel,
} from '../../models';
import { isValidColorInput } from '../../color-library';
import { setupTestSuite, teardownTestSuite, setupTest } from './lib/setup-teardown-test-suite';
import { executeCommand } from './lib/constants';
import { getColorCustomizationConfig, getEnvironmentAwareColor } from '../../configuration';
import {
  buildColorPickerHtml,
  colorPickerApi,
  parseColorPickerMessage,
  sanitizeColorForPicker,
} from '../../color-picker';
import {
  getFavoriteColorQuickPickMenu,
  isFavoriteColorQuickPickAction,
  resolveFavoriteColorSelection,
} from '../../inputs';

suite('Pick any color', () => {
  const originalValues = {} as IPeacockSettings;

  suiteSetup(async () => await setupTestSuite(originalValues));
  suiteTeardown(async () => await teardownTestSuite(originalValues));
  setup(async () => await setupTest());
  teardown(() => sinon.restore());

  suite('Color picker helpers', () => {
    test('parses apply, preview, and cancel messages', () => {
      assert.deepEqual(parseColorPickerMessage({ type: 'apply', color: '#ff00aa' }), {
        type: 'apply',
        color: '#ff00aa',
      });
      assert.deepEqual(parseColorPickerMessage({ type: 'preview', color: '#123456' }), {
        type: 'preview',
        color: '#123456',
      });
      assert.deepEqual(parseColorPickerMessage({ type: 'cancel' }), { type: 'cancel' });
    });

    test('rejects unknown or incomplete picker messages', () => {
      assert.equal(parseColorPickerMessage(undefined), undefined);
      assert.equal(parseColorPickerMessage({ type: 'nope', color: '#ff0000' }), undefined);
      assert.equal(parseColorPickerMessage({ type: 'apply' }), undefined);
    });

    test('sanitizes invalid colors to peacock green', () => {
      assert.equal(sanitizeColorForPicker('not-a-color'), peacockGreen);
      assert.equal(sanitizeColorForPicker('#00ff00'), '#00ff00');
    });

    test('builds a full HSV picker instead of a limited native color input', () => {
      const html = buildColorPickerHtml('#112233', 'testnonce');
      assert.ok(html.includes('id="sv-box"'));
      assert.ok(html.includes('id="hue-bar"'));
      assert.ok(html.includes('#112233'));
      assert.ok(html.includes('Pick any color'));
      assert.ok(!html.includes('type="color"'));
    });

    test('favorite color menu always includes pick-any and enter-color actions', () => {
      const emptyMenu = getFavoriteColorQuickPickMenu();
      assert.deepEqual(emptyMenu, [pickAnyColorQuickPickLabel, enterColorQuickPickLabel]);

      const menu = getFavoriteColorQuickPickMenu(['Azure Blue -> #007fff']);
      assert.equal(menu[0], pickAnyColorQuickPickLabel);
      assert.equal(menu[1], enterColorQuickPickLabel);
      assert.ok(menu.includes('Azure Blue -> #007fff'));
      assert.ok(isFavoriteColorQuickPickAction(pickAnyColorQuickPickLabel));
      assert.ok(isFavoriteColorQuickPickAction(enterColorQuickPickLabel));
      assert.ok(!isFavoriteColorQuickPickAction('Azure Blue -> #007fff'));
    });
  });

  suite('Pick a Color command', () => {
    test('can set any color using command parameters programmatically', async () => {
      await executeCommand(Commands.pickColor, '#c0ffee');
      const config = getColorCustomizationConfig();
      const value = config[ColorSettings.titleBar_activeBackground];
      assert.equal(value, '#c0ffee');
    });

    test('cannot set an invalid color using command parameters programmatically', async () => {
      await executeCommand(Commands.changeColorToPeacockGreen);
      await assert.rejects(async () => await executeCommand(Commands.pickColor, 'invalid'), Error);
      const color = getEnvironmentAwareColor();
      assert.equal(color, peacockGreen);
    });

    test('applies a color returned by the visual picker', async () => {
      const stub = sinon.stub(colorPickerApi, 'promptForColorPicker').resolves('#ff00aa');
      await executeCommand(Commands.pickColor);
      stub.restore();
      assert.equal(getEnvironmentAwareColor(), '#ff00aa');
    });

    test('restores the previous color when the picker is cancelled', async () => {
      await executeCommand(Commands.changeColorToPeacockGreen);
      const stub = sinon.stub(colorPickerApi, 'promptForColorPicker').resolves(undefined);
      await executeCommand(Commands.pickColor);
      stub.restore();
      assert.equal(getEnvironmentAwareColor(), peacockGreen);
    });
  });

  suite('Favorite color menu actions', () => {
    test('pick any color from the favorite menu applies a custom color', async () => {
      const pickerStub = sinon.stub(colorPickerApi, 'promptForColorPicker').resolves('#abcdef');
      const quickPickStub = sinon
        .stub(vscode.window, 'showQuickPick')
        .resolves(pickAnyColorQuickPickLabel as any);

      await executeCommand(Commands.changeColorToFavorite);

      pickerStub.restore();
      quickPickStub.restore();
      assert.equal(getEnvironmentAwareColor(), '#abcdef');
    });

    test('enter a color from the favorite menu applies a typed color', async () => {
      const quickPickStub = sinon
        .stub(vscode.window, 'showQuickPick')
        .resolves(enterColorQuickPickLabel as any);
      const inputStub = sinon.stub(vscode.window, 'showInputBox').resolves('#fedcba');

      await executeCommand(Commands.changeColorToFavorite);

      quickPickStub.restore();
      inputStub.restore();
      assert.equal(getEnvironmentAwareColor(), '#fedcba');
    });

    test('resolveFavoriteColorSelection routes pick-any to the color picker', async () => {
      const stub = sinon.stub(colorPickerApi, 'promptForColorPicker').resolves('#010203');
      const color = await resolveFavoriteColorSelection(pickAnyColorQuickPickLabel);
      stub.restore();
      assert.equal(color, '#010203');
      assert.ok(isValidColorInput(color));
    });
  });
});
