import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CampusBid — Student Verified Campus Auction Marketplace',
  description: 'Fair, transparent, and anti-sniping campus auction marketplace for university students.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <footer className="bg-white border-t border-slate-200 py-10 mt-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
              <p className="font-semibold text-slate-700">CampusBid Marketplace — Fair & Anti-Sniping Campus Auctions</p>
              <p className="mt-1">Only verified students with valid campus credentials can bid and sell.</p>
              <p className="mt-4 text-xs text-slate-400">© 2026 CampusBid. Built with Next.js, Express, Socket.IO & Prisma.</p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
