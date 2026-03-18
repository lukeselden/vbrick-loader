/**
 * Returns basic information about a Rev tenant.
 * @category Utilities
 */
export interface AccountBasicInfo {
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

export interface PlaybackUrlsResponse {
    jwtToken: string;
    playbackResults: PlaybackUrlResult[];
}

export interface PlaybackUrlResult {
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
