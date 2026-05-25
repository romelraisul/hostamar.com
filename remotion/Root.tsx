import React from 'react';
import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';

// Style presets → color gradient pairs
export const STYLE_PRESETS: Record<
  string,
  { gradient: [string, string]; brandColor: string }
> = {
  cinematic: {
    gradient: ['#0f0c29', '#302b63'],
    brandColor: '#e94560',
  },
  modern: {
    gradient: ['#667eea', '#764ba2'],
    brandColor: '#f093fb',
  },
  dynamic: {
    gradient: ['#1a1a2e', '#16213e'],
    brandColor: '#0f3460',
  },
  vibrant: {
    gradient: ['#ff6b6b', '#556270'],
    brandColor: '#ffd93d',
  },
  corporate: {
    gradient: ['#0B101E', '#1B2A4A'],
    brandColor: '#4FC3F7',
  },
  warm: {
    gradient: ['#c94b4b', '#4b134f'],
    brandColor: '#ffd700',
  },
  nature: {
    gradient: ['#134e5e', '#71b280'],
    brandColor: '#a8e063',
  },
  dark: {
    gradient: ['#000000', '#1a1a2e'],
    brandColor: '#e94560',
  },
  light: {
    gradient: ['#f5f7fa', '#c3cfe2'],
    brandColor: '#667eea',
  },
  minimal: {
    gradient: ['#ece9e6', '#ffffff'],
    brandColor: '#2d3436',
  },
};

export const DEFAULT_STYLE = 'cinematic';

function getDefaultProps(style: string) {
  const preset = STYLE_PRESETS[style] || STYLE_PRESETS[DEFAULT_STYLE];
  return {
    title: 'Your Video',
    segments: [
      { text: 'Welcome to Hostamar', startTime: 2, duration: 3 },
      { text: 'AI-Powered Video Marketing', startTime: 5, duration: 3 },
    ],
    backgroundColor: preset.gradient,
    brandColor: preset.brandColor,
    style,
    language: 'bn',
  };
}

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoComposition"
        component={VideoComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={getDefaultProps(DEFAULT_STYLE)}
      />
    </>
  );
};
