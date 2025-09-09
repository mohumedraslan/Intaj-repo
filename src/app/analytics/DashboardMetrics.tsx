import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

interface MetricCardProps {
  title: string
  value: string | number
  description: string
}

const MetricCard = ({ title, value, description }: MetricCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
)

interface DashboardData {
  messagesByChannel: Array<{ count: number }>;
  activeChatbots: number;
  apiUsage: { used: number; limit: number };
  costs: { total: number };
}

export function DashboardMetrics({ data }: { data: DashboardData }) {
  const { messagesByChannel, activeChatbots, apiUsage, costs } = data

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Messages"
        value={messagesByChannel.reduce((acc: number, curr: { count: number }) => acc + curr.count, 0)}
        description="Across all channels"
      />
      <MetricCard
        title="Active Chatbots"
        value={activeChatbots}
        description="Currently online"
      />
      <MetricCard
        title="API Usage"
        value={`${apiUsage.used}/${apiUsage.limit}`}
        description="Messages this month"
      />
      <MetricCard
        title="Monthly Cost"
        value={`$${costs.total.toFixed(2)}`}
        description="Based on current usage"
      />

      <div className="col-span-4">
        <Card>
          <CardHeader>
            <CardTitle>Messages by Channel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={messagesByChannel}>
                <XAxis dataKey="channel" />
                <YAxis />
                <Bar
                  dataKey="count"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
