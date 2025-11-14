import { NextRequest, NextResponse } from "next/server";

// サーバーサイド（コンテナ間通信）ではINTERNAL_BACKEND_URLを優先し、
// 未設定の場合はNEXT_PUBLIC_BACKEND_URL（ホストマシンからのアクセス用）を使用する
const BACKEND_URL =
  process.env.INTERNAL_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file");

    if (!(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: "音声ファイルが正しく送信されませんでした。" },
        { status: 400 }
      );
    }

    if (!BACKEND_URL) {
      console.error("Backend URL is not configured.");
      return NextResponse.json(
        { error: "バックエンドの接続先が設定されていません。" },
        { status: 500 }
      );
    }

    const relayFormData = new FormData();
    // ファイル名がない場合を考慮してデフォルト値を設定
    const filename =
      (audioFile as File).name || `dream-audio-${Date.now()}.webm`;
    relayFormData.append("file", audioFile, filename);

    let backendResponse: Response;
    try {
      backendResponse = await fetch(`${BACKEND_URL}/analyze_audio_dream`, {
        method: "POST",
        body: relayFormData,
        // 認証情報をCookie経由でバックエンドに渡す
        headers: {
          cookie: req.headers.get("cookie") ?? "",
        },
      });
    } catch (networkError) {
      console.error("Failed to fetch backend:", networkError);
      return NextResponse.json(
        { error: "音声分析サービスへの接続に失敗しました。" },
        { status: 503 } // 503 Service Unavailable
      );
    }

    if (!backendResponse.ok) {
      // バックエンドからのエラーレスポンス(JSON)をパース試行
      let errorPayload = {
        error: `音声分析サービスが予期せぬエラーを返しました: ${backendResponse.status}`,
      };
      try {
        const errorJson = await backendResponse.json();
        // バックエンドからの `error` メッセージがあればそれを使う
        if (errorJson && errorJson.error) {
          errorPayload = errorJson;
        }
      } catch (e) {
        // JSONパースに失敗した場合でも、ステータスコードは維持する
        console.error("Could not parse error JSON from backend", e);
      }
      return NextResponse.json(errorPayload, {
        status: backendResponse.status,
      });
    }

    const parsedBody = await backendResponse.json();
    return NextResponse.json(parsedBody, { status: 200 });
  } catch (error) {
    console.error("Audio dream analysis proxy failed", error);
    return NextResponse.json(
      { error: "音声解析リクエストに失敗しました。" },
      { status: 500 }
    );
  }
}
