const extensionApi = typeof browser !== 'undefined' ? browser : chrome;
const storageArea = getStorageArea();

document.addEventListener('DOMContentLoaded', () => {
  initOptionsPage();
});

function initOptionsPage() {
  document.getElementById('add-rule').addEventListener('click', () => addRule());
  document.getElementById('options-form').addEventListener('submit', handleSave);

  loadRules();
}

function loadRules() {
  getStoredRules().then((rules) => {
    const container = document.getElementById('rules-container');
    container.innerHTML = '';

    if (!rules.length) {
      addRule();
      return;
    }

    rules.forEach((rule) => addRule(rule));
  }).catch((error) => {
    showStatus(`Failed to load rules: ${error?.message ?? error}`, true);
    addRule();
  });
}

function handleSave(event) {
  event.preventDefault();
  const rules = collectRules();

  saveRules(rules).then(() => {
    showStatus('Saved!', false);
  }).catch((error) => {
    showStatus(`Failed to save: ${error?.message ?? error}`, true);
  });
}

function collectRules() {
  const rows = Array.from(document.querySelectorAll('.rule'));
  return rows
    .map((row) => ({
      domain: row.querySelector('input[name="domain"]').value.trim(),
      pattern: row.querySelector('input[name="pattern"]').value.trim(),
      replacement: row.querySelector('input[name="replacement"]').value,
      description: row.querySelector('input[name="description"]').value.trim()
    }))
    .filter((rule) => rule.domain && rule.pattern);
}

function addRule(initialData = {}) {
  const template = document.getElementById('rule-template');
  const fragment = template.content.cloneNode(true);
  const ruleElement = fragment.querySelector('.rule');

  ruleElement.querySelector('input[name="domain"]').value = initialData.domain ?? '';
  ruleElement.querySelector('input[name="pattern"]').value = initialData.pattern ?? '';
  ruleElement.querySelector('input[name="replacement"]').value = initialData.replacement ?? '';
  ruleElement.querySelector('input[name="description"]').value = initialData.description ?? '';

  ruleElement.querySelector('.remove').addEventListener('click', () => {
    ruleElement.remove();
    if (!document.querySelector('.rule')) {
      addRule();
    }
  });

  document.getElementById('rules-container').appendChild(fragment);
}

function getStoredRules() {
  if (!storageArea) {
    return Promise.resolve([]);
  }

  if (typeof storageArea.get === 'function' && storageArea.get.length <= 1) {
    return storageArea.get({ titleOverrides: [] }).then((items) => items.titleOverrides ?? []);
  }

  return new Promise((resolve, reject) => {
    storageArea.get({ titleOverrides: [] }, (items) => {
      const lastError = extensionApi?.runtime?.lastError;
      if (lastError) {
        reject(lastError);
        return;
      }
      resolve(items?.titleOverrides ?? []);
    });
  });
}

function saveRules(rules) {
  if (!storageArea) {
    return Promise.reject(new Error('Storage permission unavailable.'));
  }

  const payload = { titleOverrides: rules };

  if (typeof storageArea.set === 'function' && storageArea.set.length <= 1) {
    return storageArea.set(payload);
  }

  return new Promise((resolve, reject) => {
    storageArea.set(payload, () => {
      const lastError = extensionApi?.runtime?.lastError;
      if (lastError) {
        reject(lastError);
        return;
      }
      resolve();
    });
  });
}

function showStatus(message, isError) {
  const el = document.getElementById('status');
  el.textContent = message;
  el.style.color = isError ? '#b00020' : '#047857';
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
