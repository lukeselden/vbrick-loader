import './style.css';
import type { LoaderConfig } from '../src/types.ts';
import { loadPlaybacks, VbrickPlaybackLoader } from '../src/vbrick-loader.ts';

const vbrickUrl =
    import.meta.env.VITE_VBRICK_URL || 'https://company.rev.vbrick.com';
let accountId = import.meta.env.VITE_VBRICK_ACCOUNT_ID;
// empty out if using default
if (accountId === '00000000-0000-0000-0000-000000000000') {
    accountId = '';
}

function exampleOne() {
    const sources = document.querySelectorAll<HTMLSourceElement>(
        `video source[src*="${vbrickUrl}"]`,
    );
    const exampleVideos = new Map<HTMLVideoElement, VbrickPlaybackLoader>();
    for (const source of sources) {
        const { src } = source;
        const videoId = /.*\/([0-9a-f-]{36})\/download$/.exec(src)?.[1];
        if (!videoId) {
            console.log('Not a vbrick download source url', src);
            continue;
        }

        const videoEl = source.closest('video');
        // skip already processed in case of multiple source elements
        if (!videoEl || exampleVideos.has(videoEl)) continue;

        const loader = new VbrickPlaybackLoader(
            {
                vbrickUrl,
                accountId,
                // don't track every single play of the video when looping. Good for very short videos
                trackLoopedOnce: true,
                viewContext: 'ExampleOne',
            },
            videoId,
        );
        exampleVideos.set(videoEl, loader);
        (async () => {
            try {
                await loader.loadPlaybacks();
                console.log(
                    `${videoId} has ${loader.playbacks.length} available urls`,
                );
                // add listeners
                loader.attachTo(videoEl);
                // add <source>s and start load
                loader.setElementPlaybacks();
            } catch (error) {
                console.warn(`Failed to load playbacks for ${videoId}`, error);
            }
        })();
    }
}
exampleOne();

function exampleTwo() {
    const config: LoaderConfig = {
        vbrickUrl,
        accountId,
        viewContext: 'ExampleTwo',
    };

    const videoElements = document.querySelectorAll<HTMLVideoElement>(
        'video[data-videoid]',
    );
    for (const el of videoElements) {
        const videoId = el.dataset.videoid;
        if (videoId) {
            loadPlaybacks(el, videoId, config, {
                sourcesAction: 'replace',
            }).catch((err) =>
                console.warn(`Failed to load playbacks for ${videoId}`, err),
            );
        }
    }
}

exampleTwo();

function exampleThree() {
    const targetEl = document.getElementById('example3target');
    if (!targetEl) return;

    const config: LoaderConfig = {
        vbrickUrl,
        accountId,
        viewContext: 'ExampleThree',
    };
    const videoId = import.meta.env.VITE_VIDEO_ID;

    if (!videoId) {
        targetEl.innerText =
            'Missing VITE_VIDEO_ID video id - set in .env file';
        return;
    }

    (async () => {
        const loader = new VbrickPlaybackLoader(config, videoId);

        const playbacks = await loader.loadPlaybacks();
        console.log('Found available playbacks', playbacks);
        console.table(playbacks, ['qValue', 'label', 'videoFormat']);

        const videoEl = document.createElement('video');
        videoEl.controls = true;

        // add event listeners but don't set src yet
        loader.attachTo(videoEl);

        // grab MP4 instead of HLS
        let playback = playbacks.find((p) => p.type === 'video/mp4');

        if (!playback) {
            console.warn('No MP4 playback options, using first available');
            playback = playbacks[0];
        }

        videoEl.src = playback.src;
        targetEl.replaceChildren(videoEl);
    })().catch((error) =>
        console.warn(`Failed to load playbacks for ${videoId}`, error),
    );
}

exampleThree();
