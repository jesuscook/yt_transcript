
(function () {
  document.addEventListener('__yt_get_tracks__', function () {
    try {
      const data = window.ytInitialPlayerResponse;
      const tracks =
        (data &&
          data.captions &&
          data.captions.playerCaptionsTracklistRenderer &&
          data.captions.playerCaptionsTracklistRenderer.captionTracks) ||
        null;

      document.dispatchEvent(
        new CustomEvent('__yt_tracks_result__', {
          detail: { tracks: tracks }
        })
      );
    } catch (e) {
      document.dispatchEvent(
        new CustomEvent('__yt_tracks_result__', {
          detail: { tracks: null }
        })
      );
    }
  });
})();
