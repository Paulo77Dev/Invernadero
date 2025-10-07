// src/components/TimeSeriesChart/TimeSeriesChart.jsx
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

/**
 * props:
 *  - data: array [{ ts: "2025-10-07T02:15:30Z", temperature: 24.5, humidity: 60.2, water_level: 72.3 }]
 *  - lines: [{ key: 'temperature', name: 'Temperature (°C)', color: '#ff4d4f' }, ...]
 */
export default function TimeSeriesChart({ data = [], lines = [] }) {
  // format X axis label (horas:minutos)
  const formatX = (ts) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString();
    } catch {
      return ts;
    }
  };

  return (
    <div style={{ width: "100%", height: 320, marginTop: 24 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="ts"
            tickFormatter={formatX}
            minTickGap={20}
            interval="preserveEnd"
          />
          <YAxis />
          <Tooltip labelFormatter={formatX} />
          <Legend />
          {lines.map((ln) => (
            <Line
              key={ln.key}
              type="monotone"
              dataKey={ln.key}
              name={ln.name}
              stroke={ln.color}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
