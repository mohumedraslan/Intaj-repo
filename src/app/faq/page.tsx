<<<<<<< Updated upstream
export default function FAQPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-6">Frequently Asked Questions</h1>
      <ul className="space-y-4">
        <li>
          <strong>What is Intaj?</strong>
          <p className="text-gray-700">Intaj is a SaaS platform for automating your business with AI agents, chatbots, and more.</p>
        </li>
        <li>
          <strong>How do I contact support?</strong>
          <p className="text-gray-700">Email us at <a href="mailto:nabih.ai.agency@gmail.com" className="text-blue-600 hover:underline">nabih.ai.agency@gmail.com</a> or WhatsApp <a href="https://wa.me/201102481879" className="text-blue-600 hover:underline">+20 110 248 1879</a>.</p>
        </li>
        <li>
          <strong>Where can I learn more?</strong>
          <p className="text-gray-700">Visit our main website <a href="https://nabih.tech" className="text-blue-600 hover:underline">nabih.tech</a> or our platform <a href="https://rapt.nabih.tech" className="text-blue-600 hover:underline">rapt.nabih.tech</a>.</p>
        </li>
      </ul>
    </div>
  );
}
=======
<<<<<<< Updated upstream
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
=======
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  is_published: boolean;
}

interface GroupedFAQs {
  [category: string]: FAQ[];
}

export const revalidate = 3600; // Revalidate every hour

export default async function FAQPage() {
  const supabase = createClient();
  
  // Fetch published FAQs from Supabase
  const { data: faqs, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('is_published', true)
    .order('category');
  
  if (error) {
    console.error('Error fetching FAQs:', error);
    return (
      <div className="container mx-auto py-12">
        <h1 className="text-3xl font-bold mb-8">Frequently Asked Questions</h1>
        <p>Sorry, we couldn't load the FAQs at this time. Please try again later.</p>
      </div>
    );
  }

  // Group FAQs by category
  const groupedFAQs = faqs.reduce((acc: GroupedFAQs, faq: FAQ) => {
    const category = faq.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {});

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Frequently Asked Questions</h1>
      
      {Object.keys(groupedFAQs).length === 0 ? (
        <p>No FAQs available at this time.</p>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedFAQs).map(([category, categoryFaqs]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-2xl font-semibold">{category}</h2>
              <Accordion type="single" collapsible className="space-y-4">
                {categoryFaqs.map((faq) => (
                  <AccordionItem key={faq.id} value={`faq-${faq.id}`} className="border border-gray-200 rounded-lg p-2">
                    <AccordionTrigger className="text-lg font-medium">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-gray-600 pt-2">
                        {faq.answer}
                        {category === 'General' && (
                          <Link href="/contact-us" className="text-blue-600 hover:underline mt-2 inline-block">
                            Contact us to learn more
                          </Link>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
>>>>>>> Stashed changes
>>>>>>> Stashed changes
