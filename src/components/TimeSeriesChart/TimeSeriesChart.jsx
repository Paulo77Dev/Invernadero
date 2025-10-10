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
  Legend,
} from "recharts";

// As props 'data' e 'lines' são recebidas do App.jsx
export default function TimeSeriesChart({ data = [], lines = [] }) {
  
  // Função para formatar o label do eixo X (horas:minutos)
  const formatX = (ts) => {
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div style={{ width: "100%", height: 320, marginTop: 12 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 153, 196, 0.2)" />
          <XAxis
            dataKey="ts"
            tickFormatter={formatX}
            minTickGap={20}
            interval="preserveEnd"
            stroke="var(--text-secondary)"
          />
          <YAxis stroke="var(--text-secondary)" />
          
          {/* ▼▼▼ AQUI ESTÁ A MUDANÇA PRINCIPAL ▼▼▼ */}
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(40, 42, 54, 0.8)", // Fundo escuro semi-transparente
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              backdropFilter: "blur(5px)", // Efeito de vidro
            }}
            labelStyle={{ color: "#F8F8F2" }} // Cor para o texto do label (ex: horário)
            // itemStyle não é necessário aqui, pois as cores já vêm das linhas
          />
          
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