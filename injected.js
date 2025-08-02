(function () {
  "use strict";
  let videoElements = new Set();
  function findVideoElements() {
    try {
      const videos = document.querySelectorAll("video");
      videos.forEach((video) => {
        if (!videoElements.has(video)) {
          videoElements.add(video);
          attachVideoListeners(video);
        }
      });
    } catch (error) {
      console.error("Failed to scan for video elements", error);
      showUserError("Video detection failed. Please refresh the page.");
    }
  }
  function attachVideoListeners(video) {
    try {
      const events = ["play", "playing", "loadstart", "loadeddata", "canplay"];
      events.forEach((eventType) => {
        video.addEventListener(eventType, () => {
          window.postMessage(
            {
              type: "VIDEO_EVENT",
              event: eventType,
              videoInfo: {
                src: video.src,
                currentSrc: video.currentSrc,
                duration: video.duration,
                currentTime: video.currentTime,
                paused: video.paused,
                ended: video.ended,
              },
            },
            "*"
          );
        });
      });
    } catch (error) {
      console.error("Failed to attach video listeners", error);
      showUserError("Video detection failed. Please refresh the page.");
    }
  }
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    try {
      this._requestURL = url;
      return originalOpen.apply(this, [method, url, ...args]);
    } catch (error) {
      console.error("XHR open override failed", error);
      showUserError("Video detection failed. Please refresh the page.");
    }
  };
  XMLHttpRequest.prototype.send = function (...args) {
    try {
      if (this._requestURL && this._requestURL.includes("videoplayback")) {
        window.postMessage(
          {
            type: "XHR_VIDEO_REQUEST",
            url: this._requestURL,
            method: "XMLHttpRequest",
          },
          "*"
        );
      }
      return originalSend.apply(this, args);
    } catch (error) {
      console.error("XHR send override failed", error);
      showUserError("Video detection failed. Please refresh the page.");
    }
  };
  const originalFetch = window.fetch;
  window.fetch = function (url, ...args) {
    try {
      if (typeof url === "string" && url.includes("videoplayback")) {
        window.postMessage(
          {
            type: "FETCH_VIDEO_REQUEST",
            url: url,
            method: "fetch",
          },
          "*"
        );
      }
      return originalFetch.apply(this, [url, ...args]);
    } catch (error) {
      console.error("Fetch override failed", error);
      showUserError("Video detection failed. Please refresh the page.");
    }
  };
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    try {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeType === Node.ELEMENT_NODE &&
              (node.tagName === "VIDEO" || node.querySelector("video"))
            ) {
              shouldCheck = true;
            }
          });
        }
      });
      if (shouldCheck) {
        setTimeout(findVideoElements, 100);
      }
    } catch (error) {
      console.error("MutationObserver error", error);
      showUserError("Video detection failed. Please refresh the page.");
    }
  });
  observer.observe(document, {
    childList: true,
    subtree: true,
  });
  findVideoElements();
  setInterval(findVideoElements, 3000);
  window.postMessage(
    {
      type: "INJECTED_SCRIPT_READY",
    },
    "*"
  );
  function showUserError(msg) {
    if (document.getElementById("gcd-injected-error")) return;
    const div = document.createElement("div");
    div.id = "gcd-injected-error";
    div.textContent = msg;
    div.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:99999;background:#f87171;color:#fff;padding:12px;text-align:center;font-size:16px;font-family:sans-serif;";
    document.body.appendChild(div);
    setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, 5000);
  }
})();
