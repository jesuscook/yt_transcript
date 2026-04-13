
let allSegments = [];
let filteredSegments = [];
let activeIndex = -1;
let highlightTimer = null;

const $ = id => document.getElementById(id);

function showState(state) {
  ['idle-state', 'loading-state', 'error-state', 'result-state'].forEach(s => {
    $(s).classList.toggle('hidden', s !== state + '-state');
  });
}

function setBadge(type, text) {
  const badge = $('status-badge');
  badge.className = 'badge badge--' + type;
  badge.textContent = text;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark>$1</mark>');
}

function renderSegments(segments, query = '') {
  const list = $('transcript-list');

  if (segments.length === 0) {
    list.innerHTML = '<div class="no-results">No results found</div>';
    return;
  }

  list.innerHTML = segments.map((seg, i) => `
    <div class="segment" data-index="${i}" data-start="${seg.start}">
      <span class="segment-time">${formatTime(seg.start)}</span>
      <span class="segment-text">${highlightText(seg.text, query)}</span>
    </div>
  `).join('');

  list.querySelectorAll('.segment').forEach(el => {
    el.addEventListener('click', () => {
      const start = parseFloat(el.getAttribute('data-start'));
      seekToTime(start);
      highlightSegment(el);
    });
  });
}

function highlightSegment(el) {
  $('transcript-list').querySelectorAll('.segment').forEach(s => s.classList.remove('highlight'));
  el.classList.add('highlight');
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  clearTimeout(highlightTimer);
  highlightTimer = setTimeout(() => el.classList.remove('highlight'), 2000);
}

function seekToTime(time) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'seekTo', time });
  });
}

function updateActiveSegment(currentTime) {
  const segments = filteredSegments.length > 0 ? filteredSegments : allSegments;
  let newActive = -1;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].start <= currentTime) {
      newActive = i;
      break;
    }
  }
  if (newActive !== activeIndex) {
    activeIndex = newActive;
    $('transcript-list').querySelectorAll('.segment').forEach((el, i) => {
      el.classList.toggle('active', i === newActive);
    });
    if (newActive >= 0) {
      const activeEl = $('transcript-list').querySelector('.segment.active');
      if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
}

let syncInterval = null;

function startTimeSync() {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getCurrentTime' }, res => {
        if (chrome.runtime.lastError || !res) return;
        updateActiveSegment(res.time);
      });
    });
  }, 1000);
}

function showTranscript(segments, trackLabel) {
  allSegments = segments;
  filteredSegments = [];

  const totalTime = segments.length > 0
    ? formatTime(segments[segments.length - 1].start)
    : '0:00';

  const label = trackLabel ? ` · ${trackLabel}` : '';
  $('meta-info').textContent = `${segments.length} segments · up to ${totalTime}${label}`;

  renderSegments(segments);
  showState('result');
  setBadge('success', `${segments.length} lines`);
  startTimeSync();
}

function doExtract() {
  showState('loading');
  setBadge('loading', 'Fetching...');

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) {
      showState('error');
      $('error-message').textContent = 'Could not get the active tab.';
      setBadge('error', 'Error');
      return;
    }

    const tab = tabs[0];
    if (!tab.url || !tab.url.includes('youtube.com/watch')) {
      showState('error');
      $('error-message').textContent = 'Please navigate to a YouTube video first.';
      setBadge('error', 'Error');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'extractTranscript' }, response => {
      if (chrome.runtime.lastError) {
        showState('error');
        $('error-message').textContent = 'Could not connect to the page. Try refreshing the YouTube tab.';
        setBadge('error', 'Error');
        return;
      }

      if (response.error) {
        showState('error');
        $('error-message').textContent = response.error;
        setBadge('error', 'Error');
        return;
      }

      showTranscript(response.segments, response.trackLabel);
    });
  });
}

function showToast(msg) {
  const toast = $('copy-toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2000);
}

$('extract-btn').addEventListener('click', doExtract);
$('retry-btn').addEventListener('click', () => {
  showState('idle');
  setBadge('idle', 'Ready');
});
$('new-extract-btn').addEventListener('click', () => {
  if (syncInterval) clearInterval(syncInterval);
  allSegments = [];
  filteredSegments = [];
  $('search-input').value = '';
  showState('idle');
  setBadge('idle', 'Ready');
});

$('copy-btn').addEventListener('click', () => {
  const text = allSegments
    .map(s => `[${formatTime(s.start)}] ${s.text}`)
    .join('\n');
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!'));
});

$('search-input').addEventListener('input', e => {
  const query = e.target.value.trim().toLowerCase();
  if (!query) {
    filteredSegments = [];
    renderSegments(allSegments, '');
    return;
  }
  filteredSegments = allSegments.filter(s => s.text.toLowerCase().includes(query));
  renderSegments(filteredSegments, query);
});

showState('idle');
setBadge('idle', 'Ready');
