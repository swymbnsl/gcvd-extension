// Popup script for the Chrome extension
document.addEventListener("DOMContentLoaded", () => {
  const videoCountEl = document.getElementById("video-count");
  const currentPageEl = document.getElementById("current-page");
  const statusEl = document.getElementById("status");
  const refreshBtn = document.getElementById("refresh-btn");
  const aria2UrlInput = document.getElementById('aria2-url');
  const aria2TokenInput = document.getElementById('aria2-token');
  const saveAria2Btn = document.getElementById('save-aria2');

  function showUserError(msg) {
    alert(msg);
  }

  function loadAria2Settings() {
    try {
      chrome.storage.sync.get(['aria2Url', 'aria2Token'], (res) => {
        if (aria2UrlInput) aria2UrlInput.value = res.aria2Url || 'http://127.0.0.1:6800/jsonrpc';
        if (aria2TokenInput) aria2TokenInput.value = res.aria2Token || '';
      });
    } catch (e) {}
  }

  function saveAria2Settings() {
    const aria2Url = aria2UrlInput?.value?.trim() || '';
    const aria2Token = aria2TokenInput?.value?.trim() || '';
    try {
      chrome.storage.sync.set({ aria2Url, aria2Token }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to save aria2 settings', chrome.runtime.lastError);
          showUserError('Failed to save settings.');
        } else {
          alert('Aria2 settings saved');
        }
      });
    } catch (e) {
      showUserError('Failed to save settings.');
    }
  }

  function updatePopup() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Failed to get current tab", chrome.runtime.lastError);
        showUserError("Could not get current tab. Please try again.");
        return;
      }
      if (tabs[0]) {
        const tab = tabs[0];
        let url;
        try {
          url = new URL(tab.url);
        } catch (e) {
          url = { hostname: "" };
        }
        if (url.hostname.includes("classroom.google.com")) {
          currentPageEl.textContent = "Google Classroom";
          statusEl.textContent = "Active";
        } else if (url.hostname.includes("drive.google.com")) {
          currentPageEl.textContent = "Google Drive";
          statusEl.textContent = "Active";
        } else {
          currentPageEl.textContent = "Other Page";
          statusEl.textContent = "Inactive";
        }
        chrome.runtime.sendMessage(
          {
            action: "getVideoUrls",
            tabId: tab.id,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("Failed to get video URLs", chrome.runtime.lastError);
              showUserError("Could not get video count. Please try again.");
              return;
            }
            if (response && response.urls) {
              videoCountEl.textContent = response.urls.length;
              if (response.urls.length > 0) {
                statusEl.textContent = "Videos Detected";
              }
            } else {
              videoCountEl.textContent = "0";
            }
          }
        );
      }
    });
  }

  refreshBtn.addEventListener("click", () => {
    refreshBtn.textContent = "Refreshing...";
    refreshBtn.disabled = true;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.error("Failed to get current tab for refresh", chrome.runtime.lastError);
        showUserError("Could not refresh. Please try again.");
        refreshBtn.textContent = "Refresh Detection";
        refreshBtn.disabled = false;
        return;
      }
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "refresh" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error("Failed to refresh content script", chrome.runtime.lastError);
              showUserError("Could not refresh detection. Please try again.");
            }
            setTimeout(() => {
              updatePopup();
              refreshBtn.textContent = "Refresh Detection";
              refreshBtn.disabled = false;
            }, 1000);
          }
        );
      }
    });
  });

  if (saveAria2Btn) {
    saveAria2Btn.addEventListener('click', saveAria2Settings);
  }

  loadAria2Settings();
  updatePopup();
  setInterval(updatePopup, 2000);
});
