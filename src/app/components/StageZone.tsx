import type { ReactNode } from 'react';
import type { TimedState } from '../timed';

interface StageZoneProps {
  tips: TimedState<string>;
  stage: ReactNode;
  emoId: string;
  emoName: string;
  pager: string;
  emoDesc: string;
  extra?: ReactNode;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function StageZone({
  tips,
  stage,
  emoId,
  emoName,
  pager,
  emoDesc,
  extra,
  onPrev,
  onNext,
  onClose,
}: StageZoneProps) {
  return (
    <div
      className="stage-zone"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        id="navPrev"
        className="pager-btn"
        aria-label="Previous"
        title="Previous emotion"
        onClick={onPrev}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div className="stage-block">
        <button
          type="button"
          id="stageClose"
          className="icon-btn stage-close"
          aria-label="Close"
          title="Close preview"
          onClick={onClose}
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div id="tips" className={`tips${tips.visible ? ' show' : ''}`} role="status">
          {tips.value}
        </div>
        {stage}
        <div className="emo-meta">
          <span id="emoId" className="emo-id">
            {emoId}
          </span>
          <span id="emoName" className="emo-name">
            {emoName}
          </span>
          <span id="pager" className="pager-ind">
            {pager}
          </span>
        </div>
        <p id="emoDesc" className="emo-desc">
          {emoDesc}
        </p>
        {extra}
      </div>

      <button
        type="button"
        id="navNext"
        className="pager-btn"
        aria-label="Next"
        title="Next emotion"
        onClick={onNext}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}
