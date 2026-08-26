// Small questions the repairs ask about a character before deciding whether it
// is markup at all.

export function escapedMarker(text: string, index: number): boolean {
  let i;
  let count;

  count = 0;
  i = index - 1;

  while (i >= 0 && text.charAt(i) === "\\") {
    count++;
    i--;
  }

  return count % 2 === 1;
}

export function bulletMarker(text: string, index: number): boolean {
  let i;
  let next;

  i = index - 1;

  while (i >= 0 && (text.charAt(i) === " " || text.charAt(i) === "\t")) {
    i--;
  }

  if (i >= 0 && text.charAt(i) !== "\n") {
    return false;
  }

  next = text.charAt(index + 1);

  return next === "" || next === " " || next === "\t";
}
