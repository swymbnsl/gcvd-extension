// Popup script for the Chrome extension
document.addEventListener("DOMContentLoaded", () => {
  const videoCountEl = document.getElementById("video-count");
  const currentPageEl = document.getElementById("current-page");
  const statusEl = document.getElementById("status");
  const refreshBtn = document.getElementById("refresh-btn");

  function showUserError(msg) {
    alert(msg);
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

  updatePopup();
  setInterval(updatePopup, 2000);
});
