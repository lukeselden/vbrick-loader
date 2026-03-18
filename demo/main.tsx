import './style.css';
import {
    batch,
    computed,
    createModel,
    effect,
    type ReadonlySignal,
    signal,
    useComputed,
    useModel,
} from '@preact/signals';
import { Show } from '@preact/signals/utils';
import { type FunctionComponent, render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { LoaderConfig, Playback } from '../src/types.ts';
import { VbrickPlaybackLoader } from '../src/vbrick-loader.ts';

const DEFAULT_VALUES = {
    vbrickUrl: import.meta.env.VITE_VBRICK_URL || '',
    videoId: import.meta.env.VITE_VIDEO_ID || '',
    // accountId: import.meta.env.VITE_ACCOUNT_ID || '',
    viewContext: import.meta.env.VITE_VIEW_CONTEXT || 'Demo',
    poster: import.meta.env.VITE_POSTER_IMAGE || '',
};

const DemoModel = createModel(
    (config?: LoaderConfig & { videoId?: string }) => {
        const vbrickUrl$ = signal(config?.vbrickUrl || '');
        const videoId$ = signal(config?.videoId || '');
        // const accountId$ = signal(config?.accountId || '');
        const viewContext$ = signal(
            config?.viewContext || DEFAULT_VALUES.viewContext,
        );
        // whether currently calling get playback urls api
        const isLoading$ = signal<boolean>(false);
        // playbacks for specified video
        const playbacks$ = signal<Playback[] | null>(null);

        // create loader class based on inputs
        const loader$ = computed(() => {
            const [vbrickUrl, viewContext, videoId] = [
                vbrickUrl$.value,
                viewContext$.value,
                videoId$.value,
            ];
            if (!(vbrickUrl && viewContext && videoId)) {
                return null;
            }
            const loader = new VbrickPlaybackLoader(
                {
                    vbrickUrl,
                    viewContext,
                },
                videoId,
            );
            return loader;
        });

        // when loader is created based on inputs then trigger loading urls
        effect(() => {
            const loader = loader$.value;
            if (!loader) return;
            (async () => {
                batch(() => {
                    playbacks$.value = null;
                    isLoading$.value = true;
                });
                const playbacks = await loader.loadPlaybacks().catch((err) => {
                    console.warn(
                        'Unable to load playbacks - introduce fallback logic here?',
                        err,
                    );
                    return null;
                });
                batch(() => {
                    playbacks$.value = playbacks;
                    isLoading$.value = false;
                });
            })();
        });

        return {
            vbrickUrl: vbrickUrl$,
            videoId: videoId$,
            viewContext: viewContext$,
            loader: loader$,
            playbacks$,
            isLoading$,
            update(vbrickUrl: string, videoId: string, viewContext: string) {
                // cleanup existing loader and event listeners
                this.destroy();
                batch(() => {
                    this.vbrickUrl.value = vbrickUrl;
                    this.videoId.value = videoId;
                    this.viewContext.value = viewContext;
                });
            },
            attach(el: HTMLVideoElement) {
                this.loader.value?.attachTo(el);
            },
            detach() {
                this.loader.value?.attachTo(null);
            },
            destroy() {
                loader$.value?.destroy();
            },
        };
    },
);

type DemoState = InstanceType<typeof DemoModel>;

const VideoOutput: FunctionComponent<{ model: DemoState }> = ({ model }) => {
    const { loader: loader$, isLoading$ } = model;

    const playbackLabels$ = useComputed(() => {
        const playbacks = model.playbacks$.value;
        return (
            <ul>
                {playbacks?.map(({ info }) => (
                    <li>
                        <code>
                            {info.label === '-' ? 'Original' : info.label}:{' '}
                            {info.videoFormat === 'HLS' ? 'HLS' : 'MP4'}
                        </code>
                    </li>
                ))}
            </ul>
        );
    });

    const posterUrl$ = useComputed(() => {
        const [vbrickUrl, videoId] = [
            model.vbrickUrl.value,
            model.videoId.value,
        ];
        return vbrickUrl && videoId
            ? new URL(
                  `/api/v2/videos/${videoId}/thumbnail`,
                  vbrickUrl,
              ).toString()
            : (DEFAULT_VALUES.poster as string);
    });

    return (
        <figure class="hero-container">
            <HeroVideo model={model} poster={posterUrl$}></HeroVideo>
            <figcaption>
                <Show
                    when={loader$}
                    fallback={<p>Click Render to load video</p>}
                >
                    <Show
                        when={isLoading$}
                        fallback={
                            <p>Loaded - playbacks are: {playbackLabels$}</p>
                        }
                    >
                        <p>Loading...</p>
                    </Show>
                </Show>
            </figcaption>
        </figure>
    );
};

interface HeroVideoProps {
    model: DemoState;
    poster?: string | ReadonlySignal<string>;
}

const HeroVideo: FunctionComponent<HeroVideoProps> = ({ model, poster }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // attach event listeners to <video>
    useEffect(() => {
        const el = videoRef.current;
        if (!el) return;
        model.attach(el);
        // remove event listeners on repaint
        return () => model.detach();
    });
    const playbacks = model.playbacks$.value;
    return (
        <video
            ref={videoRef}
            /** used to trigger unloading of video element on form submit event */
            key={new Date().toISOString()}
            autoplay
            controls
            loop
            muted
            playsinline
            poster={poster}
            preload="auto"
            class="hero"
        >
            {playbacks?.map(({ src, type }) => (
                <source {...{ src, type }} />
            ))}
        </video>
    );
};

// for development purposes - set to true to use the .env values on page load to immediately render video
const RENDER_ON_LOAD = false;

const App: FunctionComponent = () => {
    const model = RENDER_ON_LOAD
        ? useModel(() => new DemoModel(DEFAULT_VALUES))
        : useModel(DemoModel);

    const [vbrickUrl, setVbrickUrl] = useState(DEFAULT_VALUES.vbrickUrl);
    const [videoId, setVideoId] = useState(DEFAULT_VALUES.videoId);
    const [viewContext, setViewContext] = useState(DEFAULT_VALUES.viewContext);

    const onSubmit = (e: SubmitEvent) => {
        e.preventDefault();
        model.update(vbrickUrl, videoId, viewContext);
    };

    return (
        <main>
            <form onSubmit={onSubmit}>
                <fieldset class="form-grid">
                    <legend>Config</legend>
                    <label for="vbrickUrl">
                        Vbrick URL:
                        <input
                            type="text"
                            id="vbrickUrl"
                            placeholder="Vbrick Rev tenant URL"
                            value={vbrickUrl}
                            onChange={(e) =>
                                setVbrickUrl(e.currentTarget.value)
                            }
                        />
                    </label>
                    <label for="videoId">
                        Video ID:
                        <input
                            type="text"
                            id="videoId"
                            placeholder="Video ID"
                            value={videoId}
                            onChange={(e) => setVideoId(e.currentTarget.value)}
                        />
                    </label>
                    <label for="viewContext">
                        View Context:
                        <input
                            type="text"
                            id="viewContext"
                            placeholder="View Context"
                            value={viewContext}
                            onChange={(e) =>
                                setViewContext(e.currentTarget.value)
                            }
                        />
                    </label>
                    <button type="submit">Render</button>
                </fieldset>
            </form>
            <VideoOutput model={model}></VideoOutput>
        </main>
    );
};

render(<App />, document.getElementById('app') as HTMLElement);
