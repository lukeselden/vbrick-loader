import { bufferMessages, type IMessageBuffer } from './message-buffer.ts';
import type { VbrickData } from './types.ts';
import { generateSessionId, refreshSessionId } from './utils.ts';
import type { VbrickPublicClient } from './vbrick-client.ts';
import type { PlaybackUrlResult } from './vbrick-types.ts';

export class AnalyticsBus {
    settings?: VbrickData;
    duration?: number | null;
    /**
     * whether this is the current
     */
    #sessionContext?: Record<string, unknown>;
    #baseContext = {
        IpAddress: '',
        SessionId: '',
        Type: 'VideoHeartbeat',
        UserType: 'Guest',
        VideoId: '',
    };
    #buffer: IMessageBuffer;
    constructor(client: VbrickPublicClient) {
        this.#buffer = bufferMessages<Record<string, unknown>>(
            async (messages) => {
                if (!this.settings) throw new Error('Not Configured');
                const { jwtToken, video, ipAddress } = this.settings;
                try {
                    await client.sendAnalyticsPayload({
                        jwtToken,
                        videoId: video.videoId,
                        ipAddress,
                        messages,
                    });
                } catch (error) {
                    console.warn(
                        'VBRICK ERROR: failed to send analytics data payload',
                        error,
                    );
                }
            },
        );
    }
    get viewContext() {
        return this.settings?.config.viewContext ?? 'External';
    }
    initialize(settings: VbrickData) {
        this.settings = settings;
        const { video, ipAddress = '' } = settings;
        this.duration ||= video.duration;
        this.#baseContext = {
            IpAddress: ipAddress,
            SessionId: generateSessionId(video.videoId),
            Type: 'VideoHeartbeat',
            UserType: 'Guest',
            VideoId: video.videoId,
        };
    }
    #enqueue(data: Record<string, unknown>, immediate = false) {
        // console.debug(`event: ${data.EventType}`);
        // keep track of when events register current player time
        // keeps heartbeat events from getting dispatched too often
        if (data.TimeInVideo) {
            this.#lastTimeUpdate = Date.now();
        }
        this.#buffer.enqueue(
            {
                ...this.#baseContext,
                ...this.#sessionContext,
                When: new Date().toISOString(),
                Id: crypto.randomUUID(),
                ...data,
            },
            immediate,
        );
    }
    #setPlayback(playback: PlaybackUrlResult) {
        this.#sessionContext = {
            DeviceId: playback.deviceId,
            StreamAccessed: playback.url,
            StreamDeliveryType: playback.streamDeliveryType,
            StreamDevice: playback.deviceName || 'Rev',
            // StreamType: null,
            VideoFormat: playback.videoFormat,
            ZoneId: playback.zoneId,
            ZoneName: playback.zoneName,
        };
    }
    onLoadPlayback(
        playback: PlaybackUrlResult,
        duration?: number,
        subType?: 'Initial' | 'ManualSwitch' | 'AutoSwitch',
    ) {
        this.#setPlayback(playback);

        if (duration !== undefined) {
            this.duration ||= duration;
            if (this.settings) {
                this.settings.video.duration ||= duration;
            }
        }
        this.#sendPlaybackUpdated(subType);
    }
    #sendPlaybackUpdated(subType?: 'Initial' | 'ManualSwitch' | 'AutoSwitch') {
        const isInitial = !this.#sessionContext;
        const { video } = this.settings ?? {};
        if (!video) throw new Error('Not initialized');

        this.#enqueue({
            ...(video.duration
                ? {
                      Duration: video.duration,
                      TimeInVideo: 0,
                      VideoType: 'Vod',
                  }
                : {
                      VideoType: 'Live',
                  }),
            ...(video.title && { Title: video.title }),
            VideoPlayer: 'HTML5',
            ViewContext: this.viewContext,
            ViewSourceUrl: null,
            EventType: 'PlaybackUpdated',
            SubType: subType || (isInitial ? 'Initial' : 'ManualSwitch'),
        });
    }
    #isInitialPlay = true;
    onPlay(timeInVideo: number) {
        const IsInitial = this.#isInitialPlay;
        this.#isInitialPlay = false;
        this.#enqueue(
            {
                IsInitial,
                ViewContext: this.viewContext,
                EventType: 'Play',
                ...(timeInVideo && { TimeInVideo: timeInVideo * 1000 }),
            },
            // emit immediately
            true,
        );
    }
    onPause(timeInVideo: number) {
        this.#enqueue({
            ...(timeInVideo && { TimeInVideo: timeInVideo * 1000 }),
            EventType: 'Pause',
        });
    }
    #lastTimeUpdate: number = Date.now();
    onTimeUpdate(
        timeInVideo: number,
        data: { bandwidth?: number; bitrate?: number; volume?: number } = {},
    ) {
        // ignore start of video
        if (timeInVideo === 0) return;

        // if (delta < heartbeat interval then ignore repeated updates)
        const HEARTBEAT_INTERVAL_MS = 10 * 1000;
        const now = Date.now();
        const shouldSendHeartbeat =
            now - this.#lastTimeUpdate > HEARTBEAT_INTERVAL_MS;
        if (!shouldSendHeartbeat) return;

        this.#enqueue({
            ...(timeInVideo && { TimeInVideo: timeInVideo * 1000 }),
            EventType: 'Heartbeat',
            Bandwidth: data.bandwidth,
            BitRate: data.bitrate,
            ViewContext: this.viewContext,
            Volume: data.volume ?? 1,
        });
    }
    onComplete(_timeInVideo: number) {
        const duration = this.duration;
        this.#enqueue(
            {
                // set to end of video exactly
                ...(duration && { TimeInVideo: duration * 1000 }),
                EventType: 'Complete',
            },
            // send immediately
            true,
        );
        // always trigger new session on completion
        this.resetSession();
    }
    #isInitialBuffer = true;
    #bufferEvent?: { start: Date; timeInVideo: number } = undefined;
    onBufferStart(timeInVideo: number) {
        if (this.#bufferEvent) return;
        this.#bufferEvent = { start: new Date(), timeInVideo };
    }
    onBufferStop(timeInVideo: number) {
        if (!this.#bufferEvent) return;
        const { start, timeInVideo: startTimeInVideo } = this.#bufferEvent;
        const duration = Date.now() - start.getTime();
        const MIN_BUFFER_TIME = 100;
        const SubType = this.#isInitialBuffer ? 'Initial' : 'Playback';
        this.#isInitialBuffer = false;
        if (duration > MIN_BUFFER_TIME) {
            this.#enqueue({
                SubType,
                ...(startTimeInVideo && {
                    TimeInVideo: startTimeInVideo * 1000,
                }),
                EventType: 'BufferingStarted',
                // this is the start event which happened earlier, so override default "now"
                When: this.#bufferEvent.start.toISOString(),
            });
            this.#enqueue({
                SubType,
                Duration: duration,
                ...(timeInVideo && { TimeInVideo: timeInVideo * 1000 }),
                EventType: 'BufferingStopped',
            });
        }
        // indicate done buffering
        this.#bufferEvent = undefined;
    }
    /**
     * Indicate this is a new playback session (when restarting)
     * @param sessionStart
     * @param sessionId
     */
    resetSession(sessionStart = Date.now(), sessionId?: string) {
        const base = this.#baseContext;
        if (!base) throw new Error('Not Configured');
        base.SessionId =
            sessionId || refreshSessionId(base.SessionId, sessionStart);

        this.#sendPlaybackUpdated('Initial');
    }
    flush() {
        this.#buffer.flush();
    }
}
