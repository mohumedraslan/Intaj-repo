import Image from "next/image";
import { AvailableConnectionCardProps } from "@/types/connections";

export default function AvailableConnectionCard({ name, description, color, available, icon }: AvailableConnectionCardProps) {
  return (
    <div className={`bg-[#141517]/80 backdrop-blur-md p-6 rounded-2xl border border-blue-500/10 hover:border-${color}-500/50 transition-all duration-300 cursor-pointer`}>
      <div className="text-center">
        <div className={`w-16 h-16 bg-${color}-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce-gentle overflow-hidden`}>
          <Image src={icon} alt={name} width={32} height={32} className="w-8 h-8" />
        </div>
        <h3 className="font-semibold text-white mb-2">{name}</h3>
        <p className="text-gray-400 text-sm mb-4">{description}</p>
        {available ? (
          <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity">
            Connect
          </button>
        ) : (
          <button className={`bg-${color}-500/20 hover:bg-${color}-500/30 w-full px-4 py-2 rounded-lg text-${color}-400 font-medium border border-${color}-500/50 transition-colors`}>
            Coming Soon
          </button>
        )}
      </div>
    </div>
  );
}
