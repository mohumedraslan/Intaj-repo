// src/app/connections/page.tsx
import Image from "next/image";

export default function ConnectionsPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8">Connections & Integrations</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center opacity-60">
          <Image src="/facebook.svg" alt="Facebook" width={40} height={40} className="h-10 w-10 mb-2" />
          <h3 className="font-bold text-lg mb-1">Facebook</h3>
          <p className="text-gray-500 text-sm mb-2">Connect your Facebook page.</p>
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center opacity-60">
          <Image src="/instagram.svg" alt="Instagram" width={40} height={40} className="h-10 w-10 mb-2" />
          <h3 className="font-bold text-lg mb-1">Instagram</h3>
          <p className="text-gray-500 text-sm mb-2">Connect your Instagram account.</p>
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center opacity-60">
          <Image src="/whatsapp.svg" alt="WhatsApp" width={40} height={40} className="h-10 w-10 mb-2" />
          <h3 className="font-bold text-lg mb-1">WhatsApp</h3>
          <p className="text-gray-500 text-sm mb-2">Connect your WhatsApp business.</p>
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>
      </div>
      <div className="bg-blue-50 rounded-lg p-6 shadow flex flex-col items-center">
        <h4 className="font-bold text-blue-700 mb-2">Integrations coming soon!</h4>
        <p className="text-gray-700 text-sm">You’ll soon be able to connect Facebook, Instagram, WhatsApp, and more.</p>
      </div>
    </div>
  );
}
