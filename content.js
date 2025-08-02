let downloadButton = null;
let detectedUrls = [];
let isVideoPlaying = false;

function injectScript() {
  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.js");
    script.onload = function () {
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  } catch (error) {
    console.error("Script injection failed", error);
    showNotification("Failed to initialize video detection. Please refresh the page.", "error");
  }
}

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data.type === "INJECTED_SCRIPT_READY") {
    // Ready
  } else if (event.data.type === "VIDEO_EVENT") {
    if (event.data.event === "play" || event.data.event === "playing") {
      if (!downloadButton) {
        try {
          createDownloadButton();
        } catch (error) {
          console.error("Failed to create download button", error);
          showNotification("Failed to show video button.", "error");
        }
      }
      if (downloadButton) downloadButton.style.display = "block";
      isVideoPlaying = true;
      requestVideoUrls();
    }
  }
});

function requestVideoUrls() {
  chrome.runtime.sendMessage(
    {
      action: "getVideoUrls",
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error("Failed to get video URLs", chrome.runtime.lastError);
        showNotification("Failed to detect videos. Please refresh the page.", "error");
        return;
      }
      if (response && response.urls) {
        detectedUrls = response.urls;
        updateButtonCount();
        updateDownloadList();
        if (detectedUrls.length > 0 && !downloadButton) {
          try {
            createDownloadButton();
          } catch (error) {
            console.error("Failed to create download button", error);
            showNotification("Failed to show video button.", "error");
          }
        }
      }
    }
  );
}

function createDownloadButton() {
  if (downloadButton) return;
  downloadButton = document.createElement("div");
  downloadButton.id = "gcd-download-btn";
  downloadButton.innerHTML = `
    <div class="gcd-button">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 15V3"/>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <path d="m7 10 5 5 5-5"/>
      </svg>
      <span>Download Video</span>
      <div class="gcd-count">${detectedUrls.length}</div>
    </div>
    <div class="gcd-dropdown" id="gcd-dropdown">
      <div class="gcd-header">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        Available Videos
      </div>
      <div class="gcd-list" id="gcd-list"></div>
      <div class="gcd-footer">
        <button id="gcd-refresh">Refresh</button>
        <button id="gcd-clear">Clear All</button>
      </div>
    </div>
  `;
  downloadButton.style.cssText = "position: fixed; top: 20px; right: 20px; z-index: 10000;";
  document.body.appendChild(downloadButton);
  try {
    const button = downloadButton.querySelector(".gcd-button");
    const dropdown = downloadButton.querySelector(".gcd-dropdown");
    button.addEventListener("click", () => {
      dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
      if (dropdown.style.display === "block") {
        updateDownloadList();
      }
    });
    document.addEventListener("click", (e) => {
      if (!downloadButton.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
    downloadButton.querySelector("#gcd-refresh").addEventListener("click", () => {
      requestVideoUrls();
    });
    downloadButton.querySelector("#gcd-clear").addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "clearUrls" }, () => {
        detectedUrls = [];
        updateDownloadList();
        updateButtonCount();
      });
    });
  } catch (error) {
    console.error("Failed to initialize button events", error);
    showNotification("Failed to initialize video button.", "error");
  }
}

function updateDownloadList() {
  const list = document.getElementById("gcd-list");
  if (!list) return;

  list.innerHTML = "";

  if (detectedUrls.length === 0) {
    list.innerHTML =
      '<div class="gcd-empty">No videos detected yet. Play a video first.</div>';
    return;
  }

  const grouped = {};
  detectedUrls.forEach((url) => {
    if (!grouped[url.id]) {
      grouped[url.id] = { video: [], audio: [] };
    }
    if (url.type === "video") {
      grouped[url.id].video.push(url);
    } else if (url.type === "audio") {
      grouped[url.id].audio.push(url);
    }
  });

  Object.keys(grouped).forEach((id) => {
    const group = grouped[id];
    const groupDiv = document.createElement("div");
    groupDiv.className = "gcd-group";

    const header = document.createElement("div");
    header.className = "gcd-group-header";
    header.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
      </svg>
      Video ID: ${id.substring(0, 10)}...
    `;
    groupDiv.appendChild(header);

    if (group.video.length > 0) {
      const videoHeader = document.createElement("div");
      videoHeader.className = "gcd-stream-header";
      videoHeader.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m22 8-6 4 6 4V8Z"/>
          <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
        </svg>
        Video Streams:
      `;
      groupDiv.appendChild(videoHeader);

      group.video.forEach((url) => {
        const item = createDownloadItem(url);
        groupDiv.appendChild(item);
      });
    }

    if (group.audio.length > 0) {
      const audioHeader = document.createElement("div");
      audioHeader.className = "gcd-stream-header";
      audioHeader.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        Audio Streams:
      `;
      groupDiv.appendChild(audioHeader);

      group.audio.forEach((url) => {
        const item = createDownloadItem(url);
        groupDiv.appendChild(item);
      });
    }

    list.appendChild(groupDiv);
  });
}

function createDownloadItem(urlData) {
  const item = document.createElement("div");
  item.className = "gcd-item";

  const quality = getQualityFromItag(urlData.itag);
  const size = urlData.mime.includes("video") ? "Video" : "Audio";
  const isVideo = urlData.mime.includes("video");

  item.innerHTML = `
    <div class="gcd-item-info">
      <div class="gcd-item-type">
        ${isVideo ? 
          `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m22 8-6 4 6 4V8Z"/>
            <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
          </svg>` : 
          `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>`
        }
        ${size} - ${quality}
      </div>
    </div>
    <div class="gcd-buttons">
      <button class="gcd-open-btn" data-url="${urlData.url}" data-type="${urlData.type}">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15,3 21,3 21,9"/>
          <line x1="10" x2="21" y1="14" y2="3"/>
        </svg>
        Open
      </button>
      <button class="gcd-download-btn" data-url="${urlData.url}" data-type="${urlData.type}">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 15V3"/>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <path d="m7 10 5 5 5-5"/>
        </svg>
        Download
      </button>
    </div>
  `;

  item
    .querySelector(".gcd-open-btn")
    .addEventListener("click", (e) => {
      e.preventDefault();
      openVideo(urlData.url, urlData.type);
    });

  item
    .querySelector(".gcd-download-btn")
    .addEventListener("click", (e) => {
      e.preventDefault();
      downloadVideo(urlData.url, urlData.type);
    });

  return item;
}

function getQualityFromItag(itag) {
  const qualities = {
    137: "1080p",
    136: "720p",
    135: "480p",
    134: "360p",
    133: "240p",
    140: "128kbps AAC",
    141: "256kbps AAC",
    251: "WebM Audio",
    298: "720p60",
    299: "1080p60",
  };
  return qualities[itag] || `Quality ${itag}`;
}

function openVideo(url, type) {
  chrome.runtime.sendMessage({
    action: "openVideoInNewTab",
    url: url,
    type: type
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Failed to open video in new tab", chrome.runtime.lastError);
      showNotification("Could not open video in new tab.", "error");
    } else if (response && response.success) {
      showNotification("Video opened in new tab!", "success");
    } else {
      showNotification("Could not open video in new tab.", "error");
    }
  });
}

function downloadVideo(url, type) {
  chrome.runtime.sendMessage({
    action: "downloadVideo",
    url: url,
    type: type
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Failed to download video", chrome.runtime.lastError);
      showNotification("Failed to download video.", "error");
    } else if (response && response.success) {
      showNotification("Download started!", "success");
    } else {
      showNotification("Failed to download video.", "error");
    }
  });
}

function showNotification(message, type) {
  const notification = document.createElement("div");
  notification.className = `gcd-notification gcd-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

function updateButtonCount() {
  if (downloadButton) {
    const count = downloadButton.querySelector(".gcd-count");
    count.textContent = detectedUrls.length;
    count.style.display = detectedUrls.length > 0 ? "flex" : "none";
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "videoUrlDetected") {
    const existingIndex = detectedUrls.findIndex(url => 
      url.id === request.data.id && 
      url.type === request.data.type && 
      url.itag === request.data.itag
    );
    
    if (existingIndex !== -1) {
      detectedUrls[existingIndex] = request.data;
    } else {
      detectedUrls.unshift(request.data);
    }
    
    if (detectedUrls.length > 50) {
      detectedUrls = detectedUrls.slice(0, 50);
    }
    
    if (!downloadButton && detectedUrls.length > 0) {
      try {
        createDownloadButton();
      } catch (error) {
        console.error("Failed to create download button on message", error);
        showNotification("Failed to show video button.", "error");
      }
    }
    
    updateButtonCount();
    updateDownloadList();
    sendResponse({ received: true });
  } else if (request.action === "refresh") {
    requestVideoUrls();
    sendResponse({ refreshed: true });
  }
  return true;
});

function checkIfVideoPage() {
  const url = window.location.href;
  
  if (url.includes("videoplayback")) {
    addVideoPageDownloadButton();
  }
}

function addVideoPageDownloadButton() {
  const videoDownloadBtn = document.createElement("div");
  videoDownloadBtn.id = "gcd-video-page-btn";
  videoDownloadBtn.innerHTML = `
    <button class="gcd-video-download-btn">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 15V3"/>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <path d="m7 10 5 5 5-5"/>
      </svg>
      Download Video
    </button>
  `;
  videoDownloadBtn.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 10000; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);`;
  document.body.appendChild(videoDownloadBtn);
  try {
    videoDownloadBtn.querySelector(".gcd-video-download-btn").addEventListener("click", () => {
      downloadCurrentVideo();
    });
  } catch (error) {
    console.error("Failed to initialize video page download button", error);
    showNotification("Failed to show download button.", "error");
  }
}

function downloadCurrentVideo() {
  try {
    const url = window.location.href;
    const filename = `video_${Date.now()}.mp4`;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Download started!", "success");
  } catch (error) {
    console.error("Failed to download current video", error);
    showNotification("Failed to download video.", "error");
  }
}

function detectVideoPlayback() {
  const videos = document.querySelectorAll("video");
  let hasPlayingVideo = false;

  videos.forEach((video) => {
    if (!video.paused && !video.ended) {
      hasPlayingVideo = true;
    }
  });

  if (videos.length > 0) {
    hasPlayingVideo = true;
  }

  if (hasPlayingVideo && !isVideoPlaying) {
    isVideoPlaying = true;
    if (!downloadButton) {
      try {
        createDownloadButton();
      } catch (error) {
        console.error("Failed to create download button on playback", error);
        showNotification("Failed to show video button.", "error");
      }
    }
    if (downloadButton) downloadButton.style.display = "block";
    requestVideoUrls();
  } else if (!hasPlayingVideo && isVideoPlaying) {
    isVideoPlaying = false;
  }
}

function init() {
  injectScript();
  
  setInterval(detectVideoPlayback, 2000);

  setTimeout(() => {
    detectVideoPlayback();
  }, 3000);

  requestVideoUrls();
  
  setTimeout(() => {
    const videos = document.querySelectorAll("video");
    if (videos.length > 0) {
      if (!downloadButton) {
        try {
          createDownloadButton();
        } catch (error) {
          console.error("Failed to create download button on init", error);
          showNotification("Failed to show video button.", "error");
        }
      }
      requestVideoUrls();
    }
  }, 1000);

  checkIfVideoPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
