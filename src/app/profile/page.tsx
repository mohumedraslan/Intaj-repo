// src/app/profile/page.tsx
import Image from "next/image";

export default function ProfilePage() {
  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center py-12 animate-fade-in">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md flex flex-col items-center">
        <div className="mb-6">
          <Image src="/logo.svg" alt="Intaj Logo" width={48} height={48} className="h-12 w-auto mx-auto" />
        </div>
        <div className="rounded-full bg-blue-100 h-20 w-20 flex items-center justify-center mb-4">
          <span className="text-4xl text-blue-700">👤</span>
        </div>
        <h1 className="text-2xl font-extrabold text-blue-700 mb-2">Your Profile</h1>
        <form className="w-full flex flex-col gap-4 mt-4">
          <input type="text" placeholder="Your Name" className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" defaultValue="Your Name" />
          <input type="email" placeholder="Email" className="border rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" defaultValue="user@email.com" />
          <div className="flex justify-between items-center">
            <span className="font-medium">Subscription</span>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs">Free</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Change password</span>
            <button className="text-blue-600 hover:underline text-sm">Update</button>
          </div>
          <button type="submit" className="bg-blue-700 text-white font-bold py-2 rounded hover:bg-blue-800 transition mt-4">Save Changes</button>
        </form>
      </div>
    </div>
  );
}
