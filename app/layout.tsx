import './globals.css';

import { Analytics } from '@vercel/analytics/next';

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL?.startsWith('http')
    ? process.env.NEXT_PUBLIC_APP_URL
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://datrep.vercel.app';

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'DatRep — AI-Powered Data Analysis',
    template: '%s | DatRep',
  },
  description:
    'Upload CSV or Excel files and get instant AI-generated insights, charts, and data quality analysis. DatRep turns your data into actionable reports.',
  keywords: ['data analysis', 'AI insights', 'CSV', 'Excel', 'analytics', 'data visualization', 'business intelligence'],
  authors: [{ name: 'DatRep' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'DatRep',
    title: 'DatRep — AI-Powered Data Analysis',
    description: 'Upload CSV or Excel files and get instant AI-generated insights, charts, and data quality analysis.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DatRep — AI-Powered Data Analysis',
    description: 'Upload CSV or Excel files and get instant AI-generated insights, charts, and data quality analysis.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen w-full flex-col">{children}</body>
      <Analytics />
    </html>
  );
}
