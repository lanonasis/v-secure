// Cross-platform event emitter for Vortex SDK

import type { VortexEvent, VortexEventHandler, VortexEventType } from '../types';

/**
 * Simple cross-platform event emitter
 * Works in Node.js, browsers, and workers
 */
export class VortexEventEmitter {
  private listeners = new Map<VortexEventType | '*', Set<VortexEventHandler<any>>>();

  /**
   * Subscribe to a specific event type
   */
  on<T = unknown>(type: VortexEventType, handler: VortexEventHandler<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);

    // Return unsubscribe function
    return () => this.off(type, handler);
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: VortexEventHandler<unknown>): () => void {
    if (!this.listeners.has('*')) {
      this.listeners.set('*', new Set());
    }
    this.listeners.get('*')!.add(handler);

    return () => this.offAll(handler);
  }

  /**
   * Unsubscribe from a specific event type
   */
  off<T = unknown>(type: VortexEventType, handler: VortexEventHandler<T>): void {
    const handlers = this.listeners.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Unsubscribe from all events
   */
  offAll(handler: VortexEventHandler<unknown>): void {
    const handlers = this.listeners.get('*');
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T = unknown>(type: VortexEventType, data: T): void {
    const event: VortexEvent<T> = {
      type,
      timestamp: new Date(),
      data,
    };

    // Notify specific type listeners
    const typeHandlers = this.listeners.get(type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${type}:`, error);
        }
      });
    }

    // Notify wildcard listeners
    const wildcardHandlers = this.listeners.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in wildcard event handler:`, error);
        }
      });
    }
  }

  /**
   * Wait for a specific event to occur (one-time)
   */
  once<T = unknown>(type: VortexEventType, timeoutMs?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;

      const handler: VortexEventHandler<T> = (event) => {
        if (timeoutId) clearTimeout(timeoutId);
        this.off(type, handler);
        resolve(event.data);
      };

      this.on(type, handler);

      if (timeoutMs) {
        timeoutId = setTimeout(() => {
          this.off(type, handler);
          reject(new Error(`Timeout waiting for event: ${type}`));
        }, timeoutMs);
      }
    });
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.listeners.clear();
  }

  /**
   * Get the number of listeners for a specific event type
   */
  listenerCount(type: VortexEventType): number {
    return this.listeners.get(type)?.size || 0;
  }
}
