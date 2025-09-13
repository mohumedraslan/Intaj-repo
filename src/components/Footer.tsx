import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-700 via-cyan-500 to-blue-400 text-white px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border-t-4 border-blue-800">
      <Link href="/" className="flex items-center gap-3">
        <Image src="/logo.svg" alt="Intaj Logo" width={32} height={32} className="h-8 w-8" />
        <span className="font-extrabold text-2xl tracking-tight">Intaj</span>
        <span className="text-white/70 ml-2 font-medium">&copy; {new Date().getFullYear()}</span>
      </Link>
      <div className="flex gap-6 text-lg">
        <Link href="/platform/features" className="hover:underline hover:text-yellow-200">Features</Link>
        <Link href="/pricing" className="hover:underline hover:text-yellow-200">Pricing</Link>
        <Link href="/solutions/automation" className="hover:underline hover:text-yellow-200">Services</Link>
      </div>
      <div className="flex flex-col md:flex-row gap-2 md:gap-4 text-sm text-white/90">
        <Link href="/about-us" className="hover:underline hover:text-yellow-200">About Us</Link>
        <Link href="/pricing#faq" className="hover:underline hover:text-yellow-200">FAQ</Link>
        <Link href="/contact-us" className="hover:underline hover:text-yellow-200">Contact</Link>
        <Link href="/policy" className="hover:underline hover:text-yellow-200">Policy</Link>
      </div>
      <div className="flex gap-4">
        <a
          href="https://facebook.com"
          target="_blank"
          rel="noopener"
          aria-label="Connect Facebook"
        >
          <Image src="/facebook.png" alt="Connect Facebook" width={32} height={32} className="h-8 w-8 hover:opacity-80 rounded-lg" />
        </a>
        <a href="#" aria-label="Connect Instagram" className="pointer-events-none opacity-60">
          <Image src="/instagram.png" alt="Connect Instagram (coming soon)" width={32} height={32} className="h-8 w-8 rounded-lg" />
        </a>
      </div>
    </footer>
  );
}
