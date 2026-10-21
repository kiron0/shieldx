import * as https from 'https';
import * as vscode from 'vscode';

interface FetchOptions {
  headers?: Record<string, string>;
  timeout?: number;
  token?: vscode.CancellationToken;
}

const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;

export function fetchJson<T>(
  url: string,
  cache: Map<string, T | null>,
  cacheKey: string,
  opts: FetchOptions = {},
): Promise<T | null> {
  if (cache.has(cacheKey)) return Promise.resolve(cache.get(cacheKey) ?? null);

  return new Promise((resolve) => {
    if (opts.token?.isCancellationRequested) {
      resolve(null);
      return;
    }

    let settled = false;
    const handles: { cancel?: vscode.Disposable } = {};

    const finish = (value: T | null, cacheResult: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handles.cancel?.dispose();
      if (cacheResult) cache.set(cacheKey, value);
      resolve(value);
    };

    const timer = setTimeout(() => {
      req.destroy();
      // Failures are not cached: a transient network error must not disable
      // reputation lookups for the rest of the session.
      finish(null, false);
    }, opts.timeout ?? 5000);

    const req = https.get(
      url,
      { headers: { Accept: 'application/json', ...opts.headers } },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          req.destroy();
          finish(null, false);
          return;
        }
        let data = '';
        let size = 0;
        let aborted = false;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            aborted = true;
            req.destroy();
            finish(null, false);
            return;
          }
          data += chunk;
        });
        res.on('end', () => {
          if (aborted) return;
          try {
            const parsed = JSON.parse(data) as T;
            finish(parsed, true);
          } catch {
            finish(null, false);
          }
        });
      },
    );

    req.on('error', () => {
      finish(null, false);
    });

    handles.cancel = opts.token?.onCancellationRequested(() => {
      req.destroy();
      finish(null, false);
    });
  });
}

export function postJson<T>(
  url: string,
  body: unknown,
  opts: FetchOptions = {},
): Promise<T | null> {
  return new Promise((resolve) => {
    if (opts.token?.isCancellationRequested) {
      resolve(null);
      return;
    }

    let settled = false;
    const handles: { cancel?: vscode.Disposable } = {};

    const finish = (value: T | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handles.cancel?.dispose();
      resolve(value);
    };

    const timer = setTimeout(() => {
      req.destroy();
      finish(null);
    }, opts.timeout ?? 3000);

    const payload = JSON.stringify(body);
    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...opts.headers,
        },
      },
      (res) => {
        if ((res.statusCode ?? 500) < 200 || (res.statusCode ?? 500) >= 300) {
          res.resume();
          req.destroy();
          finish(null);
          return;
        }
        let data = '';
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_RESPONSE_BYTES) {
            req.destroy();
            finish(null);
            return;
          }
          data += chunk;
        });
        res.on('end', () => {
          if (!data.trim()) {
            finish(null);
            return;
          }
          try {
            finish(JSON.parse(data) as T);
          } catch {
            finish(null);
          }
        });
      },
    );

    req.on('error', () => finish(null));

    handles.cancel = opts.token?.onCancellationRequested(() => {
      req.destroy();
      finish(null);
    });

    req.write(payload);
    req.end();
  });
}
