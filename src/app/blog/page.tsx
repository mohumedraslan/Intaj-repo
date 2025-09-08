'use client';

import Link from 'next/link';
import Image from 'next/image';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  author: {
    name: string;
    avatar: string;
  };
  category: string;
  imageUrl: string;
  readTime: string;
}

const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Building Multi-Channel Chatbots with Intaj',
    excerpt: 'Learn how to create and deploy chatbots across WhatsApp, Facebook, and Instagram using Intaj platform.',
    date: 'Sept 7, 2025',
    author: {
      name: 'Team Intaj',
      avatar: '/team/avatar1.jpg'
    },
    category: 'Tutorials',
    imageUrl: '/blog/chatbot-tutorial.jpg',
    readTime: '5 min read'
  },
  // Add more blog posts here
];

export default function BlogPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative isolate overflow-hidden bg-gradient-to-b from-primary-100/20">
        <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 sm:pb-32 lg:flex lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl lg:mx-0 lg:max-w-xl lg:flex-shrink-0 lg:pt-8">
            <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Latest Insights & Updates
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Stay updated with the latest trends in AI chatbots, customer service automation,
              and best practices for multi-channel engagement.
            </p>
          </div>
        </div>
      </div>

      {/* Featured Posts */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Featured Articles</h2>
          <p className="mt-2 text-lg leading-8 text-gray-600">
            Discover insights from our team of experts and industry leaders.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl auto-rows-fr grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {blogPosts.map((post) => (
            <article
              key={post.id}
              className="relative isolate flex flex-col justify-end overflow-hidden rounded-2xl bg-gray-900 px-8 pb-8 pt-80 sm:pt-48 lg:pt-80"
            >
              <Image
                src={post.imageUrl}
                alt={post.title}
                className="absolute inset-0 -z-10 h-full w-full object-cover"
                width={400}
                height={600}
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-gray-900 via-gray-900/40" />
              <div className="absolute inset-0 -z-10 rounded-2xl ring-1 ring-inset ring-gray-900/10" />

              <div className="flex flex-wrap items-center gap-y-1 overflow-hidden text-sm leading-6 text-gray-300">
                <time dateTime={post.date} className="mr-8">
                  {post.date}
                </time>
                <div className="-ml-4 flex items-center gap-x-4">
                  <svg viewBox="0 0 2 2" className="-ml-0.5 h-0.5 w-0.5 flex-none fill-white/50">
                    <circle cx={1} cy={1} r={1} />
                  </svg>
                  <div className="flex gap-x-2.5">
                    <Image
                      src={post.author.avatar}
                      alt={post.author.name}
                      className="h-6 w-6 flex-none rounded-full bg-white/10"
                      width={24}
                      height={24}
                    />
                    {post.author.name}
                  </div>
                </div>
              </div>
              <h3 className="mt-3 text-lg font-semibold leading-6 text-white">
                <Link href={`/blog/${post.id}`}>
                  <span className="absolute inset-0" />
                  {post.title}
                </Link>
              </h3>
            </article>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="mx-auto mt-32 max-w-7xl px-6 sm:mt-40 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Browse by Category</h2>
          <p className="mt-2 text-lg leading-8 text-gray-600">
            Find articles that match your interests.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {['Tutorials', 'Best Practices', 'Case Studies', 'Product Updates', 'Industry Insights', 'Company News'].map((category) => (
            <div
              key={category}
              className="flex flex-col items-start justify-between rounded-2xl bg-gray-50 p-8 hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="w-full">
                <div className="flex items-center gap-x-4">
                  <div className="text-base font-semibold leading-7 text-primary-600">{category}</div>
                </div>
                <div className="mt-4 flex items-center gap-x-2">
                  <Link
                    href={`/blog/category/${category.toLowerCase().replace(' ', '-')}`}
                    className="text-sm font-medium text-gray-700 hover:text-primary-500"
                  >
                    Browse articles <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Newsletter */}
      <div className="mx-auto mt-32 max-w-7xl sm:mt-40 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden bg-gray-900 px-6 py-24 shadow-2xl sm:rounded-3xl sm:px-24 xl:py-32">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Get notified of our latest updates
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-lg leading-8 text-gray-300">
            Stay informed about the latest features, tutorials, and AI chatbot insights.
          </p>
          <form className="mx-auto mt-10 flex max-w-md gap-x-4">
            <label htmlFor="email-address" className="sr-only">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="min-w-0 flex-auto rounded-md border-0 bg-white/5 px-3.5 py-2 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-white sm:text-sm sm:leading-6"
              placeholder="Enter your email"
            />
            <button
              type="submit"
              className="flex-none rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
