import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "365Soft Labs Demo",
  description: "Human-in-the-loop agentic software development demo"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
