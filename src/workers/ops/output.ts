/**
 * Coalesce small output fragments so large documents do not create
 * millions of tiny array entries before the final join.
 */
export class OutputBuilder {
  private chunks: string[] = [];
  private parts: string[] = [];
  private size = 0;

  push(...values: string[]): void {
    for (const value of values) {
      if (value.length === 0) continue;
      this.parts.push(value);
      this.size += value.length;
    }

    if (this.size >= 65_536) this.flush();
  }

  toString(): string {
    this.flush();
    return this.chunks.join('');
  }

  private flush(): void {
    if (this.parts.length === 0) return;

    this.chunks.push(this.parts.join(''));
    this.parts = [];
    this.size = 0;
  }
}
