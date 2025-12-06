import React, { useContext } from 'react';
import { ActivityCalendar } from 'react-activity-calendar';
import { AppContext } from '../context/AppContext';

interface ActivityHeatmapProps {
    data: Array<{ date: string; count: number; level: number }>;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data }) => {
    const context = useContext(AppContext);
    const theme = context?.theme || 'dark';

    const explicitTheme: any = {
        light: ['#f1f5f9', '#bbf7d0', '#86efac', '#4ade80', '#16a34a'], // Slate-100 to Green-600
        dark: ['#1e293b', '#064e3b', '#065f46', '#047857', '#059669'], // Slate-800 to Emerald-600
    };

    return (
        <div className="w-full flex justify-center py-4">
            <ActivityCalendar
                data={data}
                theme={explicitTheme}
                colorScheme={theme as 'light' | 'dark'}
                showWeekdayLabels
                blockSize={12}
                blockMargin={4}
                fontSize={12}
                labels={{
                    legend: {
                        less: 'Less',
                        more: 'More',
                    },
                    months: [
                        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                    ],
                    totalCount: '{{count}} sessions in {{year}}',
                    weekdays: [
                        'Sun', // Sunday
                        'Mon', // Monday
                        'Tue', // Tuesday
                        'Wed', // Wednesday
                        'Thu', // Thursday
                        'Fri', // Friday
                        'Sat'  // Saturday
                    ]
                }}
            />
        </div>
    );
};
