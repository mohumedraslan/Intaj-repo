'use client';

import Link from 'next/link';

interface JobPosting {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Contract';
  description: string;
}

const jobPostings: JobPosting[] = [
  {
    id: 'fe-dev-1',
    title: 'Senior Frontend Developer',
    department: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
    description: 'Join our team to build the next generation of AI-powered chatbot interfaces.',
  },
  {
    id: 'ai-eng-1',
    title: 'AI/ML Engineer',
    department: 'AI Research',
    location: 'Remote',
    type: 'Full-time',
    description: 'Help us develop cutting-edge language models and improve our AI capabilities.',
  },
  // Add more job postings as needed
];

const values = [
  {
    name: 'Innovation First',
    description: "We're committed to pushing the boundaries of what's possible in AI and chatbot technology.",
    icon: '🚀',
  },
  {
    name: 'Customer Success',
    description: "Our customers' success is our success. We're dedicated to delivering exceptional value.",
    icon: '🎯',
  },
  {
    name: 'Collaborative Spirit',
    description: 'We believe the best ideas come from diverse perspectives working together.',
    icon: '🤝',
  },
  {
    name: 'Continuous Learning',
    description: 'We encourage continuous learning and professional development.',
    icon: '📚',
  },
];

const perks = [
  {
    name: 'Remote-first culture',
    description: 'Work from anywhere in the world',
  },
  {
    name: 'Competitive compensation',
    description: 'Salary, equity, and benefits that reward your expertise',
  },
  {
    name: 'Learning budget',
    description: '$2,500 annual budget for courses and conferences',
  },
  {
    name: 'Health & wellness',
    description: 'Comprehensive health coverage and wellness programs',
  },
  {
    name: 'Flexible time off',
    description: 'Unlimited PTO policy that encourages work-life balance',
  },
  {
    name: 'Latest equipment',
    description: 'Your choice of high-end laptop and accessories',
  },
];

export default function CareersPage() {
  return (
    <div className="bg-white">
      {/* Hero section */}
      <div className="relative isolate">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Join Us in Shaping the Future of AI
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              We&apos;re building the future of customer engagement through AI-powered conversations.
              Join our team of passionate innovators and make an impact.
            </p>
          </div>
        </div>
      </div>

      {/* Values section */}
      <div className="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Our Values</h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            These core values guide everything we do at Intaj.
          </p>
        </div>
        <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 text-base leading-7 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-4">
          {values.map((value) => (
            <div key={value.name} className="relative pl-9">
              <dt className="inline font-semibold text-gray-900">
                <span className="absolute left-1 top-1 text-2xl">{value.icon}</span>
                {value.name}
              </dt>
              <dd className="inline">{' ' + value.description}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Open positions */}
      <div className="mx-auto mt-32 max-w-7xl px-6 sm:mt-40 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Open Positions</h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Join our team and help us build the future of conversational AI.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
          {jobPostings.map((job) => (
            <div
              key={job.id}
              className="flex flex-col items-start justify-between rounded-2xl bg-white p-8 ring-1 ring-gray-200 hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-center gap-x-4 text-xs w-full">
                <span className="text-gray-500">{job.department}</span>
                <span className="text-gray-500">&bull;</span>
                <span className="text-gray-500">{job.location}</span>
                <span className="text-gray-500">&bull;</span>
                <span className="text-gray-500">{job.type}</span>
              </div>
              <div className="group relative w-full">
                <h3 className="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
                  <Link href={`/careers/${job.id}`}>
                    <span className="absolute inset-0" />
                    {job.title}
                  </Link>
                </h3>
                <p className="mt-5 line-clamp-3 text-sm leading-6 text-gray-600">{job.description}</p>
              </div>
              <div className="mt-6 flex w-full items-center gap-x-2">
                <div className="text-sm font-medium text-primary-600 hover:text-primary-500">
                  Learn more <span aria-hidden="true">&rarr;</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Perks section */}
      <div className="mx-auto mt-32 max-w-7xl px-6 sm:mt-40 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Why Intaj?</h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            We offer competitive compensation and great perks to help you do your best work.
          </p>
        </div>
        <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {perks.map((perk) => (
            <div key={perk.name} className="flex flex-col-reverse">
              <dt className="text-base leading-7 text-gray-600">{perk.description}</dt>
              <dd className="text-2xl font-bold leading-9 tracking-tight text-gray-900">{perk.name}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* CTA section */}
      <div className="mx-auto mt-32 max-w-7xl sm:mt-40 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16">
          <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Don&apos;t see a role that fits?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300">
            We&apos;re always looking for talented individuals. Send us your resume and we&apos;ll keep it on file for future opportunities.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="mailto:careers@intaj.ai"
              className="rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
