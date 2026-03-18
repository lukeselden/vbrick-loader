import type {
    AttachOptions,
    LoaderConfig,
    Playback,
    VbrickData,
    VideoInfo,
} from '../types.ts';
import { AnalyticsBus } from './analytics-bus.ts';
import { asPlayback } from './utils.ts';
import { VbrickPublicClient } from './vbrick-client.ts';

const TRACKED_EVENTS = [
    'loadedmetadata',
    'play',
    'pause',
    'waiting',
    'playing',
    'pause',
    'timeupdate',
    'ended',
] as const satisfies Array<keyof HTMLVideoElementEventMap>;

/**
 * Using weakmap to keep references to DOM elements to avoid memory leaks. May not be necessary
 */
const domReferences = new WeakMap<
    VbrickPlaybackLoader,
    HTMLVideoElement | null
>();

export class VbrickPlaybackLoader {
    data: VbrickData;
    client: VbrickPublicClient;
    videoId: string;
    playbacks: Playback[] = [];
    isTrackingAnalytics = false;
    currentPlayback?: Playback;
    get hasPlaybacks() {
        return this.playbacks?.length > 0;
    }
    _bus: AnalyticsBus;
    constructor(config: LoaderConfig, video: string | VideoInfo) {
        this.client = new VbrickPublicClient(
            config.vbrickUrl,
            config.accountId,
        );
        this.videoId = typeof video === 'string' ? video : video.videoId;
        this.data = {
            config,
            video: typeof video === 'string' ? { videoId: video } : video,
        } as VbrickData;
        this._bus = new AnalyticsBus(this.client);
    }
    logEnabled = true;
    // replace this function to use alternate log method
    log = (...args: unknown[]) => {
        if (this.logEnabled) {
            console.debug('[vbrick]', ...args);
        }
    };
    #whenLoaded?: Promise<Playback[]>;
    async loadPlaybacks(forceReload = false) {
        if (forceReload) this.#whenLoaded = undefined;
        this.#whenLoaded ||= (async () => {
            // load video info if not already configured
            const response = await this.client.getPlaybackUrls(
                this.videoId,
                this.data.ipAddress,
            );

            this.data.jwtToken = response.jwtToken;
            this._bus.initialize(this.data);
            this.playbacks = response.playbackResults.map(asPlayback);
            return this.playbacks;
        })();
        return this.#whenLoaded;
    }
    #controller?: AbortController;
    get videoEl() {
        return domReferences.get(this) || null;
    }
    /**
     * add event listeners to a video element
     * @param videoEl
     */
    attachTo(videoEl: HTMLVideoElement | null) {
        // set this.videoEl
        domReferences.set(this, videoEl);

        // remove any previous event listeners
        this.#controller?.abort();

        if (!videoEl) {
            this.log('Removed event handlers for video element');
            return;
        }

        this.#controller = new AbortController();
        const { signal } = this.#controller;

        TRACKED_EVENTS.forEach((event) => {
            videoEl.addEventListener(event, this.#handleEvent, { signal });
        });
    }
    setElementPlaybacks(
        { sourcesAction = 'append', triggerLoad = true }: AttachOptions = {},
        videoEl?: HTMLVideoElement,
    ) {
        const el = videoEl || this.videoEl;
        if (el && el !== this.videoEl) {
            this.attachTo(el);
        }
        if (!el) throw new Error('Must specify videoEl or call attachTo first');

        switch (sourcesAction) {
            case 'replace':
                el.replaceChildren(...this.getSourceElements());
                break;
            case 'append':
                el.append(...this.getSourceElements());
                break;
            default:
                break;
        }

        if (triggerLoad) {
            el.load();
        }
    }
    getSourceElements() {
        return this.playbacks.map((playback) => {
            const el = document.createElement('source');
            el.src = playback.src;
            el.type = playback.type;
            return el;
        });
    }
    // used for tracking loops
    #isEnding = false;
    #handleEvent = (ev: Event) => {
        const type = ev.type as (typeof TRACKED_EVENTS)[number];
        const videoEl = ev.target as HTMLVideoElement;
        const { currentSrc, currentTime, duration } = videoEl;

        // video source has changed
        if (type === 'loadedmetadata') {
            this.#updatePlayback(currentSrc, duration);
            return;
        }
        // if not using a tracked source then handler is done
        if (!this.isTrackingAnalytics) return;

        // any other event gets passed to analytics bus
        switch (type) {
            case 'play':
                return this._bus.onPlay(currentTime);
            case 'pause':
                return this._bus.onPause(currentTime);
            case 'ended':
                this.#isEnding = false;
                this._bus.onComplete(currentTime);
                return;
            case 'timeupdate':
                if (videoEl.loop) {
                    this.#handleLoopUpdate(videoEl);
                    // time update will be called, but be a no-op if handleLoopUpdate triggered onComplete
                }
                return this._bus.onTimeUpdate(currentTime);
            case 'playing':
                return this._bus.onBufferStop(currentTime);
            case 'waiting':
                return this._bus.onBufferStart(currentTime);
        }
    };
    /**
     * <video> elements with loop attribute don't trigger ended event when done
     * This is a check to emulate emitting an "ended" event for a looped video
     * Note that it doesn't handle some edge cases like video being seeked after reaching the threshold (2 seconds from end)
     * @param videoEl
     * @param toleranceSec
     * @returns
     */
    #handleLoopUpdate(videoEl: HTMLVideoElement, toleranceSec = 2) {
        const { currentTime, duration } = videoEl;
        const threshold = duration - toleranceSec;

        if (!this.#isEnding && currentTime >= threshold) {
            // queue up completion message for when loop rolls over
            this.#isEnding = true;
        }

        // started over from the beginning, so reset analytics session
        if (this.#isEnding && currentTime < threshold) {
            this._bus.onComplete(currentTime);
            this.#isEnding = false;

            if (this.data.config.trackLoopedOnce ?? true) {
                this.log('Done tracking analytics events');
                this.#stopTracking();
            }
        }
    }
    /**
     * triggered when <video> element has loaded a url
     * checks if url is part of the get playback urls list, and tracks if so
     * @param currentSrc
     * @param duration
     * @returns
     */
    #updatePlayback(currentSrc: string, duration: number) {
        const playback = this.playbacks.find((p) => p.src === currentSrc);
        if (playback === this.currentPlayback) {
            return;
        }

        if (!playback) {
            this.log('Video src updated, not analytics src', currentSrc);
            this.#stopTracking();
            return;
        }

        this.log(
            `Video src updated, starting analytics tracking (duration=${duration})`,
            playback,
        );
        this.isTrackingAnalytics = true;
        this.currentPlayback = playback;
        this._bus.onLoadPlayback(playback.info, duration);
    }
    #stopTracking() {
        this.isTrackingAnalytics = false;
        this._bus.flush();
    }
    destroy() {
        this.#controller?.abort();
        this._bus.flush();
    }
}
