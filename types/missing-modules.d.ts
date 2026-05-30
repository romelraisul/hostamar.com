// Type declarations for modules without @types packages
declare module 'nodemailer' {
  interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
    [key: string]: any;
  }
  interface SentMessageInfo {
    messageId: string;
    response: string;
    [key: string]: any;
  }
  export function createTransport(options: TransportOptions): any;
}

declare module 'web-push' {
  export function setVapidDetails(
    subject: string,
    publicKey: string,
    privateKey: string
  ): void;
  export function sendNotification(
    subscription: any,
    payload?: string,
    options?: any
  ): Promise<any>;
}

declare module 'openai' {
  export default class OpenAI {
    constructor(config: { apiKey: string });
    chat: {
      completions: {
        create(params: any): Promise<any>;
      };
    };
    images: {
      generate(params: any): Promise<any>;
    };
  }
}

declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config: any);
    send(command: any): Promise<any>;
  }
  export class PutObjectCommand {
    constructor(input: any);
  }
  export class GetObjectCommand {
    constructor(input: any);
  }
}

declare module 'fluent-ffmpeg' {
  interface FfmpegCommand {
    output(output: string): FfmpegCommand;
    on(event: string, callback: (...args: any[]) => void): FfmpegCommand;
    run(): void;
    input(input: string): FfmpegCommand;
    inputOptions(options: string[]): FfmpegCommand;
    outputOptions(options: string[]): FfmpegCommand;
    size(size: string): FfmpegCommand;
    videoCodec(codec: string): FfmpegCommand;
    videoBitrate(bitrate: string): FfmpegCommand;
    audioCodec(codec: string): FfmpegCommand;
    audioBitrate(bitrate: string): FfmpegCommand;
    format(format: string): FfmpegCommand;
    fps(fps: number): FfmpegCommand;
    duration(duration: number): FfmpegCommand;
    seek(seek: string): FfmpegCommand;
    clone(): FfmpegCommand;
    pipe(stream: any): FfmpegCommand;
    toFormat(format: string): FfmpegCommand;
    setStartTime(time: string): FfmpegCommand;
    save(output: string): FfmpegCommand;
    ffprobe(path: string, callback: (err: any, data: any) => void): void;
  }
  function ffmpeg(input?: string): FfmpegCommand;
  export default ffmpeg;
}

declare module '@google-cloud/text-to-speech' {
  export class TextToSpeechClient {
    constructor();
    synthesizeSpeech(request: any): Promise<any>;
  }
}

declare module 'elevenlabs-node' {
  export default class ElevenLabs {
    constructor(config: { apiKey: string });
    textToSpeech(params: {
      voiceId: string;
      text: string;
      model_id?: string;
    }): Promise<any>;
    getVoices(): Promise<any>;
  }
}
