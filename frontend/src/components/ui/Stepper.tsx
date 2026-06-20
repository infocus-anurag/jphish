'use client';

import { I } from '@/components/ui/Icons';

interface StepperProps {
  steps: string[];
  /** Zero-based index of the active step. */
  current: number;
  /** Optional click handler to jump to an already-completed step. */
  onStepClick?: (index: number) => void;
}

/** Horizontal numbered step indicator. Completed steps show a check. */
export function Stepper({ steps, current, onStepClick }: StepperProps): JSX.Element {
  return (
    <div className="stepper" role="list">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = done && !!onStepClick;
        return (
          <div
            key={label}
            role="listitem"
            className={`stepper-step${done ? ' done' : ''}${active ? ' active' : ''}`}
          >
            <button
              type="button"
              className="stepper-dot"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(i)}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <I.check size={12} /> : i + 1}
            </button>
            <span className="stepper-label">{label}</span>
            {i < steps.length - 1 && <span className="stepper-line" aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}
