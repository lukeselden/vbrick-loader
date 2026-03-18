import type { PlaybackUrlResult } from './vbrick-types.ts';

export interface LoaderConfig {
    vbrickUrl: string | URL;
    accountId?: string;
    /** View Context for analytics reporting - default is "External" */
    viewContext?: string;
    /** If true (default) then only publish single analytics session, rather than once for each playthrough  */
    trackLoopedOnce?: boolean;
}

export interface AttachOptions {
    /**
     * whether to append additional <source> elements to video element, replace all existing, or do nothing
     */
    sourcesAction?: 'append' | 'replace' | 'none';
    /**
     * whether to call the video element's .load() after appending <source> to trigger load/play
     */
    triggerLoad?: boolean;
}

export interface VideoInfo {
    videoId: string;
    /** duration in SECONDS of video. If null then type is LIVE */
    duration?: number | null;
    title?: string;
    /** "Live" if live video, otherwise Vod */
    type?: 'Live' | 'Vod';
}

export interface VbrickData {
    /** static to page/account */
    config: LoaderConfig;
    /** static per-video */
    video: VideoInfo;
    /** per playback session */
    ipAddress?: string;
    jwtToken: string;
}

export interface Playback {
    src: string;
    type: 'video/mp4' | 'application/x-mpegURL';
    info: PlaybackUrlResult;
}
