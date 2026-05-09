import type { Metadata } from 'next';
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['300', '400', '500', '600'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Quantum Circuit Visualizer',
  description: 'Enterprise quantum circuit design, simulation, and visualization platform',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} 
                    bg-void-900 text-slate-100 font-body antialiased overflow-hidden`}
      >
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(13,16,37,0.95)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#e2e8f0',
              backdropFilter: 'blur(20px)',
            },
          }}
        />
      </body>
    </html>
  );
}
