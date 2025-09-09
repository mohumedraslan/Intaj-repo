'use client';

const sections = [
  {
    title: 'Introduction',
    content: `At Intaj, we take your privacy seriously. This privacy policy describes how we collect, use, and protect your personal information when you use our AI chatbot platform and services.

We are committed to ensuring that your privacy is protected and we comply with applicable data protection laws and regulations.`
  },
  {
    title: 'Information We Collect',
    content: `We may collect the following information:

• Personal identification information (name, email address, phone number)
• Company information
• Chat logs and conversation history
• Usage data and analytics
• Technical data (IP address, browser type, device information)
• Cookies and tracking data`
  },
  {
    title: 'How We Use Your Information',
    content: `We use the collected information for:

• Providing and maintaining our services
• Improving our chatbot performance
• Personalizing user experience
• Analyzing usage patterns
• Communicating with you about our services
• Sending promotional materials (with your consent)
• Complying with legal obligations`
  },
  {
    title: 'Data Storage and Security',
    content: `We implement appropriate security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. Your data is stored on secure servers and we use industry-standard encryption for data transmission.

We retain your information only for as long as necessary to provide our services and fulfill the purposes outlined in this policy.`
  },
  {
    title: 'Third-Party Services',
    content: `We may use third-party services that collect, monitor, and analyze data to help improve our services. These third-party service providers have their own privacy policies addressing how they use such information.`
  },
  {
    title: 'Your Rights',
    content: `You have the right to:

• Access your personal data
• Correct inaccurate data
• Request deletion of your data
• Object to processing of your data
• Data portability
• Withdraw consent

Contact us to exercise these rights.`
  },
  {
    title: 'Children&apos;s Privacy',
    content: `Our services are not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13.`
  },
  {
    title: 'Changes to This Policy',
    content: `We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the effective date.`
  },
  {
    title: 'Contact Us',
    content: `If you have any questions about this privacy policy, please contact us at:

Email: privacy@intaj.ai
Address: [Your Company Address]`
  }
];

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-white px-6 py-32 lg:px-8">
      <div className="mx-auto max-w-3xl text-base leading-7 text-gray-700">
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Privacy Policy</h1>
        <p className="mt-6 text-xl leading-8">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
