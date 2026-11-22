/** Lightweight line-based text diff for the repair review dialog. */
export interface TextDiffLine {
  type: 'equal' | 'removed' | 'added' | 'changed';
  left: string | null;
  right: string | null;
}

export function diffLines(left: string, right: string): TextDiffLine[] {
  const a = left.split(/\r?\n/);
  const b = right.split(/\r?\n/);
  const n = a.length;
  const m = b.length;

  // LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: TextDiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ type: 'equal', left: a[i], right: b[j] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      // removed
      result.push({ type: 'removed', left: a[i], right: null });
      i += 1;
    } else {
      result.push({ type: 'added', left: null, right: b[j] });
      j += 1;
    }
  }
  while (i < n) {
    result.push({ type: 'removed', left: a[i], right: null });
    i += 1;
  }
  while (j < m) {
    result.push({ type: 'added', left: null, right: b[j] });
    j += 1;
  }

  // Collapse adjacent removed+added into changed pairs for readability.
  const collapsed: TextDiffLine[] = [];
  let k = 0;
  while (k < result.length) {
    if (
      result[k]?.type === 'removed' &&
      k + 1 < result.length &&
      result[k + 1]?.type === 'added'
    ) {
      collapsed.push({ type: 'changed', left: result[k].left, right: result[k + 1].right });
      k += 2;
      continue;
    }
    collapsed.push(result[k]);
    k += 1;
  }
  return collapsed;
}