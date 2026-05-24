export type { TTSService } from './TTSService'
export { WebSpeechTTSService } from './WebSpeechTTSService'

import { WebSpeechTTSService } from './WebSpeechTTSService'
export const ttsService = new WebSpeechTTSService()
