import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Source_Code_Pro, Pixelify_Sans, Russo_One } from "next/font/google";
import { SafeArea } from "@coinbase/onchainkit/minikit";
import { minikitConfig } from "@/minikit.config";
import { RootProvider } from "./rootProvider";
import { MiniAppInit } from "./components/MiniAppInit";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1a1a2e",
  viewportFit: "cover",
  // Prevent zoom and ensure fixed viewport
};

export async function generateMetadata(): Promise<Metadata> {
  // Note: For truly dynamic user-specific previews, apps should fetch from
  // /api/og-metadata?wallet=XXX or ?fid=XXX and render custom OG images
  // This provides default metadata for the main app
  
  return {
    title: minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.description,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: minikitConfig.miniapp.name,
    },
    // Dynamic Open Graph metadata
    // Apps can override this by passing ?wallet= or ?fid= query params
    openGraph: {
      title: minikitConfig.miniapp.name,
      description: minikitConfig.miniapp.description,
      images: [minikitConfig.miniapp.heroImageUrl],
      type: 'website',
    },
    other: {
      "base:app_id": "697cc71cc0622780c63f6691",
      "fc:miniapp": JSON.stringify({
        version: minikitConfig.miniapp.version,
        imageUrl: minikitConfig.miniapp.heroImageUrl,
        button: {
          title: `Launch ${minikitConfig.miniapp.name}`,
          action: {
            name: `Launch ${minikitConfig.miniapp.name}`,
            type: "launch_miniapp",
          },
        },
      }),
    },
    icons: "/game/icons/lead.svg",
  };
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const pixelifySans = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const russoOne = Russo_One({
  variable: "--font-russo",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  preload: false,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning translate="no">
      <body className={`${inter.variable} ${sourceCodePro.variable} ${pixelifySans.variable} ${russoOne.variable}`} suppressHydrationWarning>
        {/* Load SDK from CDN and call ready() - guaranteed to work */}
        <Script
          id="miniapp-sdk-cdn"
          src="https://esm.sh/@farcaster/miniapp-sdk@0.2.2"
          strategy="beforeInteractive"
          onLoad={() => {
            console.log('[CDN] SDK loaded from esm.sh');
          }}
        />
        <Script
          id="miniapp-ready"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (async function() {
                console.log('[READY] Attempting to call ready()...');
                try {
                  // Wait for SDK to be available
                  let attempts = 0;
                  while (attempts < 50) {
                    if (typeof window.sdk !== 'undefined') {
                      console.log('[READY] SDK found, calling ready()...');
                      await window.sdk.actions.ready();
                      console.log('[READY] ✅ SUCCESS');
                      return;
                    }
                    attempts++;
                    await new Promise(r => setTimeout(r, 100));
                  }
                  console.error('[READY] ❌ SDK not found after 5 seconds');
                } catch (error) {
                  console.error('[READY] ❌ Error:', error);
                }
              })();
            `,
          }}
        />
        <RootProvider>
          <MiniAppInit />
          <SafeArea>{children}</SafeArea>
        </RootProvider>
      </body>
    </html>
  );
}
