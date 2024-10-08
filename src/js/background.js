function mainV3() {
  chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: copyToClipboard
    });
  });
}

// For v2
function main() {
  const copyToClipboardAsString = `(${copyToClipboard.toString()})();`;

  // this doesn't work if "commands" in manifest.json is enabled
  // chrome.browserAction.onClicked.addListener((tab) => {
  //   chrome.tabs.executeScript(
  //     tab.id,
  //     { code: copyToClipboardAsString }
  //   )
  // })

  chrome.commands.onCommand.addListener((command) => {
    if (command === "general") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        chrome.tabs.executeScript(
          { code: copyToClipboardAsString }
        )
      })
    }
  })
}

function copyToClipboard() {
  const textToCopy = `[${document.title}](${window.location.href})`;

  // copy to the clipboard
  navigator.clipboard.writeText(textToCopy).then(() => {
    showCopiedText({ textToCopy: `Copy succeeded:\n\n${textToCopy}`, succeeded: true, interval: 1000 })
  }).catch((error) => {
    showCopiedText({ textToCopy: `Copy failed:\n\n${error}\n\n${textToCopy}`, succeeded: false, interval: 5000 })
  });

  function showCopiedText({ textToCopy, succeeded, interval }) {
    // load CSS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.type = 'text/css';
    linkElement.href = chrome.runtime.getURL('css/styles.css');
    document.head.appendChild(linkElement);

    // display the text
    const textElement = document.createElement('div');
    textElement.id = succeeded ? 'copied-text' : 'copied-text-err';
    textElement.innerText = textToCopy;

    document.body.appendChild(textElement);

    setTimeout(() => {
      textElement.remove();
      linkElement.remove();
    }, interval);
  }
}

main();
