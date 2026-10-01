"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useI18n } from "@/components/i18n-provider";
import { formatCurrency } from "@/lib/format";
import type { MonthlyPoint } from "@/lib/queries";

export function RevenueChart({ data }: { data: MonthlyPoint[] }) {
  const { t } = useI18n();

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="einnahmen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="ausgaben" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
            width={44}
          />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="einnahmen"
            name={t("dashboard.revenue")}
            stroke="#2563eb"
            strokeWidth={2}
            fill="url(#einnahmen)"
          />
          <Area
            type="monotone"
            dataKey="ausgaben"
            name={t("dashboard.expenses")}
            stroke="#f59e0b"
            strokeWidth={2}
            fill="url(#ausgaben)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
