import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Afspraaq',
  description: 'Scheduling and booking system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
