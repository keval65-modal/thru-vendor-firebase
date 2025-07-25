
'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { TrendingUp } from 'lucide-react'

// Mock data for the sales chart
const chartData = [
  { month: 'January', sales: Math.floor(Math.random() * 5000) + 1000 },
  { month: 'February', sales: Math.floor(Math.random() * 5000) + 1000 },
  { month: 'March', sales: Math.floor(Math.random() * 5000) + 1000 },
  { month: 'April', sales: Math.floor(Math.random() * 5000) + 1000 },
  { month: 'May', sales: Math.floor(Math.random() * 5000) + 1000 },
  { month: 'June', sales: Math.floor(Math.random() * 5000) + 1000 },
]

const chartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig

export function SalesChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Sales Overview
        </CardTitle>
        <CardDescription>A summary of sales for the last 6 months.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
