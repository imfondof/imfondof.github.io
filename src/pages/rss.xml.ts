import type { APIContext } from "astro";
import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort((a, b) => {
    const aTime = a.data.pubDate?.getTime() ?? 0;
    const bTime = b.data.pubDate?.getTime() ?? 0;
    return bTime - aTime;
  });

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site ?? "https://shuothink.com",
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? "",
      pubDate: post.data.pubDate ?? new Date(0),
      link: `/blog/${post.slug}/`
    }))
  });
}
