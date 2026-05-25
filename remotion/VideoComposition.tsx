import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';
import { Background } from './Background';
import { TextOverlay } from './TextOverlay';
import type { VideoCompositionProps } from './types';

/**
 * Main video composition.
 * Sequences text segments over an animated gradient background.
 * Each segment appears as a TextOverlay within its own Sequence.
 */
export const VideoComposition: React.FC<VideoCompositionProps> = ({
  title,
  segments,
  backgroundColor,
  brandColor,
  style: _style,
  language: _language,
}) => {
  const fps = 30;
  const frame = useCurrentFrame();

  // Title overlay — visible for the first 2 seconds
  const titleOpacity = interpolate(frame, [0, 20, 60, 80], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      {/* Animated gradient background */}
      <Background colors={backgroundColor} />

      {/* Title (first ~2.6 seconds) */}
      {titleOpacity > 0 && (
        <AbsoluteFill
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: titleOpacity,
            padding: '60px 80px',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: '#ffffff',
              textAlign: 'center',
              fontFamily:
                "'Noto Sans Bengali', 'Noto Sans', 'Segoe UI', 'Arial', sans-serif",
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
        </AbsoluteFill>
      )}

      {/* Script segments — each plays in sequence */}
      {segments.map((segment, index) => (
        <Sequence
          key={index}
          from={Math.round(segment.startTime * fps)}
          durationInFrames={Math.round(segment.duration * fps)}
        >
          <TextOverlay
            text={segment.text}
            startFrame={Math.round(segment.startTime * fps)}
            durationInFrames={Math.round(segment.duration * fps)}
            brandColor={brandColor}
          />
        </Sequence>
      ))}

      {/* Brand watermark — bottom-right corner */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 18,
          fontFamily: "'Noto Sans', sans-serif",
          letterSpacing: 1,
          opacity: 0.7,
        }}
      >
        Hostamar
      </div>
    </AbsoluteFill>
  );
};
