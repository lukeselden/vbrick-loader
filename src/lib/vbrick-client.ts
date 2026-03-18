import type { AccountBasicInfo, PlaybackUrlsResponse } from './vbrick-types.ts';

/**
 * Simple wrapper around the Vbrick APIs. Does not include any authentication, so public endpoints only
 */
export class VbrickPublicClient {
    url: URL;
    accountId?: string;
    constructor(vbrickUrl: string | URL, accountId?: string) {
        this.url = new URL(vbrickUrl);
        this.accountId = accountId;
    }
    async request(
        endpoint: string,
        body?: Record<string, unknown>,
        request?: RequestInit,
    ): Promise<Response> {
        const headers = new Headers(request?.headers);
        const init = { ...request, headers };
        const url = new URL(endpoint, this.url);

        if (body == null) {
            // ignore
        } else if (/put|post|patch/i.test(init.method ?? '')) {
            headers.set('content-type', 'application/json');
            init.body = JSON.stringify(body);
        } else {
            // add body as query parameters to GET/DELETE requests
            Object.entries(body).forEach(([k, v]) => {
                url.searchParams.set(k, v as string);
            });
        }

        const response = await fetch(url, init);

        if (response.status !== 200) {
            const body = await response.json().catch((_err) => undefined);
            const error = new DOMException(
                `${response.status} ${body?.code || response.statusText}`,
                'HTTPError',
            );
            error.cause = body;
            throw error;
        }

        return response;
    }
    async post(
        endpoint: string,
        data?: Record<string, unknown>,
        options?: RequestInit,
    ) {
        const response = await this.request(endpoint, data, {
            ...options,
            method: 'POST',
        });
        return response;
    }
    async get<T = unknown>(
        endpoint: string,
        data?: Record<string, unknown>,
        options?: RequestInit,
    ): Promise<T> {
        const response = await this.request(endpoint, data, {
            ...options,
            method: 'GET',
        });
        return response.json();
    }
    async getAccountId() {
        this.accountId ||= (
            await this.get<AccountBasicInfo>('/api/v2/accounts/bootstrap')
        ).account.id;
        return this.accountId;
    }
    async getPlaybackUrls(
        videoId: string,
        ipAddress?: string,
    ): Promise<PlaybackUrlsResponse> {
        return this.get(
            `/api/v2/videos/${videoId}/playback-urls`,
            ipAddress ? { ip: ipAddress } : undefined,
        );
    }
    async downloadVideo(videoId: string) {
        const response = await this.request(
            `/api/v2/videos/${videoId}/download`,
        );
        const blob = await response.blob();
        return blob;
    }
    async sendAnalyticsPayload({
        videoId,
        ipAddress = '',
        jwtToken,
        messages,
    }: {
        jwtToken: string;
        videoId: string;
        ipAddress?: string;
        messages: Record<string, unknown>[];
    }) {
        const payload = {
            accountId: this.accountId || (await this.getAccountId()),
            ipAddress,
            resourceId: videoId,
            hostname: this.url.hostname,
            source: 'Rev',
            type: 'analytics',
            data: messages,
        };

        await this.post('/datastream', payload, {
            headers: {
                Authorization: `Bearer ${jwtToken}`,
            },
            credentials: 'omit',
        });
    }
}
