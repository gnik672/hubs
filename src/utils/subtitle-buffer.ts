export class SubtitleBuffer {
  private buffer: string[] = [];
  private line1: string = "";
  private line2: string = "";
  private timer: number | null = null;
  private lastFlushTime = 0;

  private readonly maxWordsPerLine = 8;
  private readonly flushDelay = 2500; // milliseconds
  private readonly minFlushDelay = 1500; // minimum delay between flushes
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

    if (!this.line1) {
      this.line1 = this.pullLine();
    }

    if (!this.line2 && this.buffer.length > 0) {
      this.line2 = this.pullLine();
    }

    const enoughContent = this.line1 && this.line2;
    const timePassed = now - this.lastFlushTime >= this.flushDelay;

    if (enoughContent || timePassed) {
      this.flush();
    } else if (!this.timer) {
      this.timer = window.setTimeout(() => this.flush(), this.flushDelay);
    }
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

    if (!this.line1 && !this.line2) return;

    const l1 = this.line1;
    const l2 = this.line2;

    this.line1 = "";
    this.line2 = "";
    this.lastFlushTime = Date.now();

    this.callback(l1, l2);
  }
}