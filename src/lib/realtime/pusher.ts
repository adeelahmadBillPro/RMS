import type { RealtimeServer } from "./types";

/**
 * Pusher server adapter.
 *
 * In Phase 1 we don't add the `pusher` npm dependency yet (no realtime
 * features ship in Phase 1). When Phase 2 lights up the order board,
 * uncomment the dynamic import below and add `pusher` + `pusher-js`
 * to package.json.
 */
class PusherServer implements RealtimeServer {
  async trigger(channel: string, event: string, data: unknown) {
    if (!process.env.PUSHER_APP_ID) {
      // No-op when not configured (dev-time)
      console.info("[realtime/mock] %s → %s", channel, event, data);
      return;
    }
    // const Pusher = (await import("pusher")).default;
    // const client = new Pusher({ ... });
    // await client.trigger(channel, event, data);
    console.info("[realtime/pusher] %s → %s", channel, event, data);
  }
}

export const pusherServer: RealtimeServer = new PusherServer();
