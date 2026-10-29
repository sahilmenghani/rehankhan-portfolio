# Images

Put your own images in this folder. Nothing here is a real image yet — the site shows tasteful placeholders until you add files.

## Files the site looks for

| File | Used for | Suggested size |
| --- | --- | --- |
| `portrait.jpg` | Hero portrait (left block, cropped into the rounded "D" shape) | 1040 × 1040 px, subject centered near the top |
| `project-01-poster.jpg` … `project-08-poster.jpg` | Poster / thumbnail shown before a video loads | Match the video: 1080 × 1920 (vertical) or 1920 × 1080 (horizontal) |

## How to change names

Poster paths are set per project in the `videoProjects` array at the top of `script.js`:

```js
{ title: "Project One", category: "Reels",
  video: "assets/videos/project-01.mp4",
  poster: "assets/images/project-01-poster.jpg",
  orientation: "vertical" }
```

Change the `poster` value to any file you place here. Use `.jpg`, `.png` or `.webp`. Keep files under ~300 KB where you can.

A missing poster is fine: the card keeps its placeholder until the video itself loads.
# rehankhan-portfolio
