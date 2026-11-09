import { jsonLdScript } from "@/lib/share/trip-structured-data";

/**
 * Strukturált adat (schema.org JSON-LD) a keresőknek. A tartalmat a `jsonLdScript` escape-eli
 * (`<` → `<`), így a beágyazott szöveg nem zárhatja le a `<script>` blokkot; HTML nem kerül ki.
 */
export function JsonLd({ data }: { data: Record<string, unknown>[] }) {
  const escapedJson = jsonLdScript(data);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: escapedJson }} />;
}
