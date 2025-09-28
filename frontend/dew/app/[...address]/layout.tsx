import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Site Content",
  description: "Direct site content rendering",
};

export default function AddressLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}