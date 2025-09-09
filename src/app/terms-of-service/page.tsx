'use client';

const sections = [
  {
    title: 'Agreement to Terms',
    content: `By accessing and using Intaj&apos;s website, platform, and services (collectively referred to as the "Services"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using the Services.`,
  },
  {
    title: 'Use License',
    content: `Upon subscribing to our Services, we grant you a limited, non-exclusive, non-transferable license to use our platform for your business purposes, subject to these terms and your subscription plan.

This license automatically terminates if you violate any of these restrictions or terminate your subscription. Upon termination, you must cease using our Services.`,
  },
  {
    title: 'Service Description',
    content: `Intaj provides an AI-powered chatbot platform that allows businesses to create, deploy, and manage conversational AI agents across multiple channels.

While we strive for high availability, we do not guarantee that our Services will be uninterrupted, timely, secure, or error-free. We reserve the right to modify, suspend, or discontinue any part of our Services at any time.`,
  },
  {
    title: 'Your Responsibilities',
    content: `You are responsible for:

• Maintaining the confidentiality of your account credentials
• All activities that occur under your account
• Ensuring your use of our Services complies with applicable laws
• The content and conversations your chatbots engage in
• Obtaining necessary consents from your end users
• Implementing appropriate privacy notices and policies`,
  },
  {
    title: 'Prohibited Uses',
    content: `You may not use our Services to:

• Violate any applicable laws or regulations
• Harass, abuse, or harm others
• Impersonate others or provide false information
• Transmit malicious code or interfere with our Services
• Attempt to gain unauthorized access to our systems
• Generate or promote harmful, discriminatory, or illegal content`,
  },
  {
    title: 'Payment Terms',
    content: `Subscription fees are billed in advance on a monthly or annual basis. You agree to pay all charges associated with your subscription plan.

If payment cannot be charged to your billing method or if you fail to pay, we reserve the right to suspend or terminate your access to the Services.`,
  },
  {
    title: 'Intellectual Property',
    content: `The Services, including all content, features, and functionality, are owned by Intaj and are protected by international copyright, trademark, and other intellectual property laws.

You retain ownership of your content and data. You grant us a license to host, use, and display such content as necessary to provide the Services.`,
  },
  {
    title: 'Limitation of Liability',
    content: `To the fullest extent permitted by law, Intaj shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Services.

Our liability for any direct damages shall be limited to the amount you paid for the Services during the 12 months preceding the incident.`,
  },
  {
    title: 'Indemnification',
    content: `You agree to indemnify and hold harmless Intaj and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Services or violation of these terms.`,
  },
  {
    title: 'Termination',
    content: `We may terminate or suspend your access to the Services immediately, without prior notice, for any reason, including breach of these Terms.

Upon termination, your right to use the Services will cease immediately. All provisions that by their nature should survive termination shall survive.`,
  },
  {
    title: 'Changes to Terms',
    content: `We reserve the right to modify these Terms at any time. We will notify you of significant changes by posting an updated version on our website or sending you a notification.

Your continued use of the Services after such modifications constitutes acceptance of the updated Terms.`,
  },
  {
    title: 'Governing Law',
    content: `These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction], without regard to its conflict of law provisions.`,
  },
  {
    title: 'Contact Information',
    content: `For any questions regarding these Terms, please contact us at:

Email: legal@intaj.ai
Address: [Your Company Address]`,
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="bg-white px-6 py-32 lg:px-8">
      <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-6 text-xl leading-8">
          Last updated:{' '}
          {new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        <div className="mt-10 max-w-2xl">
          {sections.map((section, index) => (
            <div key={index} className="mt-16">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">{section.title}</h2>
              <div className="mt-6 space-y-6">
                {section.content.split('\n\n').map((paragraph, pIndex) => (
                  <p key={pIndex} className="text-base leading-7">
                    {paragraph.split('\n').map((line, lIndex) => (
                      <span key={lIndex}>
                        {line}
                        {lIndex < paragraph.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
