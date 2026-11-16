import Image from "next/image";
import { BRAND } from "@uat/config";
import { useTranslation } from "@/lib/i18n/useTranslation";

const stories = [
  {
    region: "zhoStories.bhutan",
    title: "zhoStories.bhutanTitle",
    alt: "zhoStories.bhutanAlt",
    image: "/brand/stories/zhaw-laga.png",
    paragraphs: ["zhoStories.bhutanOpening", "zhoStories.bhutanSpring", "zhoStories.bhutanEnding"],
    sources: [
      { label: "zhoStories.bhutanSource", href: "https://av.mandala.library.virginia.edu/video/account-yak-shaw-lagar-0" },
    ],
  },
  {
    region: "zhoStories.tibet",
    title: "zhoStories.tibetTitle",
    alt: "zhoStories.tibetAlt",
    image: "/brand/stories/kailash.png",
    paragraphs: ["zhoStories.tibetOpening", "zhoStories.tibetEnding"],
    sources: [
      { label: "zhoStories.tibetSource", href: "https://www.gutenberg.org/files/52594/52594-h/52594-h.htm#Page_171" },
      { label: "zhoStories.tibetTradition", href: "https://rywiki.tsadra.org/index.php/Cave_in_which_the_Dri_Vanished" },
    ],
  },
] as const;

export function ZhoStories() {
  const { t } = useTranslation();

  return (
    <section id="meet-zho" aria-labelledby="meet-zho-title" className="bg-canvas text-ink">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">
        <div className="grid items-center gap-6 border-t border-line pt-8 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:gap-12">
          <div className="min-w-0">
            <Image src="/brand/stories/zho.svg" alt={BRAND.name} width={2260} height={948} className="h-auto w-full max-w-[23rem]" />
            <h2 id="meet-zho-title" className="mt-4 font-serif text-4xl leading-tight lg:text-5xl">{t("zhoStories.title")}</h2>
          </div>
          <div className="max-w-[52ch] space-y-4 font-serif text-lg leading-relaxed lg:text-xl">
            <p className="whitespace-pre-line">{t("zhoStories.opening")}</p>
            <p><strong>{t("zhoStories.emphasis")}</strong>{" "}{t("zhoStories.ending")}</p>
          </div>
        </div>
        <div className="mt-10 grid items-start gap-6 md:grid-cols-2">
          {stories.map((story) => (
            <article key={story.image} className="min-w-0 border-b border-line pb-4">
              <Image src={story.image} alt={t(story.alt)} width={1536} height={1024} sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, 100vw" className="h-auto w-full" />
              <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-widest text-accent">{t(story.region)}</p>
              <h3 className="mt-2 text-balance font-serif text-2xl lg:text-3xl">{t(story.title)}</h3>
              <details className="mt-3 border border-line bg-surface">
                <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold">{t("zhoStories.read")}</summary>
                <div className="space-y-4 px-4 pb-4 font-serif text-lg leading-relaxed sm:px-6">
                  {story.paragraphs.map((paragraph) => <p key={paragraph}>{t(paragraph)}</p>)}
                  <ul className="space-y-2 border-t border-line pt-3 font-sans text-sm">
                    {story.sources.map((source) => (
                      <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{t(source.label)}</a></li>
                    ))}
                  </ul>
                </div>
              </details>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
