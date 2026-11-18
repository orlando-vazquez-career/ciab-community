import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CIAB Community | Inteligencia artificial en Bolivia",
  description:
    "Una comunidad boliviana para compartir información confiable, debatir inteligencia artificial y reconocer buenas contribuciones.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
        {children}
      </body>
    </html>
  );
}
