export type { STTService } from './STTService'
export { GCPSpeechToTextService } from './GCPSpeechToTextService'

import { GCPSpeechToTextService } from './GCPSpeechToTextService'
export const sttService = new GCPSpeechToTextService({
  languageCode: 'en-US',
  enableAutomaticPunctuation: true,
  maxAlternatives: 1,
})
