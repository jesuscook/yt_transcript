
function getVideoId() {
  const url = new URL(window.location.href);
  return url.searchParams.get('v');
}

function getCaptionTracksFromBackground() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getCaptionTracks' }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response && response.tracks ? response.tracks : null);
    });
    setTimeout(() => resolve(null), 5000);
  });
}

async function fetchTranscript() {
  try {
    const tracks = await getCaptionTracksFromBackground();

    if (!tracks || tracks.length === 0) {
      return {
        error: 'No captions found for this video. Make sure the video has subtitles or auto-generated captions, then refresh the page and try again.'
      };
    }

    const englishTrack =
      tracks.find(t => t.languageCode === 'en') ||
      tracks.find(t => t.languageCode && t.languageCode.startsWith('en')) ||
      tracks[0];

    if (!englishTrack || !englishTrack.baseUrl) {
      return { error: 'Could not find a usable caption track.' };
    }

    const transcriptResponse = await fetch(englishTrack.baseUrl);
    if (!transcriptResponse.ok) {
      return { error: 'Failed to download the transcript file.' };
    }

    const transcriptXml = await transcriptResponse.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(transcriptXml, 'text/xml');
    const textElements = xmlDoc.querySelectorAll('text');

    if (textElements.length === 0) {
      return { error: 'Transcript file was empty or could not be parsed.' };
    }

    const segments = [];
    textElements.forEach(el => {
      const start = parseFloat(el.getAttribute('start'));
      const text = el.textContent
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, ' ')
        .trim();
      if (text) segments.push({ start, text });
    });

    const trackLabel =
      (englishTrack.name && englishTrack.name.simpleText) ||
      englishTrack.languageCode;

    return { segments, trackLabel };
  } catch (err) {
    return { error: 'Unexpected error: ' + err.message };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractTranscript') {
    const videoId = getVideoId();
    if (!videoId) {
      sendResponse({ error: 'No YouTube video found on this page.' });
      return true;
    }

    fetchTranscript().then(result => {
      if (result.error) {
        sendResponse({ error: result.error });
      } else {
        sendResponse({ segments: result.segments, trackLabel: result.trackLabel, videoId });
      }
    });

    return true;
  }

  if (request.action === 'seekTo') {
    const video = document.querySelector('video');
    if (video) video.currentTime = request.time;
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'getCurrentTime') {
    const video = document.querySelector('video');
    sendResponse({ time: video ? video.currentTime : 0 });
    return true;
  }
});
