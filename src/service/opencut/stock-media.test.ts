import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeBrollPlacement,
  parseWikimediaMediaSearch,
} from "@/service/opencut/stock-media";

const MOCK_COMMONS_PAYLOAD = {
  query: {
    pages: {
      "101": {
        pageid: 101,
        title: "File:Modern_office_workspace_2025.jpg",
        imageinfo: [
          {
            url: "https://upload.wikimedia.org/wikipedia/commons/a/a1/Modern_office_workspace_2025.jpg",
            thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Modern_office_workspace_2025.jpg/1080px-Modern_office_workspace_2025.jpg",
            mime: "image/jpeg",
            width: 1920,
            height: 1080,
            user: "PhotographerA",
          },
        ],
      },
      "102": {
        pageid: 102,
        title: "File:City_traffic_timelapse.webm",
        imageinfo: [
          {
            url: "https://upload.wikimedia.org/wikipedia/commons/b/b2/City_traffic_timelapse.webm",
            thumburl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/City_traffic_timelapse.webm/1080px--City_traffic_timelapse.webm.jpg",
            mime: "video/webm",
            width: 1280,
            height: 720,
            duration: 6.4,
            user: "VideographerB",
          },
        ],
      },
      "103": {
        pageid: 103,
        title: "File:Scanned_book_page_12.djvu",
        imageinfo: [
          {
            url: "https://upload.wikimedia.org/wikipedia/commons/c/c3/Scanned_book_page_12.djvu",
            mime: "image/vnd.djvu",
            width: 1000,
            height: 1400,
          },
        ],
      },
      "104": {
        pageid: 104,
        title: "File:Oil_price_chronology-june2007.gif",
        imageinfo: [
          {
            url: "https://upload.wikimedia.org/wikipedia/commons/5/50/Oil_price_chronology-june2007.gif",
            mime: "image/gif",
            width: 610,
            height: 417,
          },
        ],
      },
    },
  },
};

test("parseWikimediaMediaSearch parses free images and videos and filters out non-media scans and low-res GIF charts", () => {
  const all = parseWikimediaMediaSearch(MOCK_COMMONS_PAYLOAD, "all");
  assert.equal(all.length, 2);
  assert.equal(all[0].type, "image");
  assert.equal(all[0].title, "Modern office workspace 2025");
  assert.equal(all[1].type, "video");
  assert.equal(all[1].duration, 6.4);

  const imagesOnly = parseWikimediaMediaSearch(MOCK_COMMONS_PAYLOAD, "image");
  assert.equal(imagesOnly.length, 1);
  assert.equal(imagesOnly[0].id, "commons-101");

  const videosOnly = parseWikimediaMediaSearch(MOCK_COMMONS_PAYLOAD, "video");
  assert.equal(videosOnly.length, 1);
  assert.equal(videosOnly[0].id, "commons-102");
});

test("computeBrollPlacement schedules a 2.0-2.5s payoff-beat window and positions PiP or full-cover transforms", () => {
  const pip = computeBrollPlacement({
    clipStartSec: 5.17,
    clipDurSec: 5.17,
    canvasSize: { width: 1080, height: 1920 },
    sourceWidth: 1280,
    sourceHeight: 960,
    layoutMode: "pip",
  });
  // Starts ~1.96s into Clip 2 (at ~7.13s) and runs 2.5s so it doesn't cover the whole clip wall-to-wall
  assert.ok(pip.startTimeSeconds > 6.8 && pip.startTimeSeconds < 7.5);
  assert.equal(pip.durationSeconds, 2.5);
  assert.equal(pip.scaleX, 0.84);
  assert.equal(pip.positionY, -422);

  const cover = computeBrollPlacement({
    clipStartSec: 5.17,
    clipDurSec: 5.17,
    canvasSize: { width: 1080, height: 1920 },
    sourceWidth: 1280,
    sourceHeight: 960,
    layoutMode: "cover",
  });
  assert.ok(cover.scaleX > 2.3 && cover.scaleX < 2.4);
  assert.equal(cover.positionY, 0);
});
