# Videos

Put your own video files in this folder. No demo or stock videos are included — until you add files, the gallery shows placeholder tiles that name the file it expects.

## Files the site looks for

| File             | Orientation       |
| ---------------- | ----------------- |
| `project-01.mp4` | vertical (9:16)   |
| `project-02.mp4` | horizontal (16:9) |
| `project-03.mp4` | horizontal (16:9) |
| `project-04.mp4` | vertical (9:16)   |
| `project-05.mp4` | horizontal (16:9) |
| `project-06.mp4` | vertical (9:16)   |
| `project-07.mp4` | vertical (9:16)   |
| `project-08.mp4` | horizontal (16:9) |

## Replacing, adding or removing videos

Everything is controlled by the `videoProjects` array at the top of `script.js`:

```js
{ title: "My Real Title", category: "Commercial",
  video: "assets/videos/my-file.mp4",
  poster: "assets/images/my-file-poster.jpg",
  orientation: "horizontal" }
```

- **Replace:** drop your file in here and update `title`, `category` and `video`.
- **Add:** copy one line in the array and edit it.
- **Remove:** delete its line.

The filter chips and project count update automatically from the array.

## Tips

- Use H.264 `.mp4` (AAC audio) for the widest browser support. `.webm` also works.
- Keep preview clips short (10–30 s) and compressed. Previews load only when scrolled near, but small files keep the page fast.
- Previews play muted and looped; the full-size player in the modal has sound and controls.
