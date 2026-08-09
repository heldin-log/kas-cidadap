// app/layout.tsx
import { metadata as siteMetadata } from "./metadata";
import "./globals.css";

export const metadata = siteMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased bg-zinc-50 text-zinc-950">
        {children}
      </body>
    </html>
  );
}