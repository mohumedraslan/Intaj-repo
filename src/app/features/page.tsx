import Image from "next/image";

export default function FeaturesPage() {
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-50 flex flex-col items-center py-16 px-4">
      <h1 className="text-4xl md:text-5xl font-extrabold text-blue-700 mb-8 drop-shadow-lg">Features</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 w-full max-w-7xl">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center border border-blue-100 hover:scale-105 transition-transform">
          <Image src="/ai-chatbots.svg" alt="AI Chatbots" width={56} height={56} className="mb-3" />
          <h3 className="font-bold text-lg mb-1 text-blue-700">AI Chatbots</h3>
          <p className="text-gray-600 text-sm">Conversational bots for support, sales, and automation. Easy to deploy and manage.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center border border-green-100 hover:scale-105 transition-transform">
          <Image src="/automation-agents.svg" alt="Automation Agents" width={56} height={56} className="mb-3" />
          <h3 className="font-bold text-lg mb-1 text-green-700">Automation Agents</h3>
          <p className="text-gray-600 text-sm">Automate sales, marketing, and content workflows with powerful AI agents.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center border border-indigo-100 hover:scale-105 transition-transform">
          <Image src="/agents-coming-soon.svg" alt="Integrations" width={56} height={56} className="mb-3" />
          <h3 className="font-bold text-lg mb-1 text-indigo-700">Integrations</h3>
          <p className="text-gray-600 text-sm">Connect to Facebook, WhatsApp, Instagram, and more. Seamless integrations for your business.</p>
        </div>
      </div>
    </div>
  );
}
