import React from 'react';
// @ts-expect-error — remotion module is optional
import { useCurrentFrame, interpolate, spring, AbsoluteFill } from 'remotion';

interface TextOverlayProps {
  text: string;
  startFrame: number;
  durationInFrames: number;
  brandColor: string;
}

/**
 * Animated text overlay that fades in, holds, then fades out.
 * Supports full Unicode (Bengali + English mixed).
 * Uses sans-serif font stack with Bengali fallback.
 */
export const TextOverlay: React.FC<TextOverlayProps> = ({
  text,
  startFrame,
  durationInFrames,
  brandColor,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  // Fade in (first 15 frames)
  const opacityIn = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Hold at full opacity
  const holdEnd = durationInFrames - 15;
  const hold = interpolate(localFrame, [15, holdEnd], [1, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fade out (last 15 frames)
  const opacityOut = interpolate(localFrame, [holdEnd, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = Math.min(opacityIn, hold, opacityOut);

  // Subtle upward slide on entrance
  const translateY = interpolate(localFrame, [0, 20], [30, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Slight scale pop on the brand color accent line
  const accentScale = spring({
    frame: localFrame,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 80,
    },
  });

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 80px',
      }}
    >
      {/* Accent line above text */}
      <div
        style={{
          width: `${60 * accentScale}px`,
          height: 4,
          backgroundColor: brandColor,
          borderRadius: 2,
          marginBottom: 20,
          opacity,
        }}
      />
      {/* Main text */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: '#ffffff',
          textAlign: 'center',
          fontFamily:
            "'Noto Sans Bengali', 'Noto Sans', 'Segoe UI', 'Arial', sans-serif",
          lineHeight: 1.4,
          textShadow: '0 2px 12px rgba(0,0,0,0.4)',
          opacity,
          transform: `translateY(${translateY}px)`,
          maxWidth: '90%',
        }}
      >
        {text}
      </div>
      {/* Accent line below text */}
      <div
        style={{
          width: `${40 * accentScale}px`,
          height: 2,
          backgroundColor: brandColor,
          borderRadius: 1,
          marginTop: 20,
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};
