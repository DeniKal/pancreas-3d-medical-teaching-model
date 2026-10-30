/**
 * Optional speech pronunciation helper using Web Speech API.
 */
export class SpeechHelper {
  private static synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

  static speak(text: string) {
    if (!this.synth) return;
    try {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis unavailable or blocked:', e);
    }
  }

  static stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}
