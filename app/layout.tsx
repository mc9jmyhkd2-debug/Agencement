import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Atelier — Cuisine sous escalier',
  description: 'Cotes, débits et suivi de fabrication de votre cuisine en L.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="fr"><body>{children}</body></html>;
}
