export default function FAQPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-6">Frequently Asked Questions</h1>
      <ul className="space-y-4">
        <li>
          <strong>What is Intaj?</strong>
          <p className="text-gray-700">
            Intaj is a SaaS platform for automating your business with AI agents, chatbots, and
            more.
          </p>
        </li>
        <li>
          <strong>How do I contact support?</strong>
          <p className="text-gray-700">
            Email us at{' '}
            <a href="mailto:nabih.ai.agency@gmail.com" className="text-blue-600 hover:underline">
              nabih.ai.agency@gmail.com
            </a>{' '}
            or WhatsApp{' '}
            <a href="https://wa.me/201102481879" className="text-blue-600 hover:underline">
              +20 110 248 1879
            </a>
            .
          </p>
        </li>
        <li>
          <strong>Where can I learn more?</strong>
          <p className="text-gray-700">
            Visit our main website{' '}
            <a href="https://nabih.tech" className="text-blue-600 hover:underline">
              nabih.tech
            </a>{' '}
            or our platform{' '}
            <a href="https://rapt.nabih.tech" className="text-blue-600 hover:underline">
              rapt.nabih.tech
            </a>
            .
          </p>
        </li>
      </ul>
    </div>
  );
}
