import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

interface PerformanceMetricsProps {
  data: {
    responseTimes: Array<{
      timestamp: string
      value: number
    }>
    errorRates: Array<{
      timestamp: string
      value: number
    }>
    userEngagement: Array<{
      timestamp: string
      value: number
    }>
  }
}

export function PerformanceMetrics({ data }: PerformanceMetricsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Response Times</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.responseTimes}>
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Line type="monotone" dataKey="value" stroke="#2563eb" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.errorRates}>
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Line type="monotone" dataKey="value" stroke="#dc2626" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.userEngagement}>
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Line type="monotone" dataKey="value" stroke="#16a34a" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
