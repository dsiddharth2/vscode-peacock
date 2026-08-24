import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as assert from 'assert';
import {
  Commands,
  IPeacockSettings,
  azureBlue,
  customColorQuickPickLabel,
  peacockGreen,
  timeout,
} from '../../models';
import { setupTestSuite, teardownTestSuite, setupTest } from './lib/setup-teardown-test-suite';
import { executeCommand } from './lib/constants';
import { getEnvironmentAwareColor } from '../../configuration';
import {
  expandShortHex,
  getColorPickerHtml,
  isHexColorInput,
  parseColorPickerMessage,
  promptForCustomColor,
  sanitizeHexForColorInput,
} from '../../color-picker';
import { getFavoriteColorQuickPickMenu, isCustomColorQuickPickAction } from '../../inputs';

function stubCustomColorWebview() {
  let messageHandler: ((message: unknown) => unknown) | undefined;
  let disposeHandler: (() => void) | undefined;
  const panel = {
    webview: {
      html: '',
      onDidReceiveMessage: (handler: (message: unknown) => unknown) => {
        messageHandler = handler;
        return { dispose: () => undefined };
      },
    },
    onDidDispose: (handler: () => void) => {
      disposeHandler = handler;
      return { dispose: () => undefined };
    },
    dispose: sinon.spy(() => {
      if (disposeHandler) {
        disposeHandler();
      }
    }),
  };

  sinon.stub(vscode.window, 'createWebviewPanel').returns(panel as any);

  return {
    apply(color: string) {
      return Promise.resolve(messageHandler && messageHandler({ command: 'apply', color }));
    },
    cancel() {
      return Promise.resolve(messageHandler && messageHandler({ command: 'cancel' }));
    },
  };
}

suite('Custom color picker', () => {
  const originalValues = {} as IPeacockSettings;

  suiteSetup(async () => await setupTestSuite(originalValues));
  suiteTeardown(async () => await teardownTestSuite(originalValues));
  setup(async () => await setupTest());
  teardown(() => sinon.restore());

  test('favorite menu always includes Custom color…', () => {
    assert.deepEqual(getFavoriteColorQuickPickMenu(), [customColorQuickPickLabel]);
    const menu = getFavoriteColorQuickPickMenu([`Azure Blue -> ${azureBlue}`]);
    assert.equal(menu[menu.length - 1], customColorQuickPickLabel);
    assert.ok(isCustomColorQuickPickAction(customColorQuickPickLabel));
    assert.ok(!isCustomColorQuickPickAction(`Azure Blue -> ${azureBlue}`));
  });

  test('parses apply and cancel webview messages', () => {
    assert.deepEqual(parseColorPickerMessage({ command: 'apply', color: '#1a73e8' }), {
      command: 'apply',
      color: '#1a73e8',
    });
    assert.deepEqual(parseColorPickerMessage({ command: 'cancel' }), { command: 'cancel' });
    assert.equal(parseColorPickerMessage({ command: 'apply' }), undefined);
    assert.equal(parseColorPickerMessage({ type: 'apply', color: '#1a73e8' }), undefined);
  });

  test('accepts 3-digit and 6-digit hex and expands short values', () => {
    assert.ok(isHexColorInput('#1a73e8'));
    assert.ok(isHexColorInput('#639'));
    assert.ok(!isHexColorInput('not-a-color'));
    assert.equal(expandShortHex('#639'), '#663399');
    assert.equal(sanitizeHexForColorInput('not-a-color'), peacockGreen);
    assert.equal(sanitizeHexForColorInput('#00ff00'), '#00ff00');
  });

  test('custom color webview uses a color well and hex field', () => {
    const html = getColorPickerHtml('#112233');
    assert.ok(html.includes('type="color"'));
    assert.ok(html.includes('id="hex"'));
    assert.ok(html.includes('#112233'));
    assert.ok(html.includes('Custom Color'));
  });

  test('webview apply message returns the chosen hex', async () => {
    const webview = stubCustomColorWebview();
    const pending = promptForCustomColor('#111111');
    await timeout(20);
    await webview.apply('#abcdef');
    assert.equal(await pending, '#abcdef');
  });

  test('webview cancel message returns no color', async () => {
    const webview = stubCustomColorWebview();
    const pending = promptForCustomColor('#111111');
    await timeout(20);
    await webview.cancel();
    assert.equal(await pending, undefined);
  });

  test('Custom color… from favorites applies the picked hex', async () => {
    sinon.stub(vscode.window, 'showQuickPick').resolves(customColorQuickPickLabel as any);
    const webview = stubCustomColorWebview();

    const pending = executeCommand(Commands.changeColorToFavorite);
    await timeout(50);
    await webview.apply('#ff00aa');
    await pending;

    assert.equal(getEnvironmentAwareColor(), '#ff00aa');
  });

  test('cancelling Custom color… restores the previous color', async () => {
    await executeCommand(Commands.changeColorToPeacockGreen);
    sinon.stub(vscode.window, 'showQuickPick').resolves(customColorQuickPickLabel as any);
    const webview = stubCustomColorWebview();

    const pending = executeCommand(Commands.changeColorToFavorite);
    await timeout(50);
    await webview.cancel();
    await pending;

    assert.equal(getEnvironmentAwareColor(), peacockGreen);
  });
});
