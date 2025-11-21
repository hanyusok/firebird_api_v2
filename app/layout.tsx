import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Firebird API Service',
  description: 'RESTful API service for Firebird databases',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

