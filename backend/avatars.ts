
export interface Avatar {
  id: string;
  name: string;
  ttsEngine: string;
  ttsVoice: string;
}

export const avatars: Avatar[] = [
  {
    id: 'avatar1',
    name: 'Apex',
    ttsEngine: 'tts-engine-1',
    ttsVoice: 'voice-1',
  },
  {
    id: 'avatar2', 
    name: 'Stratego',
    ttsEngine: 'tts-engine-2',
    ttsVoice: 'voice-2',
  },
  // Add more avatars as needed
];
