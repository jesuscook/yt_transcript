
async function getVideoId() {
  const url = new URL(window.location.href);
  return url.searchParams.get('v');
}

async function fetchTranscriptViaYouTubeAPI(videoId) {
  try {
    const pageResponse = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      credentials: 'include'
    });
    const html = await pageResponse.text();

    const captionsMatch = html.match(/"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})\s*,\s*"videoDetails"/s);
    if (!captionsMatch) {
      return null;
    }

    let captionData;
    try {
      captionData = JSON.parse(captionsMatch[1]);
    } catch (e) {
      return null;
    }

    const tracks = captionData?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) {
      return null;
    }

    const englishTrack = tracks.find(t =>
      t.languageCode === 'en' || t.languageCode === 'en-US'
    ) || tracks[0];

    const transcriptUrl = englishTrack.baseUrl;
    const transcriptResponse = await fetch(transcriptUrl);
    const transcriptXml = await transcriptResponse.text();

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(transcriptXml, 'text/xml');
    const textElements = xmlDoc.querySelectorAll('text');

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

      if (text) {
        segments.push({ start, text });
      }
    });

    return segments;
  } catch (err) {
    return null;
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractTranscript') {
    (async () => {
      const videoId = await getVideoId();
      if (!videoId) {
        sendResponse({ error: 'No YouTube video found on this page.' });
        return;
      }

      const segments = await fetchTranscriptViaYouTubeAPI(videoId);
      if (!segments || segments.length === 0) {
        sendResponse({ error: 'No transcript available for this video. The video may not have captions.' });
        return;
      }

      sendResponse({ segments, videoId });
    })();
    return true;
  }

  if (request.action === 'seekTo') {
    const video = document.querySelector('video');
    if (video) {
      video.currentTime = request.time;
    }
    sendResponse({ ok: true });
    return true;
  }

  if (request.action === 'getCurrentTime') {
    const video = document.querySelector('video');
    const time = video ? video.currentTime : 0;
    sendResponse({ time });
    return true;
  }
});
