import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from 'recharts'

export interface BandwidthSample {
  time: number
  kbps: number
}

interface Props {
  data: BandwidthSample[]
}

export default function BandwidthChart({ data }: Props) {
  return (
    <div className="w-full h-48 my-4 bg-zinc-900 p-4 rounded-lg">
      <h3 className="text-white text-lg font-semibold mb-2">Bandwidth Usage</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="time"
            tickFormatter={ts => new Date(ts).toLocaleTimeString().slice(3)}
            interval="preserveEnd"
            stroke="#9ca3af"
          />
          <YAxis
            domain={[0, 'dataMax + 500']}
            unit=" kbps"
            stroke="#9ca3af"
          />
          <Tooltip
            labelFormatter={ts => new Date(ts).toLocaleTimeString()}
            formatter={(val: number) => [`${val.toFixed(0)} kbps`, 'Bandwidth']}
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#ffffff'
            }}
          />
          <Line
            type="monotone"
            dataKey="kbps"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
