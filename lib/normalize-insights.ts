/**
 * If an insight's description contains JSON (e.g. from a failed parse fallback),
 * parse and expand into structured insights for display as a professional report.
 */
export function normalizeInsightsForDisplay(insights: unknown[]): unknown[] {
  if (!Array.isArray(insights) || insights.length === 0) return insights;
  const result: unknown[] = [];
  for (const insight of insights) {
    if (!insight || typeof insight !== 'object') {
      result.push(insight);
      continue;
    }
    const obj = insight as Record<string, unknown>;
    const desc = typeof obj.description === 'string' ? obj.description.trim() : '';
    const looksLikeJson = desc.startsWith('{') || desc.startsWith('[');
    const isFallbackTitle =
      obj.title === 'Data Analysis Complete' || !obj.title || obj.title === '';

    if (looksLikeJson && isFallbackTitle) {
      try {
        const parsed = JSON.parse(desc) as unknown;
        const extracted: unknown[] = Array.isArray((parsed as Record<string, unknown>)?.insights)
          ? ((parsed as Record<string, unknown>).insights as unknown[])
          : Array.isArray(parsed)
            ? parsed
            : [];
        if (
          extracted.length > 0 &&
          extracted.every(
            (i: unknown) =>
              i &&
              typeof i === 'object' &&
              ((i as Record<string, unknown>).title != null ||
                (i as Record<string, unknown>).description != null)
          )
        ) {
          result.push(...extracted);
          continue;
        }
      } catch {
        /* ignore */
      }
    }
    result.push(insight);
  }
  return result;
}
