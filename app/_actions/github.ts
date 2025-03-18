"use server";

import * as cheerio from "cheerio";

export async function getReadme(url: string) {
  const response = await fetch(url);
  const html = await response.text();

  const $ = cheerio.load(html);

  const fragments = $(
    'script[type="application/json"][data-target="react-partial.embeddedData"]'
  ).toArray();

  const readme = fragments
    .filter((fragment) => $(fragment).text().includes("overview"))
    .map((fragment) => $(fragment).text());

  const data = JSON.parse(readme[readme.length - 1]);
  const readmeData = data.props.initialPayload.overview.overviewFiles?.[0].richText;
  return readmeData;
}

