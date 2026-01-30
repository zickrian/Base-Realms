import type { Metadata, Viewport } from "next";
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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('[DEBUG] Script tag loaded - checking for SDK...');
              
              // Poll for SDK to be available (loaded by React)
              var checkCount = 0;
              var checkInterval = setInterval(function() {
                checkCount++;
                console.log('[DEBUG] Check #' + checkCount + ' - Looking for SDK...');
                
                // Check if window.miniappSdk exists (from CDN) or try global scope
                if (typeof window.miniappSdk !== 'undefined') {
                  clearInterval(checkInterval);
                  console.log('[DEBUG] Found miniappSdk, calling ready()...');
                  window.miniappSdk.actions.ready()
                    .then(function() { console.log('[DEBUG] ✅ Ready SUCCESS'); })
                    .catch(function(e) { console.error('[DEBUG] ❌ Ready FAILED:', e); });
                } else if (checkCount > 20) {
                  // Stop after 20 attempts (4 seconds)
                  clearInterval(checkInterval);
                  console.error('[DEBUG] ❌ SDK not found after 4 seconds');
                }
              }, 200);
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${sourceCodePro.variable} ${pixelifySans.variable} ${russoOne.variable}`} suppressHydrationWarning>
        <RootProvider>
          <MiniAppInit />
          <SafeArea>{children}</SafeArea>
        </RootProvider>
      </body>
    </html>
  );
}
