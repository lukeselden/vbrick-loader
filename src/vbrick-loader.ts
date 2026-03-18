import { VbrickPlaybackLoader } from './lib/playback-loader.ts';
import type { AttachOptions, LoaderConfig } from './types.ts';

export { VbrickPlaybackLoader } from './lib/playback-loader.ts';
export { VbrickPublicClient } from './lib/vbrick-client.ts';
export type {
    AccountBasicInfo,
    PlaybackUrlResult,
    PlaybackUrlsResponse,
} from './lib/vbrick-types.ts';
export type { LoaderConfig, VbrickData, VideoInfo } from './types.ts';

export async function loadPlaybacks(
    videoEl: HTMLVideoElement,
    videoId: string,
    config: LoaderConfig,
    attachOptions?: AttachOptions,
) {
    const loader = new VbrickPlaybackLoader(config, videoId);
    await loader.loadPlaybacks();
    loader.attachTo(videoEl);
    loader.setElementPlaybacks(attachOptions);
    return loader;
}
