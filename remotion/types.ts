export interface ScriptSegment {
  text: string;
  startTime: number; // in seconds
  duration: number;  // in seconds
}

export interface VideoScript {
  title: string;
  segments: ScriptSegment[];
  music: boolean;
  language: string; // 'bn' | 'en' | 'mixed'
}

export interface VideoCompositionProps {
  title: string;
  segments: ScriptSegment[];
  backgroundColor: [string, string];
  brandColor: string;
  style: string;
  language: string;
}
