export class SubtitleBuffer {
  private buffer: string[] = [];
  private line1: string = "";
  private line2: string = "";
  private timer: number | null = null;
  private lastFlushTime = 0;

  private readonly maxWordsPerLine = 12;
  private readonly minDelay = 1500; // ms
  private readonly maxDelay = 4000; // ms
  private readonly msPerWord = 400; // average reading speed: 200 wpm
  private readonly callback: (line1: string, line2: string) => void;

  constructor(callback: (line1: string, line2: string) => void) {
    this.callback = callback;
  }

  addText(text: string) {
    const words = text.trim().split(/\s+/);
    if (words.length === 0) return;

    this.buffer.push(...words);
    this.maybeFlush();
  }

  private maybeFlush() {
    const now = Date.now();
    const timeSinceLast = now - this.lastFlushTime;

    const lineReady = this.buffer.length >= this.maxWordsPerLine;
    const timeoutReady = timeSinceLast >= this.getDynamicDelay();

    if (lineReady || timeoutReady) {
      this.flush();
    } else if (!this.timer) {
      const remainingTime = this.getDynamicDelay() - timeSinceLast;
      this.timer = window.setTimeout(() => this.flush(), remainingTime);
    }
  }

  private getDynamicDelay(): number {
    const wordCount = this.line2 ? this.line2.split(/\s+/).length : this.maxWordsPerLine;
    const estimated = wordCount * this.msPerWord;
    return Math.min(this.maxDelay, Math.max(this.minDelay, estimated));
  }

  private pullLine(): string {
    const words: string[] = [];
    while (words.length < this.maxWordsPerLine && this.buffer.length > 0) {
      words.push(this.buffer.shift()!);
    }
    return words.join(" ");
  }

  private flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.buffer.length === 0 && !this.line2) return;

    // Scroll up
    this.line1 = this.line2;
    this.line2 = this.pullLine();

    this.lastFlushTime = Date.now();
    this.callback(this.line1, this.line2);
  }
}

