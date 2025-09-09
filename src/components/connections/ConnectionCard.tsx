import Image from 'next/image';
import { ConnectionCardProps } from '@/types/connections';

export default function ConnectionCard({
  name,
  type,
  status,
  stats,
  color,
  icon,
}: ConnectionCardProps) {
  const isConnected = status === 'Connected';
  const statusColor = isConnected ? 'green' : 'yellow';

  return (
    <div
      className={`bg-[#141517]/80 backdrop-blur-md p-6 rounded-2xl border border-blue-500/10 hover:border-${color}-500/50 transition-all duration-300`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-12 h-12 bg-${color}-500 rounded-xl flex items-center justify-center overflow-hidden`}
          >
            <Image src={icon} alt={name} width={24} height={24} className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{name}</h3>
            <p className="text-sm text-gray-400">{type}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 bg-${statusColor}-500 rounded-full animate-pulse`}></div>
          <span className={`text-xs text-${statusColor}-500`}>{status}</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Status:</span>
          <span className={`text-${statusColor}-500`}>{status}</span>
        </div>
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-gray-400">{key.charAt(0).toUpperCase() + key.slice(1)}:</span>
            <span className="text-gray-300">{value}</span>
          </div>
        ))}
      </div>

      <div className="flex space-x-2">
        <button className="flex-1 px-3 py-2 bg-[#2a2d35] hover:bg-blue-600/20 border border-gray-600 hover:border-blue-500 rounded-lg text-sm text-gray-300 hover:text-blue-400 transition-colors">
          Configure
        </button>
        <button
          className={`flex-1 px-3 py-2 bg-${statusColor}-600/20 hover:bg-${statusColor}-600/30 border border-${statusColor}-600/50 rounded-lg text-sm text-${statusColor}-400 transition-colors`}
        >
          {isConnected ? 'Test' : 'Retry'}
        </button>
      </div>
    </div>
  );
}
