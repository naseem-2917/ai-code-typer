import React from 'react';
import { Card } from './ui/Card';
import { Stat } from './ui/Stat';

interface StatsDisplayProps {
  wpm: number;
  accuracy: number;
  errors: number;
  duration: number;
}

const formatDuration = (totalSeconds: number): string => {
    if (isNaN(totalSeconds) || totalSeconds < 0) {
        return "0:00";
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ wpm, accuracy, errors, duration }) => {
  return (
    <Card>
      <div className="flex justify-around p-4">
        <Stat label="WPM" value={wpm} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Errors" value={errors} />
        <Stat label="Duration" value={formatDuration(duration)} />
      </div>
    </Card>
  );
};

export default StatsDisplay;