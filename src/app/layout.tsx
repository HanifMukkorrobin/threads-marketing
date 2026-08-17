import type { Metadata } from 'next';
import './globals.css';
import { IslandLayout } from '@/components/IslandLayout';

export const metadata: Metadata = {
  title: 'Threads Marketing Engine Studio',
  description: 'Autonomous AI Content & Thread Marketing Engine for Digital Products',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-canvas text-ink min-h-screen antialiased">
        <IslandLayout>{children}</IslandLayout>
      </body>
    </html>
  );
}


