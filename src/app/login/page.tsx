// src/app/login/page.tsx

import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center py-12 animate-fade-in">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md flex flex-col items-center">
        <div className="mb-6">
          <Image src="/logo.svg" alt="Intaj Logo" width={48} height={48} className="h-12 w-auto mx-auto" />
        </div>
        <h1 className="text-2xl font-extrabold text-blue-700 mb-2">Sign in to Intaj</h1>
        <p className="text-gray-500 mb-6">Welcome back! Please enter your details.</p>
        <form className="w-full flex flex-col gap-4">
          <input type="email" placeholder="Email" className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <input type="password" placeholder="Password" className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <button type="submit" className="bg-blue-700 text-white font-bold py-2 rounded hover:bg-blue-800 transition">Sign In</button>
        </form>
        <div className="mt-4 text-sm text-gray-600">
          Don’t have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:underline">Sign up</Link>
        </div>
      </div>
    </div>
  );
}
