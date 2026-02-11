// ─── CSV Export Utilities ─────────────────────────────

interface TagForExport {
  label: string | null;
  publicUuid: string;
  batch: {
    slug: string;
  };
}

/**
 * Generate CSV content for NFC tag export.
 * Columns: label, batchSlug, publicUuid, url
 */
export function generateTagsCsv(
  tags: TagForExport[],
  domain: string
): string {
  const header = "label,batchSlug,publicUuid,url";

  const rows = tags.map((tag) => {
    const label = escapeCsvField(tag.label || "");
    const batchSlug = escapeCsvField(tag.batch.slug);
    const publicUuid = escapeCsvField(tag.publicUuid);
    const url = escapeCsvField(
      `https://${domain}/t/${tag.batch.slug}/${tag.publicUuid}`
    );
    return `${label},${batchSlug},${publicUuid},${url}`;
  });

  return [header, ...rows].join("\n");
}

/**
 * Escape a CSV field value.
 * Wraps in quotes if it contains commas, quotes, or newlines.
 */
function escapeCsvField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
