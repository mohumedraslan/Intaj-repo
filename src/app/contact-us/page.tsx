export default function ContactUsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-6">Contact Us</h1>
      <p className="text-gray-700 mb-4">Have questions or need support? Reach out to us:</p>
      <ul className="mb-4 space-y-2">
        <li>
          Email:{' '}
          <a href="mailto:nabih.ai.agency@gmail.com" className="text-blue-600 hover:underline">
            nabih.ai.agency@gmail.com
          </a>
        </li>
        <li>
          WhatsApp:{' '}
          <a href="https://wa.me/201102481879" className="text-blue-600 hover:underline">
            +20 110 248 1879
          </a>
        </li>
        <li>
          X (Twitter):{' '}
          <a href="https://x.com/ai_nabih62763" className="text-blue-600 hover:underline">
            @ai_nabih62763
          </a>
        </li>
        <li>
          Main Website:{' '}
          <a href="https://nabih.tech" className="text-blue-600 hover:underline">
            nabih.tech
          </a>
        </li>
        <li>
          Platform:{' '}
          <a href="https://rapt.nabih.tech" className="text-blue-600 hover:underline">
            rapt.nabih.tech
          </a>
        </li>
      </ul>
      <p className="text-gray-500">We usually respond within 24 hours.</p>
    </div>
  );
}
