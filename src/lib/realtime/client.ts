"use client";

import * as React from "react";
import type Pusher from "pusher-js";

let pusherInstance: Pusher | null = null;

function getClient(): Pusher | null {
  if (pusherInstance) return pusherInstance;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;
  // Lazy-load the client SDK only when wired up.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PusherClient = require("pusher-js");
  pusherInstance = new PusherClient(key, { cluster });
  return pusherInstance;
}

/**
 * Subscribe to a Pusher channel and run `onEvent(name, data)` for every
 * event. Returns a cleanup. If Pusher isn't configured, returns a no-op
 * — the page should still poll/refresh for updates.
 */
export function useRealtimeSubscription(
  channelName: string | null,
  onEvent: (event: string, data: unknown) => void,
) {
  React.useEffect(() => {
    if (!channelName) return;
    const client = getClient();
    if (!client) return;
    const channel = client.subscribe(channelName);
    channel.bind_global((eventName: string, data: unknown) => {
      // pusher_internal:* events are for connection lifecycle — ignore.
      if (eventName.startsWith("pusher")) return;
      onEvent(eventName, data);
    });
    return () => {
      try {
        channel.unbind_global();
        client.unsubscribe(channelName);
      } catch {
        /* ignore */
      }
    };
  }, [channelName, onEvent]);
}

/** True iff Pusher is wired up via NEXT_PUBLIC_PUSHER_KEY. */
export function isRealtimeConfigured() {
  return !!process.env.NEXT_PUBLIC_PUSHER_KEY;
}
