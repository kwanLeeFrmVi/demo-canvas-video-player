import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const _videoUrl = searchParams.get("u");

    if (!_videoUrl) {
      return new Response("Video URL is required", { status: 400 });
    }

    const videoUrl = atob(_videoUrl);
    console.log("Received request for video:", videoUrl);
    //get ?t=timestamp
    const time = new URL(videoUrl).searchParams.get("t");
    if (time) {
      const timeDiff = Date.now() - Number.parseInt(time);
      console.log("Video URL with timestamp diff:", timeDiff);
      if (timeDiff > 60000) {
        //60s expired
        return new Response("Video URL is expired", { status: 400 });
      }
    }

    // First, get video metadata
    const headResponse = await fetch(videoUrl, { method: "HEAD" });
    if (!headResponse.ok) {
      return new Response("Failed to fetch video metadata", {
        status: headResponse.status,
      });
    }

    const contentLength = headResponse.headers.get("content-length");
    const contentType = "undefined"; // headResponse.headers.get("content-type") || "video/mp4";

    console.log("Video metadata:", { contentLength, contentType });

    // Get the range header from the request
    const rangeHeader = request.headers.get("range");
    console.log("Range header:", rangeHeader);

    // Calculate content range
    let start = 0;
    let end = contentLength ? parseInt(contentLength) - 1 : undefined;

    if (rangeHeader) {
      const matches = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
      if (matches) {
        start = parseInt(matches[1]);
        end = matches[2] ? parseInt(matches[2]) : end;
      }
    }

    console.log("Content range:", { start, end });

    // Fetch video with range
    const response = await fetch(videoUrl, {
      headers: {
        Range: `bytes=${start}-${end}`,
      },
    });

    if (!response.ok && response.status !== 206) {
      console.error("Fetch failed:", response.statusText);
      return new Response(`Failed to fetch video: ${response.statusText}`, {
        status: response.status,
      });
    }

    // Set up response headers
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Accept-Ranges", "bytes");
    headers.set("Access-Control-Allow-Origin", "*");

    if (contentLength) {
      const chunkSize = end ? end - start + 1 : parseInt(contentLength);
      headers.set("Content-Length", chunkSize.toString());
      headers.set("Content-Range", `bytes ${start}-${end}/${contentLength}`);
    }

    // Return the streaming response
    return new Response(response.body, {
      status: rangeHeader ? 206 : 200,
      headers,
    });
  } catch (error) {
    console.error("Streaming error:", error);
    return new Response(
      error instanceof Error ? error.message : "Internal Server Error",
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
        },
      }
    );
  }
}
