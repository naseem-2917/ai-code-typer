/**
 * Audio Generator using Web Audio API
 * 
 * Three distinct keyboard sounds + error + star
 * Optimized for realistic feel without external files
 */

export class AudioGenerator {
    private ctx: AudioContext;
    private unlocked: boolean = false;

    constructor() {
        // @ts-ignore - webkit prefix for Safari
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    /**
     * Unlock AudioContext on user interaction
     */
    async unlock(): Promise<void> {
        if (this.unlocked) return;

        try {
            if (this.ctx.state === 'closed') {
                // @ts-ignore
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }

            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }
            this.unlocked = true;
        } catch (err) {
            console.warn('AudioContext unlock failed:', err);
        }
    }

    /**
     * Cherry MX Blue - CLICKY
     * Sharp, loud, distinct click with high-pitched snap
     */
    playClicky(volume: number = 0.3): void {
        if (!this.unlocked) return;

        const now = this.ctx.currentTime;

        // High-frequency click oscillator
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        // Sharp high click
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(3000, now);
        osc1.frequency.exponentialRampToValueAtTime(1500, now + 0.005);

        // Mid-range body
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(800, now);
        osc2.frequency.exponentialRampToValueAtTime(200, now + 0.015);

        // Softer attack - reduced volume
        gain.gain.setValueAtTime(volume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc1.start(now);
        osc1.stop(now + 0.03);
        osc2.start(now);
        osc2.stop(now + 0.03);

        osc1.onended = () => {
            osc1.disconnect();
            osc2.disconnect();
            gain.disconnect();
        };
    }

    /**
     * Cherry MX Brown - TACTILE
     * Softer bump, muted, less sharp
     */
    playTactile(volume: number = 0.3): void {
        if (!this.unlocked) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Soft triangle wave - muted feel
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.02);

        // Soft envelope - reduced volume
        gain.gain.setValueAtTime(volume * 0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        osc.start(now);
        osc.stop(now + 0.025);

        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };
    }

    /**
     * Topre - THOCK
     * Deep, low-pitched, satisfying thump
     */
    playThock(volume: number = 0.3): void {
        if (!this.unlocked) return;

        const now = this.ctx.currentTime;

        // Two oscillators for rich thock
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        // Deep bass thump
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(100, now);
        osc1.frequency.exponentialRampToValueAtTime(40, now + 0.04);

        // Mid attack layer
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(250, now);
        osc2.frequency.exponentialRampToValueAtTime(80, now + 0.03);

        // Deep envelope - reduced volume
        gain.gain.setValueAtTime(volume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc1.start(now);
        osc1.stop(now + 0.06);
        osc2.start(now);
        osc2.stop(now + 0.06);

        osc1.onended = () => {
            osc1.disconnect();
            osc2.disconnect();
            gain.disconnect();
        };
    }

    /**
     * Error Sound - Gentle warning (not irritating)
     */
    playError(volume: number = 0.3): void {
        if (!this.unlocked) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Soft sine wave - gentle tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.linearRampToValueAtTime(280, now + 0.1);

        // Very gentle envelope - soft warning
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * 0.15, now + 0.02);
        gain.gain.linearRampToValueAtTime(volume * 0.1, now + 0.06);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.1);

        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };
    }

    /**
     * Star Unlock Sound - Quick soft ding (very short, non-irritating)
     */
    playStar(starNum: number, volume: number = 0.3): void {
        if (!this.unlocked) return;

        const now = this.ctx.currentTime;
        // Soft, pleasant frequencies - G5, A5, B5
        const baseFreq = 784 + (starNum * 55);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        // Soft sine wave
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);

        // Very quick, soft envelope (0.1s total)
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.01);   // Soft attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);      // Quick fade

        osc.start(now);
        osc.stop(now + 0.1);

        osc.onended = () => {
            osc.disconnect();
            gain.disconnect();
        };
    }
}
