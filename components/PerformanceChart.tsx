import React from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';

interface PerformanceChartProps {
    data: Array<{ date: string; wpm: number; accuracy: number }>;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-md text-xs sm:text-sm">
                <p className="font-semibold mb-1">{label}</p>
                <p className="text-emerald-600 dark:text-emerald-400">
                    WPM: <span className="font-bold">{payload[0].value}</span>
                </p>
                <p className="text-blue-600 dark:text-blue-400">
                    Accuracy: <span className="font-bold">{payload[1].value}%</span>
                </p>
            </div>
        );
    }
    return null;
};

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                No enough data to show trends.
            </div>
        );
    }

    return (
        <div className="w-full h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickMargin={10}
                        stroke="#94a3b8"
                    />
                    <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 10 }}
                        stroke="#10b981"
                        domain={[0, 'dataMax + 20']}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 10 }}
                        stroke="#3b82f6"
                        domain={[80, 100]} // Accuracy usually high
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="wpm"
                        name="WPM"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="accuracy"
                        name="Accuracy (%)"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
