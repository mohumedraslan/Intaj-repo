import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { supabase } from '@/lib/supabaseClient';

// Default author and image for posts without these fields
const defaultAuthor = {
  name: 'Intaj Team',
  avatar: '/images/avatar-placeholder.png',
};

const defaultImage = '/images/blog-placeholder.jpg';

// Generate metadata for the page
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params;
  
  // Fetch the blog post
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('title, excerpt')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();
  
  if (error || !post) {
    return {
      title: 'Blog Post Not Found',
      description: 'The requested blog post could not be found.',
    };
  }
  
  return {
    title: post.title,
    description: post.excerpt || `Read more about ${post.title}`,
  };
}

// This enables ISR - Incremental Static Regeneration
export const revalidate = 3600; // Revalidate every hour

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  // Fetch the blog post
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();
  
  // If post not found or error, return 404
  if (error || !post) {
    notFound();
  }
  
  // Format the date if it exists
  const formattedDate = post.published_at 
    ? format(new Date(post.published_at), 'MMMM d, yyyy')
    : 'Publication date not available';
  
  return (
    <main className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {post.title}
          </h1>
          
          {post.excerpt && (
            <p className="mt-4 text-lg leading-8 text-gray-600">
              {post.excerpt}
            </p>
          )}
          
          <div className="mt-6 flex items-center justify-center gap-x-4">
            <Image 
              src={defaultAuthor.avatar}
              alt={defaultAuthor.name}
              className="h-10 w-10 rounded-full bg-gray-50"
              width={40}
              height={40}
            />
            <div className="text-sm leading-6">
              <p className="font-semibold text-gray-900">
                {defaultAuthor.name}
              </p>
              <time dateTime={post.published_at} className="text-gray-500">
                {formattedDate}
              </time>
            </div>
          </div>
        </div>
        
        <div className="relative mt-16 overflow-hidden rounded-3xl bg-gray-900 pb-10">
          <Image
            src={defaultImage}
            alt={post.title}
            className="aspect-[16/9] w-full object-cover"
            width={1200}
            height={675}
          />
        </div>
        
        <div className="mx-auto mt-16 max-w-3xl">
          <Link 
            href="/blog" 
            className="text-sm font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
          >
            ← Back to blog
          </Link>
          
          <article className="prose prose-lg prose-indigo mx-auto mt-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {post.content || 'No content available for this post.'}
            </ReactMarkdown>
          </article>
        </div>
      </div>
    </main>
  );
}