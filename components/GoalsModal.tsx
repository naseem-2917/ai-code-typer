import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (wpmGoal: number, accuracyGoal: number, timeGoal: number) => void;
  currentWpmGoal: number;
  currentAccuracyGoal: number;
  currentTimeGoal: number;
}

export const GoalsModal: React.FC<GoalsModalProps> = ({ isOpen, onClose, onSave, currentWpmGoal, currentAccuracyGoal, currentTimeGoal }) => {
  const [wpm, setWpm] = useState(String(currentWpmGoal));
  const [accuracy, setAccuracy] = useState(String(currentAccuracyGoal));
  const [time, setTime] = useState(String(currentTimeGoal));

  useEffect(() => {
    if (isOpen) {
      setWpm(String(currentWpmGoal));
      setAccuracy(String(currentAccuracyGoal));
      setTime(String(currentTimeGoal));
    }
  }, [isOpen, currentWpmGoal, currentAccuracyGoal, currentTimeGoal]);

  const handleSave = () => {
    const wpmGoal = parseInt(wpm, 10) || 0;
    const accuracyGoal = parseInt(accuracy, 10) || 0;
    const timeGoal = parseInt(time, 10) || 0;
    onSave(wpmGoal, accuracyGoal, timeGoal);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Your Goals">
      <div className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="time-goal" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Daily Time Goal (Minutes)
          </label>
          <input
            id="time-goal"
            type="number"
            min="0"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., 15"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="wpm-goal" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            WPM Goal
          </label>
          <input
            id="wpm-goal"
            type="number"
            value={wpm}
            onChange={(e) => setWpm(e.target.value)}
            className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., 80"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="accuracy-goal" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Accuracy Goal (%)
          </label>
          <input
            id="accuracy-goal"
            type="number"
            min="0"
            max="100"
            value={accuracy}
            onChange={(e) => setAccuracy(e.target.value)}
            className="w-full p-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g., 99"
          />
        </div>
        <div className="flex justify-end items-center gap-2 mt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Goals
          </Button>
        </div>
      </div>
    </Modal>
  );
};