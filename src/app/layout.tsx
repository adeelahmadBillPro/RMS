import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { APP } from "@/lib/config/app";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "@/components/providers/session-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: APP.name,
    template: `%s · ${APP.name}`,
  },
  description: APP.description,
  metadataBase: new URL(APP.url),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body>
        <ThemeProvider>
          <SessionProvider>
            <Toaster>{children}</Toaster>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
