/**
 * Cancellation primitives without an editor dependency, so the scan core can
 * also run from the CLI.
 */
export class ScanCancelledError extends Error {
  constructor() {
    super('Scan cancelled');
    this.name = 'CancellationError';
  }
}

export interface CancellationState {
  readonly isCancellationRequested: boolean;
}

/** Cancellation token with an optional cancellation listener. */
export interface CancellableToken extends CancellationState {
  onCancellationRequested?(listener: () => void): { dispose(): void };
}

export function throwIfCancelled(token?: CancellationState): void {
  if (token?.isCancellationRequested) {
    throw new ScanCancelledError();
  }
}

export function isCancellationError(error: unknown): boolean {
  if (error instanceof ScanCancelledError) return true;
  if (error instanceof Error && error.name === 'CancellationError') return true;
  return false;
}
