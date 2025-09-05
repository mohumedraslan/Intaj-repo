export default function PricingPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-6">Pricing</h1>
      <p className="text-gray-700 mb-4">Choose the plan that fits your business. All plans include access to our AI agents and automation tools.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <h2 className="font-bold text-lg mb-2">Free</h2>
          <div className="text-2xl font-extrabold text-blue-700 mb-2">$0</div>
          <ul className="text-gray-700 text-sm mb-4 list-disc list-inside">
            <li>1 AI agent</li>
            <li>Basic automations</li>
            <li>Email support</li>
          </ul>
          <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition">Get Started</button>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center border-2 border-blue-700">
          <h2 className="font-bold text-lg mb-2">Pro</h2>
          <div className="text-2xl font-extrabold text-blue-700 mb-2">$29/mo</div>
          <ul className="text-gray-700 text-sm mb-4 list-disc list-inside">
            <li>Up to 10 AI agents</li>
            <li>Advanced automations</li>
            <li>Priority support</li>
          </ul>
          <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition">Start Pro</button>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <h2 className="font-bold text-lg mb-2">Enterprise</h2>
          <div className="text-2xl font-extrabold text-blue-700 mb-2">Custom</div>
          <ul className="text-gray-700 text-sm mb-4 list-disc list-inside">
            <li>Unlimited agents</li>
            <li>Custom automations</li>
            <li>Dedicated support</li>
          </ul>
          <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition">Contact Sales</button>
        </div>
      </div>
    </div>
  );
}
