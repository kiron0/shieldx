import * as https from 'https';
import * as vscode from 'vscode';

interface FetchOptions {
  headers?: Record<string, string>;
  timeout?: number;
  token?: vscode.CancellationToken;
}

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
    const finish = (value: T | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cancelDisposable?.dispose();
      resolve(value);
    };
    const timer = setTimeout(() => {
      req.destroy();
      cache.set(cacheKey, null);
      finish(null);
    }, opts.timeout ?? 5000);
    const req = https.get(
      url,
      { headers: { Accept: 'application/json', ...opts.headers } },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          cache.set(cacheKey, null);
          req.destroy();
          finish(null);
          return;
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data) as T;
            cache.set(cacheKey, parsed);
            finish(parsed);
          } catch {
            cache.set(cacheKey, null);
            finish(null);
          }
        });
      },
    );
    req.on('error', () => {
      cache.set(cacheKey, null);
      finish(null);
    });
    const cancelDisposable = opts.token?.onCancellationRequested(() => {
      req.destroy();
      finish(null);
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
    const finish = (value: T | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cancelDisposable?.dispose();
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
        res.on('data', (chunk) => (data += chunk));
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
    const cancelDisposable = opts.token?.onCancellationRequested(() => {
      req.destroy();
      finish(null);
    });
    req.write(payload);
    req.end();
  });
}
