const extensionApi = typeof browser !== 'undefined' ? browser : chrome;
const tabsApi = extensionApi?.tabs;
const actionApi = extensionApi?.action ?? extensionApi?.browserAction;
const commandsApi = extensionApi?.commands;
const scriptingApi = extensionApi?.scripting;
const stylesUrl = extensionApi?.runtime?.getURL('css/styles.css') ?? '';
const isPromiseApi = typeof browser !== 'undefined' && typeof browser.storage !== 'undefined';

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

  getTitleOverrides((overrides) => {
    if (scriptingApi?.executeScript) {
      scriptingApi.executeScript({
        target: { tabId },
        func: copyToClipboard,
        args: [stylesUrl, overrides]
      });
      return;
    }

    if (tabsApi?.executeScript) {
      tabsApi.executeScript(tabId, {
        code: getLegacyInjectionSource(stylesUrl, overrides)
      });
      return;
    }

    console.error('Quick Share: no supported injection API available.');
  });
}

function getLegacyInjectionSource(cssPath, overrides) {
  return `(${copyToClipboard.toString()})(${JSON.stringify(cssPath)}, ${JSON.stringify(overrides)});`;
}

function copyToClipboard(cssPath, overrides = []) {
  const hostname = window.location.hostname;
  const overriddenTitle = applyTitleOverrides(document.title, hostname, overrides);
  const textToCopy = `[${overriddenTitle}](${window.location.href})`;

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

  function applyTitleOverrides(originalTitle, hostnameValue, overrideList) {
    if (!Array.isArray(overrideList) || overrideList.length === 0) {
      return originalTitle;
    }

    for (const override of overrideList) {
      const domain = typeof override?.domain === 'string' ? override.domain.trim() : '';
      const pattern = typeof override?.pattern === 'string' ? override.pattern : '';
      const replacement = typeof override?.replacement === 'string' ? override.replacement : '$&';

      if (!domain || !pattern) {
        continue;
      }

      if (!matchesDomain(hostnameValue, domain)) {
        continue;
      }

      try {
        const regex = new RegExp(pattern);
        if (regex.test(originalTitle)) {
          return originalTitle.replace(regex, replacement);
        }
      } catch (error) {
        console.warn('Quick Share: invalid title override regex', error);
      }
    }

    return originalTitle;
  }

  function matchesDomain(hostnameValue, domainRule) {
    const host = (hostnameValue ?? '').toLowerCase();
    const rule = (domainRule ?? '').toLowerCase();

    if (rule.startsWith('*.')) {
      const bareRule = rule.slice(2);
      return host === bareRule || host.endsWith(`.${bareRule}`);
    }

    return host === rule;
  }
}

function getTitleOverrides(callback) {
  const storageArea = getStorageArea();

  if (!storageArea) {
    callback([]);
    return;
  }

  const defaults = { titleOverrides: [] };

  if (isPromiseApi && typeof storageArea.get === 'function') {
    storageArea.get(defaults).then((items) => {
      callback(items?.titleOverrides ?? []);
    }).catch((error) => {
      console.error('Quick Share: failed to load overrides', error);
      callback([]);
    });
    return;
  }

  try {
    storageArea.get(defaults, (items) => {
      const lastError = extensionApi?.runtime?.lastError;
      if (lastError) {
        console.error('Quick Share: failed to load overrides', lastError);
        callback([]);
        return;
      }
      callback(items?.titleOverrides ?? []);
    });
  } catch (error) {
    console.error('Quick Share: failed to load overrides', error);
    callback([]);
  }
}

function getStorageArea() {
  const storage = extensionApi?.storage;
  if (!storage) {
    return null;
  }

  if (storage.sync) {
    return storage.sync;
  }

  if (storage.local) {
    return storage.local;
  }

  return null;
}

initQuickShare();
