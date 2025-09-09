import Image from 'next/image';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-700 via-cyan-500 to-blue-400 text-white px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border-t-4 border-blue-800">
      <div className="flex items-center gap-3">
        <Image src="/logo.svg" alt="Intaj Logo" width={32} height={32} className="h-8 w-8" />
        <span className="font-extrabold text-2xl tracking-tight">Intaj</span>
        <span className="text-white/70 ml-2 font-medium">&copy; {new Date().getFullYear()}</span>
      </div>
      <div className="flex gap-6 text-lg">
        <Link href="/features" className="hover:underline hover:text-yellow-200">
          Features
        </Link>
        <Link href="/pricing" className="hover:underline hover:text-yellow-200">
          Pricing
        </Link>
        <Link href="/services" className="hover:underline hover:text-yellow-200">
          Services
        </Link>
      </div>
      <div className="flex flex-col md:flex-row gap-2 md:gap-4 text-sm text-white/90">
        <Link href="/about-us" className="hover:underline hover:text-yellow-200">
          About Us
        </Link>
        <Link href="/faq" className="hover:underline hover:text-yellow-200">
          FAQ
        </Link>
        <Link href="/contact-us" className="hover:underline hover:text-yellow-200">
          Contact
        </Link>
        <Link href="/policy" className="hover:underline hover:text-yellow-200">
          Policy
        </Link>
      </div>
      <div className="flex gap-4">
        <a
          href="https://www.facebook.com/login.php?skip_api_login=1&api_key=1958056535017695&kid_directed_site=0&app_id=1958056535017695&signed_next=1&next=https%3A%2F%2Fwww.facebook.com%2Fv18.0%2Fdialog%2Foauth%3Fclient_id%3D1958056535017695%26redirect_uri%3Dhttps%253A%252F%252Fintaj.nabih.tech%252Fapi%252Fauth%252Fcallback%252Ffacebook%26scope%3Dpages_show_list%252Cpages_messaging%252Cinstagram_basic%252Cinstagram_manage_messages%26response_type%3Dcode%26ret%3Dlogin%26fbapp_pres%3D0%26logger_id%3Db9220a24-ee27-4a9f-b18f-2dd53088fd79%26tp%3Dunspecified&cancel_url=https%3A%2F%2Fintaj.nabih.tech%2Fapi%2Fauth%2Fcallback%2Ffacebook%3Ferror%3Daccess_denied%26error_code%3D200%26error_description%3DPermissions%2Berror%26error_reason%3Duser_denied%23_%3D_&display=page&locale=en_GB&pl_dbl=0"
          target="_blank"
          rel="noopener"
          aria-label="Connect Facebook"
        >
          <Image
            src="/facebook.png"
            alt="Connect Facebook"
            width={32}
            height={32}
            className="h-8 w-8 hover:opacity-80 rounded-lg"
          />
        </a>
        <a href="#" aria-label="Connect Instagram" className="pointer-events-none opacity-60">
          <Image
            src="/instagram.png"
            alt="Connect Instagram (coming soon)"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg"
          />
        </a>
      </div>
    </footer>
  );
}
