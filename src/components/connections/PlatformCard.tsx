import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface PlatformCardProps {
  id: string;
  name:string;
  description: string;
  logo: string;
  status: 'live' | 'coming_soon';
  authType: 'api-key' | 'oauth';
  selected?: boolean;
  onClick: () => void;
}

export default function PlatformCard({
  name,
  description,
  logo,
  status,
  selected,
  onClick
}: PlatformCardProps) {
  const isAvailable = status === 'live';

  return (
    <Card 
      className={cn(
        'p-4 bg-[#141517]/50 backdrop-blur-xl border-gray-800/50 transition-all duration-300',
        isAvailable ? 'cursor-pointer hover:border-blue-500/50' : 'opacity-60 cursor-not-allowed',
        selected && 'border-blue-500 ring-2 ring-blue-500/30'
      )}
      onClick={isAvailable ? onClick : undefined}
    >
      <div className="text-center relative">
        {!isAvailable && (
          <div className="absolute top-0 right-0 bg-gray-800 text-xs text-gray-300 px-2 py-1 rounded-md">
            Coming Soon
          </div>
        )}
        
        <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
          {logo ? (
            <Image 
              src={logo} 
              alt={`${name} logo`} 
              width={32} 
              height={32} 
              className="object-contain"
            />
          ) : (
            <div className="text-2xl font-bold text-blue-500">
              {name.charAt(0)}
            </div>
          )}
        </div>
        
        <h3 className="font-semibold text-white mb-2">{name}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
    </Card>
  );
}