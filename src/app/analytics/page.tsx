// src/app/analytics/page.tsx
export default function AnalyticsPage() {
  return (
    <div className="py-8">
      <h1 className="text-3xl font-extrabold text-blue-700 mb-8">Analytics & Insights</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-2xl mb-2">📊</span>
          <h3 className="font-bold text-lg mb-1">Usage Analytics</h3>
          <p className="text-gray-500 text-sm mb-2">Track usage, engagement, and growth.</p>
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <span className="text-2xl mb-2">📈</span>
          <h3 className="font-bold text-lg mb-1">Performance</h3>
          <p className="text-gray-500 text-sm mb-2">Monitor agent and chatbot performance.</p>
          <span className="text-xs text-gray-400">Coming soon</span>
        </div>
      </div>
      <div className="bg-blue-50 rounded-lg p-6 shadow flex flex-col items-center">
        <h4 className="font-bold text-blue-700 mb-2">Analytics coming soon!</h4>
        <p className="text-gray-700 text-sm">You’ll soon be able to see detailed usage, engagement, and ROI for all your automations.</p>
      </div>
    </div>
  );
}
