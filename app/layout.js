import { Manrope, Sora } from 'next/font/google';
import './globals.css';
import 'katex/dist/katex.min.css';

const bodyFont = Manrope({
  subsets: ['latin'],
  variable: '--font-body'
});

const displayFont = Sora({
  subsets: ['latin'],
  variable: '--font-display'
});

export const metadata = {
  title: 'Assessment Portal',
  description: 'Secure assessment portal'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
