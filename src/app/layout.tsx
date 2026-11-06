import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers/providers";
import { themeInitScript } from "@/components/providers/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Everyday", template: "%s · Everyday" },
  description: "Calories, macros and training — logged in seconds.",
  applicationName: "Everyday",
  appleWebApp: { capable: true, title: "Everyday", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
