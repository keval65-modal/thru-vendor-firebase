
'use client'

import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { TrendingUp } from 'lucide-react'

// Mock data structure
const initialChartData = [
  { month: 'January', sales: 0 },
  { month: 'February', sales: 0 },
  { month: 'March', sales: 0 },
  { month: 'April', sales: 0 },
  { month: 'May', sales: 0 },
  { month: 'June', sales: 0 },
]

const chartConfig = {
  sales: {
    label: 'Sales',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig

export function SalesChart() {
  const [chartData, setChartData] = React.useState(initialChartData);

  React.useEffect(() => {
    // Generate random data only on the client side
    const generatedData = initialChartData.map(item => ({
        ...item,
        sales: Math.floor(Math.random() * 5000) + 1000,
    }));
    setChartData(generatedData);
  }, []); // Empty dependency array ensures this runs once on mount

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
