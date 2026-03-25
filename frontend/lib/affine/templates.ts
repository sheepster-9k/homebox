/**
 * Markdown templates for generating Affine documents from Homebox data.
 */

interface ItemData {
  id: string;
  name: string;
  description?: string;
  quantity?: number;
  manufacturer?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchasePrice?: number | null;
  purchaseFrom?: string;
  notes?: string;
  locationName?: string;
  tags?: string[];
  insured?: boolean;
}

interface LocationData {
  id: string;
  name: string;
  description?: string;
  itemCount?: number;
  totalValue?: number;
  items?: { name: string; quantity: number }[];
}

/** Generate a markdown document for a Homebox item. */
export function itemToMarkdown(item: ItemData): string {
  const lines: string[] = [
    `<!-- homebox:item:${item.id} -->`,
    `# ${item.name}`,
    "",
  ];

  // Details table
  const details: [string, string][] = [];
  if (item.locationName) details.push(["Location", item.locationName]);
  if (item.quantity && item.quantity > 1) details.push(["Quantity", String(item.quantity)]);
  if (item.manufacturer) details.push(["Manufacturer", item.manufacturer]);
  if (item.modelNumber) details.push(["Model", item.modelNumber]);
  if (item.serialNumber) details.push(["Serial Number", `\`${item.serialNumber}\``]);
  if (item.purchasePrice) details.push(["Purchase Price", `$${item.purchasePrice.toFixed(2)}`]);
  if (item.purchaseFrom) details.push(["Purchased From", item.purchaseFrom]);
  if (item.insured !== undefined) details.push(["Insured", item.insured ? "Yes" : "No"]);

  if (details.length > 0) {
    lines.push("| Field | Value |", "|-------|-------|");
    for (const [k, v] of details) {
      lines.push(`| ${k} | ${v} |`);
    }
    lines.push("");
  }

  if (item.tags && item.tags.length > 0) {
    lines.push(`**Tags:** ${item.tags.join(", ")}`, "");
  }

  if (item.description) {
    lines.push("## Description", "", item.description, "");
  }

  if (item.notes) {
    lines.push("## Notes", "", item.notes, "");
  }

  lines.push("---", `*Generated from Homebox AI Studio*`);
  return lines.join("\n");
}

/** Generate a location summary markdown document. */
export function locationToMarkdown(location: LocationData): string {
  const lines: string[] = [
    `<!-- homebox:location:${location.id} -->`,
    `# ${location.name}`,
    "",
  ];

  if (location.description) {
    lines.push(location.description, "");
  }

  const stats: string[] = [];
  if (location.itemCount !== undefined) stats.push(`**Items:** ${location.itemCount}`);
  if (location.totalValue !== undefined) stats.push(`**Total Value:** $${location.totalValue.toFixed(2)}`);
  if (stats.length > 0) {
    lines.push(stats.join(" | "), "");
  }

  if (location.items && location.items.length > 0) {
    lines.push("## Items", "", "| Name | Qty |", "|------|-----|");
    for (const item of location.items) {
      lines.push(`| ${item.name} | ${item.quantity} |`);
    }
    lines.push("");
  }

  lines.push("---", `*Generated from Homebox AI Studio*`);
  return lines.join("\n");
}

/** Generate an inventory report markdown document. */
export function inventoryReportToMarkdown(data: {
  totalItems: number;
  totalLocations: number;
  totalValue: number;
  topLocations: { name: string; count: number; value: number }[];
  generatedAt: string;
}): string {
  const lines: string[] = [
    "# Inventory Report",
    "",
    `*Generated: ${data.generatedAt}*`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Items | ${data.totalItems} |`,
    `| Total Locations | ${data.totalLocations} |`,
    `| Total Value | $${data.totalValue.toFixed(2)} |`,
    "",
  ];

  if (data.topLocations.length > 0) {
    lines.push(
      "## Locations by Item Count",
      "",
      "| Location | Items | Value |",
      "|----------|-------|-------|",
    );
    for (const loc of data.topLocations) {
      lines.push(`| ${loc.name} | ${loc.count} | $${loc.value.toFixed(2)} |`);
    }
    lines.push("");
  }

  lines.push("---", `*Generated from Homebox AI Studio*`);
  return lines.join("\n");
}
