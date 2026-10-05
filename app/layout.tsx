import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Observatorio de Integraciones · SIJUD",
  description: "Dashboard estadístico de integraciones judiciales del EJE No Penal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Geist:wght@300..700&family=JetBrains+Mono:wght@300..600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
