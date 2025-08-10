# Google Classroom Video Downloader

A Chrome extension to download "View Only" videos in google classroom and drive.
A view only file in google drive is fetched in small chunks, with no option to download the whole file. This extension intercepts the network requests and manipulates the url to get back the whole file. The extension seemlessly integrates with Aria2 to download your files a lot faster than usual chrome downloads. 

## See it in Action

[![Video Title](https://img.youtube.com/vi/Kkap1xgJJPQ/maxresdefault.jpg)](https://youtu.be/Kkap1xgJJPQ)

[Watch on YouTube](https://youtu.be/Kkap1xgJJPQ)


## Installation

### From Source
1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The extension will appear in your Chrome toolbar

### Permissions
The extension requires the following permissions:
- `activeTab`: Access to current tab information
- `storage`: Persistent storage of aria2 settings and custom filenames
- `webRequest`: Network request interception for video detection and header capture
- `downloads`: File download functionality

## Usage

### Basic Operation
1. Navigate to a Google Classroom page with video content
2. Play or load any video on the page
3. A floating download button will appear in the top-right corner
4. Click the button to see available video and audio streams
5. Choose from 4 action buttons for each stream

### Action Buttons
Each detected video/audio stream offers 4 options:

- **🔵 Open** - Opens video in new tab for direct viewing
- **🟢 Download** - Downloads via browser with custom filename support
- **🟣 aria2** - Sends directly to aria2 RPC for ultra-fast downloads
- **⚪ rename** - Set custom filename for future downloads

### Custom Filename Management
1. Click **"rename"** on any stream
2. Enter your desired filename (e.g., "Lecture_1_Introduction.mp4")
3. Click OK - filename is saved for that specific stream
4. Use **"Download"** or **"aria2"** - both will use your custom filename

### Aria2 RPC Setup
For maximum download speeds:

1. **Install aria2** on your machine from https://aria2.github.io/
2. **Start aria2 RPC server**:
   ```bash
   # Without token
   aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all
   ```
   ```bash
   # With token (recommended)
   aria2c --enable-rpc --rpc-listen-all=true --rpc-allow-origin-all --rpc-secret=YOUR_TOKEN
   ```
3. **Configure extension**:
   - Open extension popup
   - Set custom RPC URL if needed: `http://127.0.0.1:6800/jsonrpc`
   - Set Token: `YOUR_TOKEN` (if using token)
   - Click "Save Aria2 Settings"

### Video Page Download
- When you open a video in a new tab via the extension
- A download button automatically appears on the video page
- Click to download the current video directly

### Quality Selection
The extension detects multiple quality options:
- **Video**: 1080p, 720p, 480p, 360p, 240p
- **Audio**: 128kbps AAC, 256kbps AAC, WebM Audio

## Troubleshooting

### Common Issues

**Button doesn't appear**
- Ensure you're on a Google Classroom or Google Drive page
- Try refreshing the page and playing a video
- Check that the extension is enabled in Chrome

**Videos not detected**
- Play the video for a few seconds to trigger detection
- Check browser console for error messages
- Ensure no ad blockers are interfering

**Download fails**
- Check Chrome's download settings
- Ensure sufficient disk space
- Try opening in new tab instead

**aria2 not working**
- Verify aria2 RPC server is running
- Check RPC URL and token in extension settings
- Ensure aria2 is accessible from browser (no firewall blocking)
- Check aria2 logs for connection errors

**Extension not working**
- Reload the extension in `chrome://extensions/`
- Clear browser cache and cookies
- Disable conflicting extensions temporarily

### Error Messages

- "Failed to detect videos" - Network or permission issue
- "Could not open video" - Tab creation failed
- "Failed to download video" - Download API or file system issue
- "Video detection failed" - Script injection or DOM access issue
- "Aria2 RPC URL not configured" - Set aria2 settings in popup
- "Aria2 error: [message]" - Check aria2 server status and configuration

## Development

### Building from Source
1. Clone the repository
2. Make modifications as needed
3. Load as unpacked extension in Chrome
4. Test on Google Classroom pages

### Key Components

- **URL Cleaning**: `cleanVideoUrl()` function in background.js
- **Header Capture**: `normalizeHeadersArray()` for complete request capture
- **aria2 Integration**: `sendToAria2()` with optimized settings
- **Filename Management**: Custom filename storage in content.js
- **Video Detection**: Multi-layered approach across all scripts
- **UI Management**: Event-driven updates in content.js
- **Error Handling**: User-friendly notifications with internal logging

## Privacy and Security

- No personal data is collected or transmitted
- Video URLs are stored temporarily and automatically cleaned
- Custom filenames stored locally in browser memory
- aria2 settings stored in Chrome sync storage (encrypted)
- No external servers or analytics
- All processing occurs locally in the browser

## Support

For issues, feature requests, or contributions, please refer to the project repository or create an issue with detailed information about the problem encountered. 
