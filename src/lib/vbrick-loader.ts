import { VbrickPlaybackLoader } from './playback-loader.ts';
import type { AttachOptions, LoaderConfig } from './types.ts';

export { VbrickPlaybackLoader } from './playback-loader.ts';
export type { LoaderConfig, VbrickData, VideoInfo } from './types.ts';
export { VbrickPublicClient } from './vbrick-client.ts';
export type {
    AccountBasicInfo,
    PlaybackUrlResult,
    PlaybackUrlsResponse,
} from './vbrick-types.ts';

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
