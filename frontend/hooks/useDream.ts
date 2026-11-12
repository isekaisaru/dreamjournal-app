import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Dream } from "../app/types";
import { useAuth } from "@/context/AuthContext";
import apiClient from "../lib/apiClient";

export interface DreamInput {
  title: string;
  content?: string;
  emotion_ids?: number[];
  analysis_json?: {
    analysis: string;
    text?: string;
    emotion_tags: string[];
  };
  analysis_status?: string;
  analyzed_at?: string;
}

// "1abc" や "1.5" を parseInt すると夢1として扱われてしまうため、正の整数だけを受け付ける。
// 桁が大きすぎて丸められる（別の夢IDになる）値も受け付けない。
const parseDreamId = (id?: string): number | null => {
  if (!id || !/^[1-9]\d*$/.test(id)) return null;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

// サーバーが返した edit_version を、保存の基準として使える値（0以上の整数）だけ受け付ける。
// #566 より前のバックエンドは返さないので、その場合は null（= 版番号を送らない旧クライアント扱い）。
const parseEditVersion = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;

// 409 のうち、サーバーが「編集の基準にした版が古い」と判定したものだけを競合として扱う。
// apiClient の ApiError を instanceof で判定せず形で見る（テストでモックしても判定できるように）。
const isEditConflictError = (err: unknown): boolean => {
  if (typeof err !== "object" || err === null) return false;
  const { status, data } = err as { status?: unknown; data?: unknown };
  return (
    status === 409 &&
    typeof data === "object" &&
    data !== null &&
    (data as { code?: unknown }).code === "edit_conflict"
  );
};

export const useDream = (id?: string) => {
  const [dream, setDream] = useState<Dream | null>(null);
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  // 保存が 409 edit_conflict で拒否された（別の画面・端末の保存が先に確定した）。
  // 入力を守るため dream は差し替えず、利用者が最新の読み込みを選ぶまで残す。
  const [editConflict, setEditConflict] = useState(false);
  const router = useRouter();
  const { authStatus, isLoggedIn } = useAuth();
  const numericId = parseDreamId(id);
  // 夢IDを素早く切り替えると、古いIDの応答が新しい方より後に届くことがある。
  // その古い応答で表示を上書きしないよう、「自分が最後に発行したfetchDreamDetailか」
  // をrefで判定する（#493/#494と同じ最小パターン）。
  const latestDreamFetchIdRef = useRef(0);
  // いまこの画面が表示している夢ID（アンマウント後はnull）。
  // 保存・削除を始めてよいか（古いクロージャから呼ばれていないか）の判定に使う。
  const activeDreamIdRef = useRef<number | null>(null);
  // 表示コンテキスト（夢ID・認証状態）の世代。ID切替・認証状態の変化・アンマウントで進む。
  // 保存・削除の完了時に世代が変わっていたら、その結果をこの画面へ一切反映しない
  // （夢1→2→1と同じIDへ戻った場合も別世代として扱う）。
  const displayGenerationRef = useRef(0);
  // 保存中（PUT未完了）の表示世代。同じ世代では保存を1件に制限し、
  // 重なった古い保存が再取得・error・戻り値・isUpdatingを書き換えないようにする。
  const updatingGenerationRef = useRef<number | null>(null);
  // 次の保存で expected_edit_version として送る版番号（Issue #561）。
  // 表示中の夢を読み込んだときと、保存が200で返ったときに更新する。
  // 再描画を起こさないよう ref に持つ（dream を差し替えると編集フォームの入力が初期化されるため）。
  const editVersionRef = useRef<{ dreamId: number; version: number | null } | null>(
    null
  );

  useEffect(() => {
    activeDreamIdRef.current = numericId;
    return () => {
      activeDreamIdRef.current = null;
      displayGenerationRef.current += 1;
      // 前の世代で発行したGETの応答は、以後どれも反映しない。
      latestDreamFetchIdRef.current += 1;
      // 前の世代の「保存中」は引き継がない（古いPUTの完了ではもう解除しないため）。
      setIsUpdating(false);
      // 前の夢の版番号・競合表示も引き継がない。
      editVersionRef.current = null;
      setEditConflict(false);
    };
  }, [numericId, authStatus, isLoggedIn]);

  const fetchDreamDetail = useCallback(async () => {
    // どの分岐で抜ける場合も、それ以前に発行したGETの応答は無効にする
    // （例: 取得中にログアウトしたら、遅れて届いた夢を表示しない）。
    const fetchId = ++latestDreamFetchIdRef.current;

    if (!numericId) {
      setDream(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (authStatus === "checking") {
      setIsLoading(true);
      return;
    }

    if (!isLoggedIn) {
      setError("ログインが必要です");
      setDream(null);
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      // apiClient.getに型を指定: 単一のDreamオブジェクトを返すAPI
      const dream = await apiClient.get<Dream>(`/dreams/${numericId}`);
      if (fetchId !== latestDreamFetchIdRef.current) return;
      if (dream?.id !== numericId) {
        // URLと違う夢を表示・編集・削除の対象にしない
        setError("夢の詳細データ取得に失敗しました");
        setDream(null);
        return;
      }
      const loadedVersion = parseEditVersion(dream.edit_version);
      const known = editVersionRef.current;
      // 再取得が版番号を返さなくても、直前の保存（200）で分かった版番号は捨てない
      if (
        loadedVersion !== null ||
        known?.dreamId !== numericId ||
        known.version === null
      ) {
        editVersionRef.current = { dreamId: numericId, version: loadedVersion };
      }
      setDream(dream);
    } catch (error) {
      if (fetchId !== latestDreamFetchIdRef.current) return;
      let message = "夢の詳細データ取得に失敗しました";
      if (error instanceof Error) {
        message = error.message;
      }
      setError(message);
      setDream(null);
    } finally {
      if (fetchId === latestDreamFetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [numericId, authStatus, isLoggedIn]);

  const fetchDreams = useCallback(async () => {
    if (authStatus === "checking") {
      setIsLoading(true);
      return;
    }

    if (!isLoggedIn) {
      setError("ログインが必要です");
      setIsLoading(false);
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      // apiClient.getに型を指定: Dreamの配列を返すAPI
      const dreams = await apiClient.get<Dream[]>(`/dreams`);
      setDreams(dreams);
    } catch (error) {
      let message = "夢のデータを取得できませんでした";
      if (error instanceof Error) {
        message = error.message;
      }
      setError(message);
      setDreams([]);
    } finally {
      setIsLoading(false);
    }
  }, [authStatus, isLoggedIn]);

  const createDream = async (dreamData: DreamInput): Promise<boolean> => {
    setError(null);
    setIsUpdating(true);
    try {
      await apiClient.post(`/dreams`, { dream: dreamData });
    } catch (err) {
      let message = "夢の作成に失敗しました";
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      return false;
    } finally {
      setIsUpdating(false);
    }
    return true;
  };

  /**
   * 夢を更新し、成功したら最新の夢を再取得する。
   * 完了前に表示コンテキスト（夢ID・認証状態）が変わった・アンマウントした場合は、
   * 再取得・error・loading・isUpdatingのどれも変えずに false を返す
   * （古いPUTの完了で別の夢を上書きしたり、新しい編集を終了させたりしないため）。
   * 同じ表示世代で保存中に呼ばれた場合は、PUTを送らず状態も変えずに false を返す。
   *
   * 読み込んだ夢の edit_version を expected_edit_version として送る（Issue #561）。
   * 別の画面・端末の保存が先に確定していればサーバーが 409 edit_conflict を返すので、
   * dream を差し替えず（入力を消さず）editConflict を立てて false を返す。自動で再送はしない。
   */
  const updateDream = async (dreamData: DreamInput): Promise<boolean> => {
    const targetId = numericId;
    if (!targetId) {
      setError("更新対象の夢のIDがありません。");
      return false;
    }
    if (activeDreamIdRef.current !== targetId) return false;

    const generation = displayGenerationRef.current;
    if (updatingGenerationRef.current === generation) return false;
    updatingGenerationRef.current = generation;
    const isSameDisplay = () => displayGenerationRef.current === generation;

    const baseVersion =
      editVersionRef.current?.dreamId === targetId
        ? editVersionRef.current.version
        : null;
    // 版番号が分からない（#566 より前のバックエンド）ときは送らず、旧クライアントとして保存する
    const payload =
      baseVersion === null
        ? { dream: dreamData }
        : { dream: dreamData, expected_edit_version: baseVersion };

    setError(null);
    setEditConflict(false);
    setIsUpdating(true);
    try {
      const saved = await apiClient.put<Partial<Dream> | null>(
        `/dreams/${targetId}`,
        payload
      );
      if (!isSameDisplay()) return false;
      const savedVersion = parseEditVersion(saved?.edit_version);
      if (savedVersion !== null) {
        editVersionRef.current = { dreamId: targetId, version: savedVersion };
      }
      await fetchDreamDetail();
      if (!isSameDisplay()) return false;
    } catch (err) {
      if (!isSameDisplay()) return false;
      if (isEditConflictError(err)) {
        setEditConflict(true);
        return false;
      }
      let message = "夢の更新に失敗しました";
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      return false;
    } finally {
      if (updatingGenerationRef.current === generation) {
        updatingGenerationRef.current = null;
      }
      if (isSameDisplay()) {
        setIsUpdating(false);
      }
    }
    return true;
  };

  /**
   * 夢を削除する。詳細画面（idあり）では、削除対象・URLの夢ID・表示中の夢データIDが
   * すべて一致するときだけ DELETE を送る。完了前に表示コンテキストが変わった場合は
   * false を返す（古い削除の成功で、別の夢の画面を /home へ遷移させないため）。
   */
  const deleteDream = async (deleteId: number): Promise<boolean> => {
    if (
      id !== undefined &&
      !(
        deleteId === numericId &&
        activeDreamIdRef.current === deleteId &&
        dream?.id === deleteId
      )
    ) {
      return false;
    }

    const generation = displayGenerationRef.current;
    const isSameDisplay = () => displayGenerationRef.current === generation;

    setError(null);
    try {
      await apiClient.delete(`/dreams/${deleteId}`);
      if (!isSameDisplay()) return false;
      if (numericId !== deleteId) {
        setDreams((prev) => prev.filter((d) => d.id !== deleteId));
      }
    } catch (err) {
      if (!isSameDisplay()) return false;
      let message = "夢の削除に失敗しました";
      if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      return false;
    }
    return true;
  };

  /**
   * 保存の競合のあと、利用者が選んだときだけ最新の夢を読み込み直す。
   * 読み込み中は編集フォームが外れ、新しい dream で作り直されるため、いまの入力は消える。
   */
  const reloadDream = async (): Promise<void> => {
    setEditConflict(false);
    await fetchDreamDetail();
  };

  useEffect(() => {
    // IDなし・不正IDへ変わった場合も呼び、前の夢・読み込み中の状態を初期化する。
    fetchDreamDetail();
  }, [fetchDreamDetail]);

  // IDが変わった直後（新しい夢の取得前）は前の夢がstateに残っている。
  // URLのIDと一致しない夢は返さず、表示・編集・削除の対象にさせない。
  const currentDream = dream && dream.id === numericId ? dream : null;

  return {
    dream: currentDream,
    dreams,
    isLoading: isLoading || (dream !== null && currentDream === null),
    isUpdating,
    error,
    editConflict,
    createDream,
    updateDream,
    deleteDream,
    fetchDreams,
    reloadDream,
  };
};
