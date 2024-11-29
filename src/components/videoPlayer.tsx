/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import p5 from "p5";

interface VideoPlayerProps {
  videoUrl?: string;
  width?: number;
  height?: number;
}

type ISketch = (...args: any[]) => any;

const PlayButtonSVG = () => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 384 512'>
    <path d='M73 39c-14.8-9.1-33.4-9.4-48.5-.9S0 62.6 0 80L0 432c0 17.4 9.4 33.4 24.5 41.9s33.7 8.1 48.5-.9L361 297c14.3-8.7 23-24.2 23-41s-8.7-32.2-23-41L73 39z' />
  </svg>
);

export default function VideoPlayer({
  videoUrl = "https://getsamplefiles.com/download/webm/sample-2.webm",
  width = 1280,
  height = 720,
}: VideoPlayerProps) {
  const myRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5 | null>(null);
  const videoRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const sketch: ISketch = useCallback(
    (p) => {
      p.preload = async () => {
        try {
          const mediaElement = p.createVideo([""]);
          videoRef.current = mediaElement;
          mediaElement.showControls();
          mediaElement.hide();
          //
          const _videoUrlEncryted = btoa(videoUrl + "?t=" + Date.now()); // Encrypt URL using Base64 encoding
          // Use the streaming API endpoint directly
          const streamUrl = `/api/v1/stream?u=${encodeURIComponent(
            _videoUrlEncryted
          )}`;
          console.log("Setting video source to:", streamUrl);
          mediaElement.elt.src = streamUrl;

          // Add error handler for video element
          mediaElement.elt.onerror = (e: any) => {
            console.error("Video error:", e.message, e);
          };

          // Add load handler
          mediaElement.elt.onloadeddata = () => {
            console.log("Video loaded successfully");
          };

          // Add metadata handler
          mediaElement.elt.onloadedmetadata = () => {
            console.log("Video metadata loaded");
          };

          // Add progress handler
          mediaElement.elt.onprogress = () => {
            const buffered = mediaElement.elt.buffered;
            if (buffered.length > 0) {
              console.log(
                `Buffered: ${buffered.start(0)} to ${buffered.end(0)}`
              );
            }
          };
        } catch (err) {
          console.error("Setup error:", err);
        }
      };
      p.setup = async () => {
        p.createCanvas(width, height);
        videoRef.current.elt.play();
      };

      p.draw = () => {
        p.background(10);
        if (videoRef.current) {
          p.image(videoRef.current, 0, 0, width, height);
        }
      };

      p.mousePressed = () => {
        if (videoRef.current?.elt?.readyState >= 1) {
          // DO not remove below code, this prevents Video element from showing in dom
          const videoElement = document.querySelector("video");
          if (videoElement) videoElement.remove();
          if (videoRef.current?.elt) {
            if (videoRef.current.elt.paused) {
              videoRef.current.elt.play().catch((err: any) => {
                console.error("Play error:", err);
              });
              setIsPlaying(true);
            } else {
              videoRef.current.elt.pause();
              setIsPlaying(false);
            }
            // Keep video element in DOM for now
          }
        } else {
          alert("Video not fully loaded yet");
        }
      };
    },
    [height, videoUrl, width]
  );

  useEffect(() => {
    const setupP5 = async () => {
      if (myRef.current) {
        p5Ref.current = new p5(sketch, myRef.current);
      }
    };

    setupP5();

    return () => {
      if (videoRef.current?.elt?.src) {
        videoRef.current.elt.src = "";
      }
      if (p5Ref.current) {
        p5Ref.current.remove();
      }
    };
  }, [videoUrl, width, height, sketch]);

  return (
    <div style={{ position: "relative", width, height }}>
      <div ref={myRef}></div>
      {!isPlaying && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "60px",
            height: "60px",
            cursor: "pointer",
            fill: "white",
            opacity: 0.8,
          }}
        >
          <PlayButtonSVG />
        </div>
      )}
    </div>
  );
}
