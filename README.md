# Google Classroom Video Downloader

A Chrome extension to download "View Only" videos in google classroom and drive.
A view only file in google drive is fetched in small chunks, with no option to download the whole file. This extension intercepts the network requests and manipulates the url to get back the whole file

## See it in Action

[![Video Title](https://img.youtube.com/vi/wfwGeZO0qQ4/maxresdefault.jpg)](https://youtu.be/wfwGeZO0qQ4?si=2xxdw_36wZb7oGvZ)

[Watch on YouTube](https://youtu.be/wfwGeZO0qQ4?si=2xxdw_36wZb7oGvZ)

## Features

- **Automatic Video Detection**: Detects video streams from Google Classroom and Google Drive
- **Smart URL Processing**: Removes chunked delivery parameters to access full video files
- **Multiple Quality Options**: Supports various video and audio quality streams
- **Dual Action Interface**: Open videos in new tabs or download directly
- **Video Page Integration**: Direct download button on opened video pages
- **Clean User Interface**: Minimal, professional design with real-time updates
- **Error Handling**: User-friendly error notifications and graceful failure recovery

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
- `storage`: Temporary storage of detected video URLs
- `webRequest`: Network request interception for video detection
- `downloads`: File download functionality

## Usage

### Basic Operation
1. Navigate to a Google Classroom page with video content
2. Play or load any video on the page
3. A floating download button will appear in the top-right corner
4. Click the button to see available video and audio streams
5. Choose to "Open" (new tab) or "Download" any stream

### Video Page Download
- When you open a video in a new tab via the extension
- A download button automatically appears on the video page
- Click to download the current video directly

### Quality Selection
The extension detects multiple quality options:
- **Video**: 1080p, 720p, 480p, 360p, 240p
- **Audio**: 128kbps AAC, 256kbps AAC, WebM Audio

## Technical Overview

### How It Works

The extension operates through a multi-layered detection system:

1. **Network Interception**: Background script monitors network requests for Google Drive video URLs
2. **URL Processing**: Removes `range` parameters and subsequent parameters to access full video files
3. **Content Injection**: Enhanced detection script runs in page context for comprehensive video monitoring
4. **UI Management**: Content script creates and manages the user interface
5. **Action Handling**: Background script coordinates downloads and tab opening

### Architecture

```
Background Script (background.js)
├── Network request interception
├── URL cleaning and processing
├── Video data storage
└── Download/tab creation coordination

Content Script (content.js)
├── UI creation and management
├── User interaction handling
├── Message passing to background
└── Video page detection

Injected Script (injected.js)
├── Enhanced video element detection
├── XHR/Fetch request monitoring
├── DOM mutation observation
└── Video event reporting
```

### URL Processing

Google Drive serves videos in chunks with `range` parameters:
```
Original: ...&range=0-635401&rn=1&rbuf=0&ump=1&srfvp=1
Processed: ...&sig=AJfQdSswRQIgEieqbgRJZmt3dkXcK-k4BM62-JL2li3TOPQfeKLPTjMCIQCn7y8hlmxRCK8rMpqTAQkPFpQ1e-BGccWYV8doYoZDIg==
```

The extension removes everything from `range` onwards to access the complete video file.

## File Structure

```
├── manifest.json          # Extension configuration
├── background.js          # Service worker for network monitoring
├── content.js            # Content script for UI management
├── injected.js           # Enhanced video detection
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── styles.css            # UI styling
└── README.md            # This file
```

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

**Extension not working**
- Reload the extension in `chrome://extensions/`
- Clear browser cache and cookies
- Disable conflicting extensions temporarily

### Error Messages

- "Failed to detect videos" - Network or permission issue
- "Could not open video" - Tab creation failed
- "Failed to download video" - Download API or file system issue
- "Video detection failed" - Script injection or DOM access issue

## Development

### Building from Source
1. Clone the repository
2. Make modifications as needed
3. Load as unpacked extension in Chrome
4. Test on Google Classroom pages

### Key Components

- **URL Cleaning**: `cleanVideoUrl()` function in background.js
- **Video Detection**: Multi-layered approach across all scripts
- **UI Management**: Event-driven updates in content.js
- **Error Handling**: User-friendly notifications with internal logging

## Privacy and Security

- No personal data is collected or transmitted
- Video URLs are stored temporarily and automatically cleaned
- No external servers or analytics
- All processing occurs locally in the browser

## License

This project is open source. Please refer to the license file for usage terms.

## Support

For issues, feature requests, or contributions, please refer to the project repository or create an issue with detailed information about the problem encountered. 
