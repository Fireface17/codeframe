function bar(done, total, width = 26) {
  const p = done / total;
  const fill = '='.repeat(Math.round(p * width));
  const pct = Math.round(p * 100);
  return `[${fill.padEnd(width)}] ${pct} %`;
}
