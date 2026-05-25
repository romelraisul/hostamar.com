import React from 'react';
import { useCurrentFrame, interpolate, AbsoluteFill } from 'remotion';

interface BackgroundProps {
  colors: [string, string];
}

/**
 * Animated gradient background for the video.
 * Uses CSS gradients — no external images needed.
 * Subtly shifts the gradient angle over time for a living feel.
 */
export const Background: React.FC<BackgroundProps> = ({ colors }) => {
  const frame = useCurrentFrame();

  const angle = interpolate(frame % 300, [0, 300], [135, 495], {
    extrapolateRight: 'loop',
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]})`,
      }}
    />
  );
};
