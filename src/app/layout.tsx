import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plataforma Telespazio",
  description: "Sistema interno Telespazio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const theme = localStorage.getItem("theme") === "light" ? "light" : "dark"; document.documentElement.classList.toggle("dark", theme === "dark"); document.documentElement.dataset.theme = theme; } catch { document.documentElement.classList.add("dark"); } })();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
