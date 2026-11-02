/**
 * M211 — WebVTT felirat egy útmutatóhoz: `/api/v1/tutorials/<slug>/captions/<hu|en>`.
 * A feliratsorok a lépésekből készülnek (lib/tutorials `buildVtt`), így a videó felirata,
 * a lépéslista és a „Teljes felirat szövege” mindig ugyanaz.
 */

import { buildVtt, getTutorial, type TutorialLocale } from "@/lib/tutorials";

export const dynamic = "force-static";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  const tutorial = getTutorial(slug);
  if (!tutorial || (locale !== "hu" && locale !== "en")) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(buildVtt(tutorial, locale as TutorialLocale), {
    headers: {
      "Content-Type": "text/vtt; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
