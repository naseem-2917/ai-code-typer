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
import { formatShortDate } from '../utils/dateUtils';

interface PerformanceChartProps {
    data: any[];
    xDataKey?: string;
    xAxisConfig?: {
        type?: 'number' | 'category';
        domain?: [number | string, number | string];
        ticks?: any[];
        tickFormatter?: (value: any, index: number) => string;
    };
}

const formatDuration = (seconds?: number) => {
    if (seconds === undefined || isNaN(seconds)) return '0s';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
};

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        // If label is a timestamp number, format it, otherwise use as is
        const dateLabel = typeof label === 'number' ? formatShortDate(label) + ', ' + new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : label;

        return (
            <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl text-xs sm:text-sm z-50">
                <p className="font-bold mb-2 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-1">
                    {dateLabel}
                </p>
                <div className="space-y-1">
                    <p className="text-emerald-600 dark:text-emerald-400 flex justify-between gap-4">
                        <span>WPM:</span>
                        <span className="font-bold">{data.wpm}</span>
                    </p>
                    <p className="text-blue-600 dark:text-blue-400 flex justify-between gap-4">
                        <span>Accuracy:</span>
                        <span className="font-bold">{Number(data.accuracy).toFixed(2)}%</span>
                    </p>
                    {data.errors !== undefined && (
                        <p className="text-red-500 flex justify-between gap-4">
                            <span>Errors:</span>
                            <span className="font-bold">{data.errors}</span>
                        </p>
                    )}
                    {data.duration !== undefined && (
                        <p className="text-slate-500 dark:text-slate-400 flex justify-between gap-4">
                            <span>Duration:</span>
                            <span className="font-bold">{formatDuration(data.duration)}</span>
                        </p>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, xDataKey = 'date', xAxisConfig }) => {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Not enough data to show trends.
            </div>
        );
    }

    return (
        <div className="w-full h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
                    <XAxis
                        dataKey={xDataKey}
                        type={xAxisConfig?.type || 'category'}
                        domain={xAxisConfig?.domain}
                        ticks={xAxisConfig?.ticks}
                        tickFormatter={xAxisConfig?.tickFormatter}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickMargin={10}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                    />
                    <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        domain={[0, 'dataMax + 10']}
                        width={40}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        domain={[0, 100]}
                        width={30}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={{ stroke: '#e2e8f0' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="wpm"
                        name="WPM"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 0, fill: '#10b981' }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                        animationDuration={1000}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="accuracy"
                        name="Accuracy"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 0, fill: '#3b82f6' }}
                        activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                        animationDuration={1000}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
