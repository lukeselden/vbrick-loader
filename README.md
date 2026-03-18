# Vbrick Playback URLs Loader

This library assists with using the Vbrick [Get Video Playback URLs](https://revdocs.vbrick.com/reference/getvideoplaybackurls) API Endpoint to get back video streams for playback in a native browser.

**NOTE** This library is currently designed to work with Public VOD videos only.

**[Demo page](https://lukeselden.github.io/vbrick-loader/demo/)**

## Usage

Simple: 

```html
<video id="video"></video>
<script type="module">
    import {loadPlaybacks} from 'https://cdn.jsdelivr.net/gh/lukeselden/vbrick-loader/dist/vbrick-loader.js';
    const videoEl = document.getElementById('video');
    const videoId = "00000000-0000-0000-0000-000000000000";
    const vbrickUrl = "https://company.rev.vbrick.com"
    await loadPlaybacks(videoEl, videoId, { vbrickUrl });
</script>
```

More granular control:

```ts
import {loadPlaybacks, VbrickPlaybackLoader} from 'vbrick-playback';

const videoId = "00000000-0000-0000-0000-000000000000";
const loader = new VbrickPlaybackLoader({
    vbrickUrl: "https://company.rev.vbrick.com"
}, videoId);
const playbacks = await loader.loadPlaybacks();
console.log(
    `${videoId} has ${playbacks.length} available urls`,
);
console.table(playbacks, ['src', 'type']);

const videoEl = document.createElement('video');
videoEl.controls = true;
document.body.appendChild(videoEl);

// add event listeners to video
loader.attachTo(videoEl);
// add <source> elements and trigger source loading
loader.setElementPlaybacks();

```

## Development

1. Download from Github
2. `npm install`
3. Development testing: `npm run dev` - points to `demo/index.html` entry point
4. Build library: `npm run build`

The demo page uses [Vite environment variables](https://vite.dev/guide/env-and-mode#env-variables) to populate values. Edit `.env.dev` as needed