import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sensaura Dashboard",
  description: "Sensaura MVP web dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
