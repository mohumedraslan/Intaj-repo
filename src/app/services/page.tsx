export default function ServicesPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-6">Our Services</h1>
      <ul className="space-y-4">
        <li>
          <strong>AI Chatbots</strong>
          <p className="text-gray-700">Conversational AI for customer support, sales, and more.</p>
        </li>
        <li>
          <strong>Automation Agents</strong>
          <p className="text-gray-700">Automate repetitive business tasks and workflows.</p>
        </li>
        <li>
          <strong>Integrations</strong>
          <p className="text-gray-700">Connect your favorite platforms (WhatsApp, Facebook, Instagram, and more).</p>
        </li>
        <li>
          <strong>Custom Solutions</strong>
          <p className="text-gray-700">We build custom AI automations for your unique needs.</p>
        </li>
      </ul>
    </div>
  );
}
