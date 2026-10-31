export function catalogProductsUrl(): string {
  const base = process.env.NEXT_PUBLIC_CATALOG_URL?.replace(/\/+$/, "");
  if (!base) return "#";
  return `${base.replace(/\/productos$/, "")}/productos`;
}
