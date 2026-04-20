import type { RealtimeServer } from "./types";

/**
 * Pusher server adapter.
 *
 * In dev/local without PUSHER credentials, the trigger is a no-op
 * (logs to console). With real credentials it fires through `pusher`.
 *
 * Provider abstraction lives in ./types — swap this file to migrate
 * to Ably / Supabase Realtime / self-hosted Socket.IO without touching
 * feature code.
 */
// `pusher` exposes the class as a CommonJS export — Node ESM interop
// surfaces it as `mod.default`, but the types don't declare a default
// export. We use `unknown` + a tiny shape rather than fight the types.
type PusherClient = {
  trigger: (channel: string, event: string, data: unknown) => Promise<unknown>;
};

class PusherServer implements RealtimeServer {
  private client: PusherClient | null = null;
  private initPromise: Promise<void> | null = null;

  private async ensureClient(): Promise<PusherClient | null> {
    if (this.client) return this.client;
    if (
      !process.env.PUSHER_APP_ID ||
      !process.env.PUSHER_KEY ||
      !process.env.PUSHER_SECRET ||
      !process.env.PUSHER_CLUSTER
    ) {
      return null;
    }
    if (!this.initPromise) {
      this.initPromise = (async () => {
        const mod = (await import("pusher")) as unknown as {
          default: new (opts: Record<string, unknown>) => PusherClient;
        };
        const Pusher = mod.default;
        this.client = new Pusher({
          appId: process.env.PUSHER_APP_ID!,
          key: process.env.PUSHER_KEY!,
          secret: process.env.PUSHER_SECRET!,
          cluster: process.env.PUSHER_CLUSTER!,
          useTLS: true,
        });
      })();
    }
    await this.initPromise;
    return this.client;
  }

  async trigger(channel: string, event: string, data: unknown) {
    const client = await this.ensureClient();
    if (!client) {
      // No-op in dev when PUSHER_* not configured. Keep visible so it's
      // obvious why the order board isn't lighting up.
      console.info("[realtime/no-op] %s → %s", channel, event);
      return;
    }
    try {
      await client.trigger(channel, event, data);
    } catch (err) {
      console.error("[realtime/pusher] trigger failed", err);
    }
  }
}

export const pusherServer: RealtimeServer = new PusherServer();
