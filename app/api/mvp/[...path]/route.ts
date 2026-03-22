import { NextResponse } from "next/server";

const DEFAULT_BASE_URL = "http://localhost:8787/api";

function getBaseUrl() {
  return process.env.MVP_API_BASE_URL || DEFAULT_BASE_URL;
}

function buildTargetUrl(pathSegments: string[], request: Request) {
  const baseUrl = getBaseUrl().replace(/\/$/, "");
  const pathname = pathSegments.map(encodeURIComponent).join("/");
  const incoming = new URL(request.url);
  const query = incoming.search || "";
  return `${baseUrl}/${pathname}${query}`;
}

async function forward(request: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  try {
    const resolvedParams = (ctx.params instanceof Promise) ? await ctx.params : ctx.params;
    const pathSegments = resolvedParams.path || [];
    const targetUrl = buildTargetUrl(pathSegments, request);

    const headers = new Headers(request.headers);
    headers.delete("host");

    const method = request.method.toUpperCase();
    const hasBody = method !== "GET" && method !== "HEAD";
    const body = hasBody ? await request.text() : undefined;

    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body
    });

    const upstreamBody = await upstream.arrayBuffer();
    const responseHeaders = new Headers(upstream.headers);

    return new NextResponse(upstreamBody, {
      status: upstream.status,
      headers: responseHeaders
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PROXY_ERROR",
          message: error instanceof Error ? error.message : "Proxy request failed"
        }
      },
      { status: 502 }
    );
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  return forward(request, ctx);
}

export async function POST(request: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  return forward(request, ctx);
}

export async function PUT(request: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  return forward(request, ctx);
}

export async function PATCH(request: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  return forward(request, ctx);
}

export async function DELETE(request: Request, ctx: { params: Promise<{ path: string[] }> | { path: string[] } }) {
  return forward(request, ctx);
}
