// Only one video should play at a time on the desk (preview, task list, bookend).

type PausableVideo = {
  paused: boolean;
  pause: () => void;
};

export function pauseOtherVideos<T extends PausableVideo>(current: T, videos: Iterable<T>) {
  for (const video of videos) {
    if (video !== current && !video.paused) video.pause();
  }
}

export function pauseAllVideos<T extends PausableVideo>(videos: Iterable<T>) {
  for (const video of videos) {
    if (!video.paused) video.pause();
  }
}

export function pageVideos() {
  return document.querySelectorAll("video");
}
