import React from 'react';
import { Stat } from './ui/Stat';

interface StatsDisplayProps {
  wpm: number;
  accuracy: number;
  errors: number;
  progress?: number;
  timer?: number;
  duration?: number; // Keep for backward compatibility if needed, but prefer timer
}

const formatDuration = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return "0:00";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ wpm, accuracy, errors, progress, timer, duration }) => {
  const timeValue = timer !== undefined ? timer : (duration || 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 md:gap-8 min-w-[200px]">
      <Stat label="WPM" value={wpm} />
      <Stat label="Accuracy" value={`${accuracy}%`} />
      <Stat label="Errors" value={errors} />
      <Stat label="Time" value={formatDuration(timeValue)} />
      {/* Progress could be added here if we want 5 items, or just kept separate */}
    </div>
  );
};

export default StatsDisplay;