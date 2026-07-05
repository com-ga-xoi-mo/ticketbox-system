export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

export interface IEventPublisher {
  publish(eventName: string, payload: unknown, options?: any): Promise<void>;
}
