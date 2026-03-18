//#region src/lib/vbrick-types.d.ts
/**
 * Returns basic information about a Rev tenant.
 * @category Utilities
 */
interface AccountBasicInfo {
  account: {
    /**
     * AccountID
     */
    id: string;
    /**
     * Account Name
     */
    name?: string;
    /**
     * Default language
     */
    language?: string;
    /**
     * Timezone of account (used in calculating video expiration/publish dates)
     */
    timezone?: string;
  };
  environment: {
    /**
     * Semantic version of the Rev environment (ex. "8.0.5.102")
     */
    version: `${'7' | '8'}.${number}.${number}.${number}`;
  };
}
interface PlaybackUrlsResponse {
  jwtToken: string;
  playbackResults: PlaybackUrlResult[];
}
interface PlaybackUrlResult {
  label: string;
  qValue: number;
  player: 'Native' | 'Vbrick' | 'NativeIos' | 'NativeAndroid' | 'NativeMfStb';
  url: string;
  zoneId: string;
  zoneName?: string;
  slideDelaySeconds: number;
  name?: null | 'RevConnect';
  videoFormat: 'HLS' | 'H264';
  videoInstanceId: string;
  deviceId?: string;
  deviceName?: string;
  isEnriched: boolean;
  streamDeliveryType: 'PublicCDN' | 'ECDN' | 'Custom';
}
//#endregion
//#region src/lib/types.d.ts
interface LoaderConfig {
  vbrickUrl: string | URL;
  accountId?: string;
  /** View Context for analytics reporting - default is "External" */
  viewContext?: string;
  /** If true (default) then only publish single analytics session, rather than once for each playthrough  */
  trackLoopedOnce?: boolean;
}
interface AttachOptions {
  /**
   * whether to append additional <source> elements to video element, replace all existing, or do nothing
   */
  sourcesAction?: 'append' | 'replace' | 'none';
  /**
   * whether to call the video element's .load() after appending <source> to trigger load/play
   */
  triggerLoad?: boolean;
}
interface VideoInfo {
  videoId: string;
  /** duration in SECONDS of video. If null then type is LIVE */
  duration?: number | null;
  title?: string;
  /** "Live" if live video, otherwise Vod */
  type?: 'Live' | 'Vod';
}
interface VbrickData {
  /** static to page/account */
  config: LoaderConfig;
  /** static per-video */
  video: VideoInfo;
  /** per playback session */
  ipAddress?: string;
  jwtToken: string;
}
interface Playback {
  src: string;
  type: 'video/mp4' | 'application/x-mpegURL';
  info: PlaybackUrlResult;
}
//#endregion
//#region src/lib/vbrick-client.d.ts
/**
 * Simple wrapper around the Vbrick APIs. Does not include any authentication, so public endpoints only
 */
declare class VbrickPublicClient {
  url: URL;
  accountId?: string;
  constructor(vbrickUrl: string | URL, accountId?: string);
  request(endpoint: string, body?: Record<string, unknown>, request?: RequestInit): Promise<Response>;
  post(endpoint: string, data?: Record<string, unknown>, options?: RequestInit): Promise<Response>;
  get<T = unknown>(endpoint: string, data?: Record<string, unknown>, options?: RequestInit): Promise<T>;
  getAccountId(): Promise<string>;
  getPlaybackUrls(videoId: string, ipAddress?: string): Promise<PlaybackUrlsResponse>;
  downloadVideo(videoId: string): Promise<Blob>;
  sendAnalyticsPayload({
    videoId,
    ipAddress,
    jwtToken,
    messages
  }: {
    jwtToken: string;
    videoId: string;
    ipAddress?: string;
    messages: Record<string, unknown>[];
  }): Promise<void>;
}
//#endregion
//#region src/lib/analytics-bus.d.ts
declare class AnalyticsBus {
  #private;
  settings?: VbrickData;
  duration?: number | null;
  constructor(client: VbrickPublicClient);
  get viewContext(): string;
  initialize(settings: VbrickData): void;
  onLoadPlayback(playback: PlaybackUrlResult, duration?: number, subType?: 'Initial' | 'ManualSwitch' | 'AutoSwitch'): void;
  onPlay(timeInVideo: number): void;
  onPause(timeInVideo: number): void;
  onTimeUpdate(timeInVideo: number, data?: {
    bandwidth?: number;
    bitrate?: number;
    volume?: number;
  }): void;
  onComplete(_timeInVideo: number): void;
  onBufferStart(timeInVideo: number): void;
  onBufferStop(timeInVideo: number): void;
  /**
   * Indicate this is a new playback session (when restarting)
   * @param sessionStart
   * @param sessionId
   */
  resetSession(sessionStart?: number, sessionId?: string): void;
  flush(): void;
}
//#endregion
//#region src/lib/playback-loader.d.ts
declare class VbrickPlaybackLoader {
  #private;
  data: VbrickData;
  client: VbrickPublicClient;
  videoId: string;
  playbacks: Playback[];
  isTrackingAnalytics: boolean;
  currentPlayback?: Playback;
  get hasPlaybacks(): boolean;
  _bus: AnalyticsBus;
  constructor(config: LoaderConfig, video: string | VideoInfo);
  logEnabled: boolean;
  log: (...args: unknown[]) => void;
  loadPlaybacks(forceReload?: boolean): Promise<Playback[]>;
  get videoEl(): HTMLVideoElement | null;
  /**
   * add event listeners to a video element
   * @param videoEl
   */
  attachTo(videoEl: HTMLVideoElement | null): void;
  setElementPlaybacks({
    sourcesAction,
    triggerLoad
  }?: AttachOptions, videoEl?: HTMLVideoElement): void;
  getSourceElements(): HTMLSourceElement[];
  destroy(): void;
}
//#endregion
//#region src/lib/vbrick-loader.d.ts
declare function loadPlaybacks(videoEl: HTMLVideoElement, videoId: string, config: LoaderConfig, attachOptions?: AttachOptions): Promise<VbrickPlaybackLoader>;
//#endregion
export { type AccountBasicInfo, type LoaderConfig, type PlaybackUrlResult, type PlaybackUrlsResponse, type VbrickData, VbrickPlaybackLoader, VbrickPublicClient, type VideoInfo, loadPlaybacks };
//# sourceMappingURL=vbrick-loader.d.ts.map