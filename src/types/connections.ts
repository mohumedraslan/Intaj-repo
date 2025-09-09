export interface ConnectionCardProps {
  name: string;
  type: string;
  status: 'Connected' | 'Syncing' | 'Error';
  stats: Record<string, string>;
  color: string;
  icon: string;
}

export interface AvailableConnectionCardProps {
  name: string;
  description: string;
  color: string;
  available: boolean;
  icon: string;
}
