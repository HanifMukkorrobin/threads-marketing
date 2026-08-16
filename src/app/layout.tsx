import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Threads Marketing Engine',
  description: 'High-converting Threads marketing and thread-building platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-threads-bg text-threads-text min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
