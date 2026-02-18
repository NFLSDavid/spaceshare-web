/**
 * Observer Pattern: DomainEventBus provides a typed publish/subscribe bus for
 * domain events. Services emit events after core operations; observers handle
 * side effects (emails, notifications, analytics, etc.).
 *
 * To add a new event: extend EventMap, then register handlers in event-observers.ts.
 * Services never need to know what happens after they emit.
 */

export type EventMap = {
  /** Fired after a new user account is created. */
  "user.registered": { email: string; firstName: string; verifyUrl: string };
  /** Fired when a user requests a (re)send of their verification email. */
  "user.verification_requested": {
    email: string;
    firstName: string;
    verifyUrl: string;
  };
  /** Fired when a user requests a password reset. */
  "user.forgot_password": {
    email: string;
    firstName: string;
    resetUrl: string;
  };
  /** Fired after a new listing is published. */
  "listing.created": {
    hostId: string;
    title: string;
    price: number;
    latitude: number;
    longitude: number;
  };
};

type EventHandler<T> = (data: T) => void | Promise<void>;

export class DomainEventBus {
  private readonly handlers = new Map<string, EventHandler<unknown>[]>();

  on<K extends keyof EventMap>(
    event: K,
    handler: EventHandler<EventMap[K]>,
  ): void {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler as EventHandler<unknown>);
  }

  /**
   * Emit fires all registered handlers asynchronously (fire-and-forget).
   * A failed handler logs an error but never blocks the caller.
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      Promise.resolve(handler(data)).catch((err) =>
        console.error(`[EventBus] Handler for "${event}" failed:`, err),
      );
    }
  }
}

export const eventBus = new DomainEventBus();
