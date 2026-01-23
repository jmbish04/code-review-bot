import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const data = [
  { name: 'Mon', success: 4, fail: 1 },
  { name: 'Tue', success: 3, fail: 0 },
  { name: 'Wed', success: 7, fail: 2 },
  { name: 'Thu', success: 5, fail: 1 },
  { name: 'Fri', success: 8, fail: 0 },
  { name: 'Sat', success: 2, fail: 0 },
  { name: 'Sun', success: 6, fail: 1 },
];

export const DeploymentChart = () => {
  return (
    <Card className="col-span-1 h-full">
      <CardHeader>
        <CardTitle>Deployment Trends</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
                dataKey="name" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
            />
            <YAxis 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${value}`} 
            />
            <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <Area 
                type="monotone" 
                dataKey="success" 
                stroke="hsl(var(--primary))" 
                fillOpacity={1} 
                fill="url(#colorSuccess)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
