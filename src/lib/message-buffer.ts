export interface IMessageBuffer<T = unknown> {
    enqueue(msg: T, immediate?: boolean): void;
    flush(): Promise<void>;
}

/**
 * Used to send analytics messages in batches rather than at every event
 * @param fn
 * @param flushIntervalMs
 * @param maxBufferSize
 * @returns
 */
export function bufferMessages<T = unknown>(
    fn: (msgs: T[]) => Promise<void>,
    flushIntervalMs: number = 15000,
    maxBufferSize: number = 5,
) {
    let timer: number | undefined;
    const buffer: T[] = [];
    let lastWait: Promise<void> | undefined;
    const flushBuffer = () => {
        if (buffer.length > 0) {
            const items = buffer.splice(0, buffer.length);
            // swallow errors!
            lastWait = Promise.resolve(fn(items)).catch((_err) => {});
        }
        clearTimeout(timer ?? undefined);
        timer = undefined;
    };
    return {
        enqueue(msg: T, immediate = false) {
            buffer.push(msg);
            if (buffer.length >= maxBufferSize) {
                flushBuffer();
            } else if (immediate) {
                clearTimeout(timer ?? undefined);
                // trigger on next tick
                timer = setTimeout(flushBuffer, 0);
            } else {
                timer ??= setTimeout(flushBuffer, flushIntervalMs);
            }
        },
        flush() {
            flushBuffer();
            return lastWait || Promise.resolve();
        },
    };
}
