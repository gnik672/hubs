export class SubtitleBuffer {
  private buffer: string[] = [];
  private line1: string = "";
  private line2: string = "";
  private timer: number | null = null;
  private lastFlushTime = 0;

  private readonly maxWordsPerLine = 12;
  private readonly maxCharsPerLine = 40;
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

  private splitByChar(text: string, charLimit: number): [string, string] {
    const words = text.trim().split(/\s+/);
    let chars = 0;
    const part1: string[] = [];
  
    while (words.length > 0) {
      const word = words[0];
      const nextLen = chars === 0 ? word.length : word.length + 1;
  
      if (chars + nextLen > charLimit) break;
  
      part1.push(words.shift()!);
      chars += nextLen;
    }
  
    return [part1.join(" "), words.join(" ")];
  }

  // private flush() {
  //   if (this.timer) {
  //     clearTimeout(this.timer);
  //     this.timer = null;
  //   }
  
  //   if (this.buffer.length === 0 && !this.line2) return;
  
  //   const MAX = this.maxWordsPerLine;
  //   const totalWords = this.buffer.length;
  
  //   if (totalWords > MAX) {
  //     // Split into two halves and append to current lines
  //     const half = Math.ceil(totalWords / 2);
  //     const part1 = this.buffer.splice(0, half).join(" ");
  //     const part2 = this.buffer.splice(0, MAX).join(" ");
  
  //     this.line1 = [this.line1, part1].filter(Boolean).join(" ");
  //     this.line2 = [this.line2, part2].filter(Boolean).join(" ");
  //   } else {
  //     // Normal scroll: shift line2 to line1, add new line to line2
  //     this.line1 = this.line2;
  //     this.line2 = this.pullLine();
  //   }
  
  //   this.lastFlushTime = Date.now();
  //   this.callback(this.line1, this.line2);
  // }

  // private flush() {
  //   if (this.timer) {
  //     clearTimeout(this.timer);
  //     this.timer = null;
  //   }
  
  //   if (this.buffer.length === 0 && !this.line2) return;
  
  //   const combined = this.buffer.join(" ");
  
  //   if (combined.length > this.maxCharsPerLine * 2) {
  //     const slice = combined.slice(0, this.maxCharsPerLine * 2);
  //     const [part1, part2] = this.splitByChar(slice, this.maxCharsPerLine);
  
  //     this.line1 = part1;
  //     this.line2 = part2;
  
  //     // Remove words that were used
  //     const usedWordCount = (part1 + " " + part2).trim().split(/\s+/).length;
  //     this.buffer.splice(0, usedWordCount);
  //   } else {
  //     this.line1 = this.line2;
  //     this.line2 = this.pullLineByChar();
  //   }
  
  //   this.lastFlushTime = Date.now();
  //   this.callback(this.line1, this.line2);
  // }

  private flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  
    if (this.buffer.length === 0 && !this.line2) return;
  
    const combined = this.buffer.join(" ");
  
    let newLine1 = "";
    let newLine2 = "";
  
    if (combined.length > this.maxCharsPerLine * 2) {
      const slice = combined.slice(0, this.maxCharsPerLine * 2);
      const [part1, part2] = this.splitByChar(slice, this.maxCharsPerLine);
  
      newLine1 = part1;
      newLine2 = part2;
  
      const usedWordCount = (part1 + " " + part2).trim().split(/\s+/).length;
      this.buffer.splice(0, usedWordCount);
    } else {
      newLine1 = this.line2;
      newLine2 = this.pullLineByChar();
    }
  
    this.line1 = "";
    this.line2 = "";
    this.callback("", ""); // 🔸 Show blank panel for 0.4 sec
  
    this.lastFlushTime = Date.now();
  
    setTimeout(() => {
      this.line1 = newLine1;
      this.line2 = newLine2;
      this.callback(this.line1, this.line2);
    }, 200); // ⏱ Blank gap before showing next content
  }
  

  private pullLineByChar(): string {
    let chars = 0;
    const words: string[] = [];
  
    while (this.buffer.length > 0) {
      const nextWord = this.buffer[0];
      const nextLen = chars === 0 ? nextWord.length : nextWord.length + 1;
  
      if (chars + nextLen > this.maxCharsPerLine) break;
  
      words.push(this.buffer.shift()!);
      chars += nextLen;
    }
  
    return words.join(" ");
  }

  // private flush() {
  //   if (this.timer) {
  //     clearTimeout(this.timer);
  //     this.timer = null;
  //   }

  //   if (this.buffer.length === 0 && !this.line2) return;

  //   // Scroll up
  //   this.line1 = this.line2;
  //   this.line2 = this.pullLine();

  //   this.lastFlushTime = Date.now();
  //   this.callback(this.line1, this.line2);


 

  // }
}

