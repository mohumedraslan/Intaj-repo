
import "./globals.css";
import Link from "next/link";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/logo-white.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#0a0a0b" />
        <meta name="description" content="Intaj - The AI Automation Platform That Never Sleeps. Transform your business with intelligent chatbots and automation." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body 
        className="min-h-screen bg-[#0a0a0b] text-[#f8fafc] font-sans antialiased overflow-x-hidden"
        suppressHydrationWarning
      >
        {/* Main Content */}
        <main className="w-full min-h-[calc(100vh-4rem)]">
          {children}
        </main>

        {/* Footer */}
        <footer className="w-full bg-[#141517] border-t border-gray-700/50">
          <div className="max-w-7xl mx-auto px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              {/* Logo & Info */}
              <div className="col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <div className="w-5 h-5 bg-white rounded-sm opacity-90"></div>
                  </div>
                  <div>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">Intaj</span>
                    <div className="text-xs text-gray-400">AI Automation Hub</div>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Transform your business with intelligent chatbots and seamless automation. Built for the future of customer interaction.
                </p>
                <div className="flex gap-4">
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                    aria-label="Follow us on Twitter"
                    title="Twitter"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                    aria-label="Visit our GitHub repository"
                    title="GitHub"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                  </a>
                  <a 
                    href="#" 
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                    aria-label="Follow us on LinkedIn"
                    title="LinkedIn"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                  </a>
                </div>
              </div>

              {/* Product Links */}
              <div className="col-span-1">
                <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
                <ul className="space-y-3">
                  <li><Link href="/services" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Services</Link></li>
                  <li><Link href="/pricing" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Pricing</Link></li>
                  <li><Link href="/integrations" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Integrations</Link></li>
                  <li><Link href="/docs" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Documentation</Link></li>
                </ul>
              </div>

              {/* Company Links */}
              <div className="col-span-1">
                <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
                <ul className="space-y-3">
                  <li><Link href="/about" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">About</Link></li>
                  <li><Link href="/blog" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Blog</Link></li>
                  <li><Link href="/careers" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Careers</Link></li>
                  <li><Link href="/contact" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Contact</Link></li>
                </ul>
              </div>

              {/* Legal Links */}
              <div className="col-span-1">
                <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
                <ul className="space-y-3">
                  <li><Link href="/privacy" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Terms of Service</Link></li>
                  <li><Link href="/security" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Security</Link></li>
                  <li><Link href="/compliance" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Compliance</Link></li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-700/50 mt-12 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-gray-400 text-sm">
                  © {new Date().getFullYear()} Intaj. All rights reserved.
                </div>
                <div className="flex items-center gap-4">
                  <Link href="/terms" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Terms</Link>
                  <Link href="/privacy" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Privacy</Link>
                  <Link href="/cookies" className="text-gray-400 hover:text-blue-400 transition-colors text-sm">Cookies</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
