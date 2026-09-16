import './globals.css'; // Vi opretter denne fil i næste punkt
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Food Standard Analyzer',
  description: 'AI-drevet udtrækning af fødevarestandard krav',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
