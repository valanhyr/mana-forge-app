declare module 'klaro/dist/klaro-no-css' {
  export function render(config: unknown, options?: { show?: boolean; modal?: boolean }): void;
  export function show(config: unknown, modal?: boolean): void;
  export function getManager(config: unknown): {
    confirmed: boolean;
    watch(watcher: { update(): void }): void;
    unwatch(watcher: { update(): void }): void;
    loadConsents(): void;
    applyConsents(): void;
    resetConsents(): void;
  };
}
