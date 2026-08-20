import React, { useRef, useState, useEffect, useCallback } from 'react';

interface LiquidGlassSliderProps {
  value: number; // 0 - 100
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function LiquidGlassSlider({
  value,
  onChange,
  onChangeEnd,
  disabled = false,
  style,
  className = '',
}: LiquidGlassSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);
  const currentProgressRef = useRef<number>(value);
  currentProgressRef.current = value;

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  const updateSliderVisuals = useCallback((percentage: number) => {
    if (!thumbRef.current || !fillRef.current) return;

    const clamped = clamp(percentage, 0, 100);
    if (clamped <= 0) {
      thumbRef.current.style.left = '14px';
      fillRef.current.style.width = '0px';
    } else if (clamped >= 100) {
      thumbRef.current.style.left = 'calc(100% - 14px)';
      fillRef.current.style.width = '100%';
    } else {
      const pos = `calc(14px + (100% - 28px) * ${clamped / 100})`;
      thumbRef.current.style.left = pos;
      fillRef.current.style.width = pos;
    }
  }, []);

  const updateFromClientX = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const travelWidth = containerRect.width - 28;
      if (travelWidth <= 0) return;
      const offsetX = clientX - (containerRect.left + 14);
      let percentage = (offsetX / travelWidth) * 100;
      percentage = clamp(percentage, 0, 100);
      const rounded = Math.round(percentage);
      onChange(rounded);
      updateSliderVisuals(percentage);
    },
    [onChange, updateSliderVisuals]
  );

  useEffect(() => {
    updateSliderVisuals(value);
  }, [value, updateSliderVisuals]);

  // Initial layout calculation after render
  useEffect(() => {
    const handleResize = () => {
      updateSliderVisuals(currentProgressRef.current);
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(() => {
      updateSliderVisuals(currentProgressRef.current);
    }, 50);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [updateSliderVisuals]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    activePointerIdRef.current = e.pointerId;
    if (thumbRef.current) {
      try {
        thumbRef.current.setPointerCapture(e.pointerId);
      } catch {
        // Fallback
      }
    }
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || e.pointerId !== activePointerIdRef.current) return;
    if (e.cancelable) e.preventDefault();
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || e.pointerId !== activePointerIdRef.current) return;
    setIsDragging(false);
    activePointerIdRef.current = null;
    try {
      if (thumbRef.current) {
        thumbRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Safe fallback
    }
    if (onChangeEnd) {
      onChangeEnd(currentProgressRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let next = value;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next += 5;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next -= 5;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = 100;
    else return;

    e.preventDefault();
    next = clamp(next, 0, 100);
    onChange(next);
    updateSliderVisuals(next);
    if (onChangeEnd) onChangeEnd(next);
  };

  return (
    <div
      ref={containerRef}
      style={style}
      className={`liquid-slider-container ${
        disabled ? 'opacity-40 pointer-events-none' : ''
      } ${className}`}
      onPointerDown={e => {
        if (disabled) return;
        updateFromClientX(e.clientX);
        setIsDragging(true);
        activePointerIdRef.current = e.pointerId;
        if (thumbRef.current) {
          try {
            thumbRef.current.setPointerCapture(e.pointerId);
          } catch {
            // Fallback
          }
        }
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div ref={trackRef} className="liquid-slider-track">
        <div ref={fillRef} className="liquid-slider-fill" />
      </div>

      <div
        ref={thumbRef}
        className={`liquid-slider-thumb-container ${
          isDragging ? 'dragging' : ''
        }`}
        style={{
          marginLeft: '0px',
        }}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
      >
        <div ref={coreRef} className="liquid-slider-thumb-core" />
      </div>
    </div>
  );
}
