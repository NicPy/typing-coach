import { useEffect, useRef, type CSSProperties } from 'react';
import { CrownIcon } from './CrownIcon';

interface Props {
  score: number;
  previousBest: number;
  onDismiss: () => void;
}

const PARTICLES = Array.from({ length: 30 }, (_, index) => {
  const angle = (index / 30) * Math.PI * 2;
  const distance = 150 + (index % 6) * 28;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    rotation: (index * 47) % 180,
    delay: (index % 5) * 45,
    size: 3 + (index % 4),
  };
});

export function PersonalBestCelebration({ score, previousBest, onDismiss }: Props) {
  const scoreRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dismissTimer = window.setTimeout(onDismiss, 4600);
    const startTimer = window.setTimeout(() => {
      if (prefersReducedMotion) {
        if (scoreRef.current) scoreRef.current.textContent = String(score);
        return;
      }
      const startedAt = performance.now();
      const duration = 900;

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 4);
        const nextScore = Math.round(previousBest + (score - previousBest) * eased);
        if (scoreRef.current) scoreRef.current.textContent = String(nextScore);
        if (progress < 1) frame = window.requestAnimationFrame(tick);
      };

      frame = window.requestAnimationFrame(tick);
    }, 520);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopImmediatePropagation();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey, true);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(dismissTimer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onDismiss, previousBest, score]);

  return (
    <div
      className="record-celebration"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-title"
      onClick={onDismiss}
    >
      <div className="record-vignette" />
      <div className="record-burst" aria-hidden="true">
        <div className="record-rays" />
        <div className="record-ring record-ring-one" />
        <div className="record-ring record-ring-two" />
        {PARTICLES.map((particle, index) => (
          <i
            className={`record-particle record-particle-${index % 3}`}
            key={index}
            style={
              {
                '--particle-x': `${particle.x}px`,
                '--particle-y': `${particle.y}px`,
                '--particle-rotation': `${particle.rotation}deg`,
                '--particle-delay': `${particle.delay}ms`,
                '--particle-size': `${particle.size}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="record-card" onClick={(event) => event.stopPropagation()}>
        <div className="record-crown-wrap">
          <span className="record-crown-glow" />
          <CrownIcon className="record-crown" />
        </div>
        <p className="record-kicker">achievement unlocked</p>
        <h2 id="record-title">new personal best</h2>
        <div className="record-score" aria-label={`${score} words per minute`}>
          <strong ref={scoreRef}>{previousBest}</strong>
          <span>wpm</span>
        </div>
        {previousBest > 0 ? (
          <p className="record-improvement">+{score - previousBest} faster than your last record</p>
        ) : (
          <p className="record-improvement">your first record is on the board</p>
        )}
        <button className="record-dismiss" onClick={onDismiss} autoFocus>
          continue
        </button>
        <span className="record-timer" aria-hidden="true" />
      </div>
    </div>
  );
}
