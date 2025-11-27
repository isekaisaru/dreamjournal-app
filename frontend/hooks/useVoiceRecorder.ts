"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";

const MIN_BLOB_SIZE = 2048; // 2KB 未満は「ほぼ無音」とみなす
const MIN_DURATION_MS = 800; // 0.8 秒未満の録音は無効

type UseVoiceRecorderOptions = {
  onBlobReady: (blob: Blob) => void;
};

const useVoiceRecorder = ({ onBlobReady }: UseVoiceRecorderOptions) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const mimeTypeRef = useRef<string>("");

  // ストリームと MediaRecorder の後片付け
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    startedAtRef.current = null;
  }, []);

  // 「モニター系の無音マイク」を避けてマイクを選択
  const getPreferredAudioStream = async (): Promise<MediaStream> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("このブラウザは音声録音に対応していません。");
    }

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
      throw new Error("利用できるマイクが見つかりません。");
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

  const startRecording = useCallback(async () => {
    setError(null);
    if (isRecording) return;

    try {
      const stream = await getPreferredAudioStream();
      streamRef.current = stream;

      const [track] = stream.getAudioTracks();
      if (!track) {
        throw new Error("音声トラックの取得に失敗しました。");
      }

      // Chrome × モニターで「無音デバイス」を掴んでないかチェック
      setTimeout(() => {
        if (track.muted) {
          const msg =
            "無音デバイスを検出しました。別のマイクを選択してお試しください。";
          setError(msg);
          toast.error(msg);
          cleanupStream();
          setIsRecording(false);
        }
      }, 500);

      // MediaRecorder の MIME タイプ判定（record-test から移植）
      let mime = "";
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mime = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mime = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
          mime = "audio/ogg;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mime = "audio/mp4"; // Safari fallback
        } else if (MediaRecorder.isTypeSupported("audio/aac")) {
          mime = "audio/aac";
        }
      }
      mimeTypeRef.current = mime || "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType: mimeTypeRef.current });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const duration =
          startedAtRef.current != null
            ? performance.now() - startedAtRef.current
            : 0;

        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });

        console.log("Debug: Recording stopped", {
          blobSize: blob.size,
          duration,
          mimeType: mimeTypeRef.current,
          chunksCount: chunksRef.current.length,
        });

        if (blob.size < MIN_BLOB_SIZE || duration < MIN_DURATION_MS) {
          const msg = "録音が短すぎるか、無音の可能性があります。";
          console.warn("Debug: Recording too short or silent", { blobSize: blob.size, duration });
          setError(msg);
          toast.error(msg);
        } else {
          onBlobReady(blob);
        }

        cleanupStream();
        setIsRecording(false);
      };

      startedAtRef.current = performance.now();
      recorder.start();
      setIsRecording(true);
      toast.success("録音を開始しました。話し終わったら再度タップしてください。");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "録音開始に失敗しました。";
      setError(msg);
      toast.error(msg);
      cleanupStream();
      setIsRecording(false);
    }
  }, [cleanupStream, isRecording, onBlobReady]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      toast.success("録音を停止しました。解析を開始します。");
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  return { isRecording, error, startRecording, stopRecording };
};

export default useVoiceRecorder;
