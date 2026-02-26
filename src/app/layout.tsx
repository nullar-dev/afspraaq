import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nullar CI/CD',
  description: 'Production-ready CI/CD pipeline for Next.js projects',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
