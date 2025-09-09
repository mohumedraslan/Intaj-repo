import { withErrorHandling } from '@/lib/withErrorHandling';

// Example of using the error handling wrapper in an API route
export async function POST(req: Request) {
  return withErrorHandling(req, async request => {
    // Your API logic here
    // Any errors will be automatically caught, logged, and handled
    const data = await request.json();
    // ... rest of your code

    return Response.json({ success: true });
  });
}
