"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push("/home");
  }, [router]);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      color: "var(--color-text-cream)",
      fontFamily: "var(--font-pixelify), cursive",
    }}>
      Redirecting...
    </div>
  );
}
