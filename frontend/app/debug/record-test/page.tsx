"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const MIN_BLOB_SIZE = 2048; // 2KB
const MIN_DURATION_MS = 800; // 0.8秒

type BlobInfo = {
  size: number;
  duration: number;
  mimeType: string;
};

export default function RecordTestPage() {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastBlobInfo, setLastBlobInfo] = useState<BlobInfo | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const getPreferredAudioStream = async (): Promise<MediaStream> => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((d) => d.kind === "audioinput");

    const realMics = inputs.filter((d) => {
      const label = d.label.toLowerCase();
      return (
        !label.includes("display") &&
        !label.includes("monitor") &&
        !label.includes("hdmi")
      );
    });

    const target = realMics[0] ?? inputs[0];

    if (!target) {
      throw new Error("利用できるマイク入力デバイスが見つかりません。");
    }

    return navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: target.deviceId ? { exact: target.deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  };

  const startRecording = async () => {
    setError(null);
    setAudioURL(null);
    setLastBlobInfo(null);

    try {
      const stream = await getPreferredAudioStream();
      streamRef.current = stream;

      const tracks = stream.getAudioTracks();
      if (tracks.length === 0) {
        throw new Error("マイクが見つかりません。");
      }

      const [track] = tracks;
      setTimeout(() => {
        if (track.muted) {
          track.stop();
          setError(
            "マイクから音声が取得できません（無音デバイスの可能性があります）。"
          );
          setRecording(false);
          cleanupStream();
        }
      }, 500);

      let mimeType = "";
      if (typeof MediaRecorder.isTypeSupported === "function") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mimeType = "audio/ogg;codecs=opus";
        }
      }
      mimeTypeRef.current = mimeType || "audio/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeTypeRef.current,
      });
      mediaRecorderRef.current = recorder;

      chunksRef.current = [];
      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const duration = recordingStartedAtRef.current
          ? performance.now() - recordingStartedAtRef.current
          : 0;
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });

        console.log(
          `Blob created. Size: ${blob.size} bytes, Duration: ${duration.toFixed(
            2
          )} ms, Type: ${blob.type}`
        );
        setLastBlobInfo({
          size: blob.size,
          duration,
          mimeType: blob.type,
        });

        if (blob.size < MIN_BLOB_SIZE || duration < MIN_DURATION_MS) {
          setError(
            `録音が短すぎるか無音です (サイズ: ${blob.size} B, 時間: ${Math.round(
              duration
            )} ms)`
          );
        } else {
          if (audioURL) {
            URL.revokeObjectURL(audioURL);
          }
          const url = URL.createObjectURL(blob);
          setAudioURL(url);
        }

        cleanupStream();
        setRecording(false);
      };

      recordingStartedAtRef.current = performance.now();
      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Recording failed to start:", err);
      setError(
        err instanceof Error ? err.message : "録音の開始に失敗しました。"
      );
      cleanupStream();
      setRecording(false);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  };

  useEffect(() => {
    return () => {
      cleanupStream();
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [cleanupStream, audioURL]);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Minimal Recorder Test</h1>
      <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
        1. 録音開始 → 2〜3秒しゃべる → 停止 → 下の audio で再生して確認
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={startRecording} disabled={recording}>
          🎙 録音開始
        </button>
        <button
          onClick={stopRecording}
          disabled={!recording}
          style={{ marginLeft: "0.5rem" }}
        >
          ⏹ 停止
        </button>
      </div>

      {error && (
        <p style={{ color: "red", border: "1px solid red", padding: "8px" }}>
          エラー: {error}
        </p>
      )}

      {lastBlobInfo && (
        <p style={{ marginTop: "0.5rem" }}>
          Blob: {lastBlobInfo.size} bytes / {lastBlobInfo.duration.toFixed(0)}{" "}
          ms / {lastBlobInfo.mimeType}
        </p>
      )}

      {audioURL && (
        <div style={{ marginTop: "1rem" }}>
          <audio controls src={audioURL} />
        </div>
      )}
    </div>
  );
}
