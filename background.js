let videoUrls = new Map();

// Removing all params from range onwards
function cleanVideoUrl(url) {
  try {
    const qIndex = url.indexOf('?');
    if (qIndex === -1) return url;

    const rangeIndex = url.indexOf('range=', qIndex);

    let cutIndex = rangeIndex !== -1 ? rangeIndex - 1 : -1;

    if (cutIndex !== -1) {
      return url.slice(0, cutIndex);
    }

    return url;
  } catch (error) {
    console.log("Error cleaning URL:", error);
    return url;
  }
}

// Function to process video URL
function processVideoUrl(url, tabId) {
  // Parse URL parameters
  const urlParams = new URLSearchParams(url.split("?")[1]);
  const itag = urlParams.get("itag");
  const mime = urlParams.get("mime") || "";
  const id = urlParams.get("id") || urlParams.get("driveid") || "unknown";

  // Determine if it's video or audio based on itag or mime
  let type = "unknown";
  if (mime.includes("video")) {
    type = "video";
  } else if (mime.includes("audio")) {
    type = "audio";
  } else if (itag) {
    const videoItags = ["137", "136", "135", "134", "133", "298", "299", "264", "267", "268"];
    const audioItags = ["140", "141", "251", "250", "249", "171", "172"];

    if (videoItags.includes(itag)) {
      type = "video";
    } else if (audioItags.includes(itag)) {
      type = "audio";
    }
  }

  // Clean the URL to get the full video/audio file
  const cleanUrl = cleanVideoUrl(url);
  
  const videoData = {
    url: cleanUrl,
    originalUrl: url,
    type: type,
    itag: itag,
    mime: mime,
    id: id,
    timestamp: Date.now(),
    tabId: tabId,
    range: urlParams.get("range") || "",
  };

  const key = `${id}_${type}_${itag}`;
  
  const existing = videoUrls.get(key);
  if (!existing) {
    videoUrls.set(key, videoData);

    // Send to content script
    chrome.tabs
      .sendMessage(tabId, {
        action: "videoUrlDetected",
        data: videoData,
      })
      .then(() => {
        console.log("Successfully sent video URL to content script");
      })
      .catch((error) => {
        console.log("Could not send to content script:", error);
        // Try to send to all tabs if specific tab fails
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.url && (tab.url.includes("classroom.google.com") || tab.url.includes("drive.google.com"))) {
              chrome.tabs.sendMessage(tab.id, {
                action: "videoUrlDetected",
                data: videoData,
              }).catch((err) => {
                console.log("Failed to send to tab", tab.id, err);
              });
            }
          });
        });
      });

    console.log("Detected video URL:", type, itag, cleanUrl);
  } else {
    console.log("Skipping duplicate URL:", key);
  }
}

// Listen for web requests to capture video URLs
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = details.url;

    if (
      url.includes("videoplayback") &&
      (url.includes("drive.google.com") ||
        url.includes("googlevideo.com") ||
        url.includes("c.drive.google.com") ||
        url.includes("sn-") ||
        url.includes("mime=video") ||
        url.includes("mime=audio"))
    ) {
      processVideoUrl(url, details.tabId);
    }

    return { cancel: false };
  },
  {
    urls: ["*://*/*videoplayback*"],
  },
  ["requestBody"]
);

function notifyUser(message) {
  if (chrome && chrome.notifications && chrome.notifications.create) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Google Classroom Video Downloader',
      message: message
    });
  } else {
    console.error("User notification:", message);
  }
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getVideoUrls") {
    const tabId = sender.tab?.id || request.tabId;
    const tabUrls = Array.from(videoUrls.values())
      .filter((data) => data.tabId === tabId)
      .sort((a, b) => b.timestamp - a.timestamp);
    sendResponse({ urls: tabUrls });
    return true;
  } else if (request.action === "clearUrls") {
    videoUrls.clear();
    sendResponse({ success: true });
    return true;
  } else if (request.action === "downloadVideo") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      let filename = `lecture_${request.type}_${Date.now()}`;
      if (currentTab && currentTab.title) {
        const cleanTitle = currentTab.title
          .replace(/[<>:"/\\|?*]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 50);
        if (cleanTitle) {
          filename = `${cleanTitle}_${request.type === 'video' ? 'Video' : 'Audio'}_${Date.now()}`;
        }
      }
      const extension = request.type === "video" ? "mp4" : "mp3";
      filename = `${filename}.${extension}`;
      chrome.downloads.download(
        {
          url: request.url,
          filename: filename,
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("Download failed", chrome.runtime.lastError);
            notifyUser("Failed to start download. Please try again.");
            sendResponse({
              success: false,
              error: "Download failed"
            });
          } else {
            sendResponse({ success: true, downloadId: downloadId });
          }
        }
      );
    });
    return true;
  } else if (request.action === "openVideoInNewTab") {
    chrome.tabs.create({ url: request.url }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("Failed to open video in new tab", chrome.runtime.lastError);
        notifyUser("Could not open video in new tab.");
        sendResponse({
          success: false,
          error: "Tab open failed"
        });
      } else {
        sendResponse({ success: true, tabId: tab.id });
      }
    });
    return true;
  }
});

// Clean up old URLs periodically (older than 1 hour)
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  for (let [key, data] of videoUrls.entries()) {
    if (now - data.timestamp > oneHour) {
      videoUrls.delete(key);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes
