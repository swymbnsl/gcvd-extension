let videoUrls = new Map();

// Map original request URL to last seen request headers for that URL
let urlToHeaders = new Map();

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
    return url;
  }
}

function normalizeHeadersArray(headersArray) {
  try {
    if (!Array.isArray(headersArray)) return [];
    // Deduplicate by header name, keep last seen (closest to actual send)
    const map = new Map();
    headersArray.forEach(h => {
      if (!h || typeof h.name !== 'string') return;
      map.set(h.name.toLowerCase(), h.value ?? '');
    });
    const entries = Array.from(map.entries());
    // Remove Range header as we are downloading full file
    return entries
      .filter(([name]) => name !== 'range')
      .map(([name, value]) => ({ name, value }));
  } catch (e) {
    return [];
  }
}

function headersToAria2HeaderList(headers) {
  return headers.map(h => `${h.name}: ${h.value}`);
}

function buildCurlCommandForVideo(videoData) {
  try {
    const headers = videoData.requestHeaders || [];
    // Find UA separately for readability
    const ua = headers.find(h => h.name === 'user-agent')?.value || '';
    const headerFlags = headers
      .filter(h => h.name !== 'user-agent')
      .map(h => `--header "${h.name}: ${h.value.replace(/"/g, '\\"')}"`) // escape quotes
      .join(' ');
    const uaFlag = ua ? `--user-agent "${ua.replace(/"/g, '\\"')}"` : '';
    // Default output name
    const defaultOut = `${videoData.id}_${videoData.type || 'media'}_${videoData.itag || 'itag'}.mp4`;
    const outFlag = `-o "${defaultOut}"`;
    const url = videoData.url || videoData.originalUrl;
    return `aria2c --max-connection-per-server=16 --split=16 --min-split-size=1M --continue=true --max-download-limit=0 --timeout=60 --retry-wait=3 --max-tries=5 ${uaFlag} ${headerFlags} ${outFlag} "${url}"`.replace(/\s+/g, ' ').trim();
  } catch (e) {
    return '';
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
    requestHeaders: [],
    method: 'GET'
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
        // Successfully sent
      })
      .catch((error) => {
        // Try to send to all tabs if specific tab fails
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.url && (tab.url.includes("classroom.google.com") || tab.url.includes("drive.google.com"))) {
              chrome.tabs.sendMessage(tab.id, {
                action: "videoUrlDetected",
                data: videoData,
              }).catch((err) => {
                // Silent error handling
              });
            }
          });
        });
      });
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

// Capture request headers for videoplayback to build curl/aria2 headers
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    try {
      const norm = normalizeHeadersArray(details.requestHeaders || []);
      urlToHeaders.set(details.url, norm);

      // Try to match existing entry and augment it with headers
      const urlParams = new URLSearchParams(details.url.split('?')[1] || '');
      const itag = urlParams.get('itag');
      const id = urlParams.get('id') || urlParams.get('driveid') || 'unknown';
      const mime = urlParams.get('mime') || '';
      let type = 'unknown';
      if (mime.includes('video')) type = 'video';
      else if (mime.includes('audio')) type = 'audio';

      const key = `${id}_${type}_${itag}`;
      const existing = videoUrls.get(key);
      if (existing) {
        existing.requestHeaders = norm;
        existing.method = details.method || 'GET';
        videoUrls.set(key, existing);
        // Notify content script that data updated (non-intrusive)
        try {
          chrome.tabs.sendMessage(existing.tabId, { action: 'videoUrlDetected', data: existing }).catch(() => {});
        } catch (e) {}
      }
    } catch (e) {
      // Silent error handling
    }
  },
  { urls: ["*://*/*videoplayback*"] },
  ["requestHeaders", "extraHeaders"]
);

function notifyUser(message) {
  if (chrome && chrome.notifications && chrome.notifications.create) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Google Classroom Video Downloader',
      message: message
    });
  }
}

async function getAria2Settings() {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get(['aria2Url', 'aria2Token'], (res) => {
        resolve({ aria2Url: res.aria2Url || '', aria2Token: res.aria2Token || '' });
      });
    } catch (e) {
      resolve({ aria2Url: '', aria2Token: '' });
    }
  });
}

async function sendToAria2(videoKey, preferredFilename) {
  const entry = videoUrls.get(videoKey);
  if (!entry) {
    throw new Error('Video entry not found');
  }
  const { aria2Url, aria2Token } = await getAria2Settings();
  if (!aria2Url) {
    throw new Error('Aria2 RPC URL not configured');
  }

  // Build aria2 options with optimal settings for fastest download
  const headers = entry.requestHeaders || [];
  const headerList = headersToAria2HeaderList(headers);
  const ua = headers.find(h => h.name === 'user-agent')?.value;

  // Compute filename - ensure it's properly formatted
  let filename = preferredFilename;
  if (!filename) {
    // Try to build a contextual filename, similar to downloadVideo
    filename = `lecture_${entry.type}_${Date.now()}.${entry.type === 'video' ? 'mp4' : 'mp3'}`;
  }
  
  // Ensure filename has proper extension
  if (!filename.includes('.')) {
    const extension = entry.type === 'video' ? 'mp4' : 'mp3';
    filename = `${filename}.${extension}`;
  }
  
  // Clean filename of any invalid characters
  filename = filename.replace(/[<>:"/\\|?*]/g, '_');

  const options = {
    out: filename,
    // Alternative: try using filename parameter as well
    filename: filename,
    header: headerList,
    'max-connection-per-server': '16',
    'max-concurrent-downloads': '16',
    split: '16',
    'min-split-size': '1M',
    'max-split-size': '0',
    continue: 'true',
    timeout: '60',
    'retry-wait': '3',
    'max-tries': '5',
    'lowest-speed-limit': '0',
    'max-download-limit': '0',
    'max-overall-download-limit': '0',
    'file-allocation': 'none',
    'disk-cache': '32M',
    'enable-http-pipelining': 'true'
  };
  if (ua) options['user-agent'] = ua;

  const params = [];
  if (aria2Token) params.push(`token:${aria2Token}`);
  params.push([entry.url]);
  params.push(options);

  const body = {
    jsonrpc: '2.0',
    id: Math.random().toString(36).slice(2),
    method: 'aria2.addUri',
    params
  };

  const response = await fetch(aria2Url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Aria2 RPC HTTP ${response.status}`);
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Aria2 RPC error');
  }
  return data.result || true;
}

function computeSuggestedFilenameFromTab(type) {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      let filename = `lecture_${type}_${Date.now()}`;
      if (currentTab && currentTab.title) {
        const cleanTitle = currentTab.title
          .replace(/[<>:"/\\|?*]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 50);
        if (cleanTitle) {
          filename = `${cleanTitle}_${type === 'video' ? 'Video' : 'Audio'}_${Date.now()}`;
        }
      }
      const extension = type === 'video' ? 'mp4' : 'mp3';
      resolve(`${filename}.${extension}`);
    });
  });
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
      let filename = request.customFilename; // Use custom filename if provided
      
      if (!filename) {
        // Fall back to default naming
        filename = `lecture_${request.type}_${Date.now()}`;
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
      }
      
      chrome.downloads.download(
        {
          url: request.url,
          filename: filename,
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
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
  } else if (request.action === 'sendToAria2') {
    (async () => {
      try {
        const key = `${request.id}_${request.type}_${request.itag}`;
        
        let preferred = request.filename;
        
        if (!preferred) {
          preferred = await computeSuggestedFilenameFromTab(request.type);
        }
        
        const result = await sendToAria2(key, preferred);
        
        notifyUser('Sent to aria2. Download started.');
        sendResponse({ success: true, result });
      } catch (e) {
        notifyUser(`Aria2 error: ${e.message}`);
        sendResponse({ success: false, error: e.message });
      }
    })();
    return true;
  } else if (request.action === 'getCurlForItem') {
    try {
      const key = `${request.id}_${request.type}_${request.itag}`;
      const entry = videoUrls.get(key);
      if (!entry) {
        sendResponse({ success: false, error: 'Not found' });
      } else {
        const cmd = buildCurlCommandForVideo(entry);
        sendResponse({ success: true, command: cmd });
      }
    } catch (e) {
      sendResponse({ success: false, error: e.message });
    }
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
