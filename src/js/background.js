const extensionApi = typeof browser !== 'undefined' ? browser : chrome;
const tabsApi = extensionApi?.tabs;
const actionApi = extensionApi?.action ?? extensionApi?.browserAction;
const commandsApi = extensionApi?.commands;
const scriptingApi = extensionApi?.scripting;
const stylesUrl = extensionApi?.runtime?.getURL('css/styles.css') ?? '';

function initQuickShare() {
  if (actionApi?.onClicked) {
    actionApi.onClicked.addListener((tab) => {
      if (tab?.id != null) {
        injectCopy(tab.id);
      } else {
        withActiveTab((activeTabId) => injectCopy(activeTabId));
      }
    });
  }

  if (commandsApi?.onCommand) {
    commandsApi.onCommand.addListener((command) => {
      if (command === 'general') {
        withActiveTab((activeTabId) => injectCopy(activeTabId));
      }
    });
  }
}

function withActiveTab(callback) {
  if (!tabsApi?.query) {
    return;
  }

  tabsApi.query({ active: true, currentWindow: true }, (tabs) => {
    const [activeTab] = tabs ?? [];
    if (activeTab?.id != null) {
      callback(activeTab.id);
    }
  });
}

function injectCopy(tabId) {
  if (tabId == null) {
    return;
  }

  if (scriptingApi?.executeScript) {
    scriptingApi.executeScript({
      target: { tabId },
      func: copyToClipboard,
      args: [stylesUrl]
    });
    return;
  }

  if (tabsApi?.executeScript) {
    tabsApi.executeScript(tabId, {
      code: getLegacyInjectionSource(stylesUrl)
    });
    return;
  }

  console.error('Quick Share: no supported injection API available.');
}

function getLegacyInjectionSource(cssPath) {
  return `(${copyToClipboard.toString()})(${JSON.stringify(cssPath)});`;
}

function copyToClipboard(cssPath) {
  const textToCopy = `[${document.title}](${window.location.href})`;

  navigator.clipboard.writeText(textToCopy).then(() => {
    showCopiedText({
      textToCopy: `Copy succeeded:\n\n${textToCopy}`,
      succeeded: true,
      interval: 1000,
      cssPath
    });
  }).catch((error) => {
    showCopiedText({
      textToCopy: `Copy failed:\n\n${error}\n\n${textToCopy}`,
      succeeded: false,
      interval: 5000,
      cssPath
    });
  });

  function showCopiedText({ textToCopy, succeeded, interval, cssPath }) {
    let linkElement;
    if (cssPath) {
      linkElement = document.createElement('link');
      linkElement.rel = 'stylesheet';
      linkElement.type = 'text/css';
      linkElement.href = cssPath;
      document.head.appendChild(linkElement);
    }

    const textElement = document.createElement('div');
    textElement.id = succeeded ? 'copied-text' : 'copied-text-err';
    textElement.innerText = textToCopy;
    document.body.appendChild(textElement);

    setTimeout(() => {
      textElement.remove();
      if (linkElement) {
        linkElement.remove();
      }
    }, interval);
  }
}

initQuickShare();
