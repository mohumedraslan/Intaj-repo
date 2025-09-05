import "./globals.css";
import Link from "next/link";
import Image from "next/image";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#f1f5f9" />
        <meta name="description" content="Intaj - Automate your business with AI agents, chatbots, and more. By Nabih.AI." />
      </head>
      <body className="bg-gray-50 min-h-screen">
        {/* Navigation Bar */}
        <nav className="bg-blue-50 border-b shadow-sm px-6 py-3 flex items-center gap-6 sticky top-0 z-50">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-700">
            <Image src="/logo.svg" alt="Intaj Logo" width={32} height={32} className="h-8 w-8" />
            Intaj
          </Link>
          <div className="flex gap-4 ml-6">
            <Link href="/about-us" className="text-blue-700 hover:underline font-medium">About Us</Link>
            <Link href="/services" className="text-blue-700 hover:underline font-medium">Services</Link>
            <Link href="/pricing" className="text-blue-700 hover:underline font-medium">Pricing</Link>
            <Link href="/faq" className="text-blue-700 hover:underline font-medium">FAQ</Link>
            <Link href="/contact-us" className="text-blue-700 hover:underline font-medium">Contact</Link>
            <Link href="/policy" className="text-blue-700 hover:underline font-medium">Policy</Link>
          </div>
          <Link href="/dashboard" className="hover:text-blue-600">Dashboard</Link>
          <Link href="/agents" className="hover:text-blue-600">Agents</Link>
          <Link href="/analytics" className="hover:text-blue-600">Analytics</Link>
          <Link href="/connections" className="hover:text-blue-600">Connections</Link>
          <div className="flex-1" />
          <Link href="/profile" className="hover:text-blue-600">Profile</Link>
          <Link href="/login" className="hover:text-blue-600">Login</Link>
          <Link href="/signup" className="hover:text-blue-600">Sign Up</Link>
        </nav>
        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 py-8 min-h-[80vh] flex-1">{children}</main>
        {/* Footer */}
        <footer className="bg-white border-t px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Intaj Logo" width={28} height={28} className="h-7 w-7" />
            <span className="font-semibold text-blue-700">Intaj</span>
            <span className="text-gray-400 ml-2">&copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-4">
            <a href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook">
              <Image src="/facebook.svg" alt="Facebook" width={24} height={24} className="h-6 w-6 hover:opacity-80" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">
              <Image src="/instagram.svg" alt="Instagram" width={24} height={24} className="h-6 w-6 hover:opacity-80" />
            </a>
            <a href="https://wa.me" target="_blank" rel="noopener" aria-label="WhatsApp">
              <Image src="/whatsapp.svg" alt="WhatsApp" width={24} height={24} className="h-6 w-6 hover:opacity-80" />
            </a>
            {/* Add more social icons as needed */}
          </div>
        </footer>
      </body>
    </html>
  );
}
