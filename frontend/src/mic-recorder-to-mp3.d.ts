declare module 'mic-recorder-to-mp3' {
    interface MicRecorderOptions {
      bitRate?: number;
      encoder?: 'mp3' | 'wav';
      mimeType?: 'audio/mp3' | 'audio/wav';
    }
  
    class MicRecorder {
      constructor(options?: MicRecorderOptions);
      start(): Promise<void>;
      stop(): Promise<[ArrayBuffer, Blob]>;
      getMp3(): Promise<[ArrayBuffer, Blob]>;
    }
  
    export default MicRecorder;
  }