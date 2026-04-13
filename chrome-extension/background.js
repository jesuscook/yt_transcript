
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCaptionTracks') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      world: 'MAIN',
      func: () => {
        try {
          const resp = window.ytInitialPlayerResponse;
          const tracks =
            resp &&
            resp.captions &&
            resp.captions.playerCaptionsTracklistRenderer &&
            resp.captions.playerCaptionsTracklistRenderer.captionTracks;
          return tracks || null;
        } catch (e) {
          return null;
        }
      }
    }).then(results => {
      const tracks = results && results[0] && results[0].result;
      sendResponse({ tracks: tracks || null });
    }).catch(err => {
      sendResponse({ tracks: null, error: err.message });
    });

    return true;
  }
});
