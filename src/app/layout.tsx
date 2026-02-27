import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Afspraaq',
  description: 'Scheduling and booking system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#0A0A0A',
          color: '#FFFFFF',
        }}
      >
        {children}
      </body>
    </html>
  );
}
