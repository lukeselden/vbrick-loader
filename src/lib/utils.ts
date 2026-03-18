import type { Playback } from '../types.ts';
import type { PlaybackUrlResult } from './vbrick-types.ts';

export function asPlayback(info: PlaybackUrlResult): Playback {
    const { url, videoFormat } = info;
    return {
        src: url,
        type:
            videoFormat === 'HLS' || url.endsWith('.m3u8')
                ? 'application/x-mpegURL'
                : 'video/mp4',
        info,
    };
}
function generateUserId() {
    return Math.random().toString().slice(2);
}
export function generateSessionId(
    videoId: string,
    userId = generateUserId(),
    startDate = Date.now(),
) {
    return `${videoId}_${userId}_${startDate}`;
}
// update startdate for session
export function refreshSessionId(sessionId: string, startDate = Date.now()) {
    return `${sessionId.slice(0, sessionId.lastIndexOf('_'))}_${startDate}}`;
}
