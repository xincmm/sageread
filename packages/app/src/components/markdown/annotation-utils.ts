export function parseAnnotations(text: string): (string | { type: "annotation"; number: string })[] {
  const annotationRegex = /\[([^\]]+)\]/g;
  const parts: (string | { type: "annotation"; number: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  match = annotationRegex.exec(text);
  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push({
      type: "annotation",
      number: match[1],
    });

    lastIndex = match.index + match[0].length;

    match = annotationRegex.exec(text);
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
