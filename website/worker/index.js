export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return response;
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const finalSegment = pathname.split("/").filter(Boolean).at(-1) ?? "";

    if (!finalSegment.includes(".")) {
      const indexUrl = new URL(request.url);
      indexUrl.pathname = `${pathname.replace(/\/+$/, "") || ""}/index.html`;
      indexUrl.search = "";
      const indexResponse = await env.ASSETS.fetch(new Request(indexUrl, request));
      if (indexResponse.status !== 404) return indexResponse;
    }

    const notFoundUrl = new URL(request.url);
    notFoundUrl.pathname = "/404.html";
    notFoundUrl.search = "";
    const notFound = await env.ASSETS.fetch(new Request(notFoundUrl, request));

    if (notFound.status === 404) return response;

    return new Response(request.method === "HEAD" ? null : notFound.body, {
      status: 404,
      headers: notFound.headers,
    });
  },
};
