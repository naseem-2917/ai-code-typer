import React, { useContext, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { AppContext } from '../context/AppContext';
import { Card } from './ui/Card';

interface TargetedResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPracticeAgain: () => void;
  onReturnToDashboard: () => void;
  stats: {
    wpm: number;
    accuracy: number;
    errors: number;
    duration: number;
  };
  sessionErrorMap?: Record<string, number>;
  sessionAttemptMap?: Record<string, number>;
}

const displayKey = (key: string): string => {
  switch (key) {
    case ' ':
      return 'Space (␣)';
    case '\n':
      return 'Enter (↵)';
    case '\t':
      return 'Tab (⇥)';
    default:
      return key;
  }
};

const KeyStatDisplay: React.FC<{
  char: string;
  beforeRate: number;
  afterRate: number;
}> = ({ char, beforeRate, afterRate }) => {
  const improvement = beforeRate - afterRate;
  const displayChar = displayKey(char);

  let verdictColor = 'text-slate-500 dark:text-slate-400';
  if (improvement > 2) verdictColor = 'text-green-500';
  if (improvement < -2) verdictColor = 'text-red-500';

  return (
    <div className="grid grid-cols-3 items-center text-center text-sm p-2 rounded-md bg-slate-100 dark:bg-slate-700/50">
      <span className="font-mono font-semibold bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded-md justify-self-center">{displayChar}</span>
      <span>{beforeRate.toFixed(1)}%</span>
      <span className={verdictColor}>{afterRate.toFixed(1)}%</span>
    </div>
  );
};

export const TargetedResultsModal: React.FC<TargetedResultsModalProps> = ({
  isOpen, onClose, onPracticeAgain, onReturnToDashboard, stats,
  sessionErrorMap = {}, sessionAttemptMap = {}
}) => {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppContext not found');
  const { keyErrorStats, keyAttemptStats, currentTargetedKeys } = context;

  const comparisonData = useMemo(() => {
    if (!isOpen) return { results: [], verdict: '' };

    try {
      let improvedKeys = 0;

      const results = currentTargetedKeys.map(key => {
        const sessionErrors = sessionErrorMap?.[key] || 0;
        const sessionAttempts = sessionAttemptMap?.[key] || 0;

        const globalErrors = keyErrorStats?.[key] || 0;
        // Fallback: If we have errors but no attempts recorded (legacy data issue), assume attempts = errors
        const globalAttempts = (keyAttemptStats?.[key] || 0) < globalErrors ? globalErrors : (keyAttemptStats?.[key] || 0);

        const beforeErrors = globalErrors - sessionErrors;
        const beforeAttempts = globalAttempts - sessionAttempts;

        // Guard against division by zero
        const beforeRate = beforeAttempts > 0 ? (beforeErrors / beforeAttempts) * 100 : 0;
        const afterRate = sessionAttempts > 0 ? (sessionErrors / sessionAttempts) * 100 : 0;

        if (afterRate < beforeRate) {
          improvedKeys++;
        }

        return { key, beforeRate, afterRate };
      });

      let verdict = `You focused on ${currentTargetedKeys.length} keys. Keep practicing!`;
      if (improvedKeys === currentTargetedKeys.length && currentTargetedKeys.length > 0) {
        verdict = `Amazing focus! You reduced your error rate on all target keys.`;
      } else if (improvedKeys > currentTargetedKeys.length / 2) {
        verdict = `You successfully reduced your error rate on ${improvedKeys} out of ${currentTargetedKeys.length} keys. Great work!`;
      }

      return { results, verdict };
    } catch (error) {
      console.error("Error calculating targeted results:", error);
      return { results: [], verdict: "Could not calculate statistics." };
    }
  }, [isOpen, currentTargetedKeys, keyErrorStats, keyAttemptStats, sessionErrorMap, sessionAttemptMap]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Targeted Practice Results">
      <div className="space-y-6">
        <p className="text-center text-sm text-slate-600 dark:text-slate-300">
          Here's how your performance on the targeted keys changed from your historical average to this session.
        </p>

        <Card className="p-4 bg-slate-50 dark:bg-slate-900/50">
          <div className="grid grid-cols-3 items-center text-center font-semibold text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Key</span>
            <span>Before</span>
            <span>After</span>
          </div>
          <div className="space-y-1">
            {comparisonData.results.map(data => <KeyStatDisplay key={data.key} char={data.key} {...data} />)}
          </div>
        </Card>

        <p className="text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
          {comparisonData.verdict}
        </p>

        <div className="flex flex-col gap-3 pt-2">
          <Button size="lg" className="w-full" onClick={onPracticeAgain}>
            Practice Again (Same Keys)
          </Button>
          <Button size="lg" variant="secondary" className="w-full" onClick={onReturnToDashboard}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    </Modal>
  );
};