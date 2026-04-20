/**
 * Provider-agnostic realtime contract.
 * The current implementation lives in `pusher.ts`; swap the import in
 * `index.ts` to migrate (e.g., to Ably) without touching feature code.
 */
export interface RealtimeServer {
  trigger(channel: string, event: string, data: unknown): Promise<void>;
}

export interface RealtimeClientConfig {
  key: string;
  cluster: string;
}

/** Shared event names so client + server agree on the wire. */
export const REALTIME_EVENTS = {
  ORDER_CREATED: "order.created",
  ORDER_UPDATED: "order.updated",
  ORDER_READY: "order.ready",
  KDS_TICK: "kds.tick",
} as const;

export function tenantChannel(tenantId: string) {
  return `private-tenant-${tenantId}`;
}
