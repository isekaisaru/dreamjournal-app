// ブラウザ → Next.jsルートハンドラ（1段目）→ Rails（2段目のサーバー間fetch）という
// 二段プロキシでは、2段目はNode.jsのfetchであり、ブラウザのように自動でOriginヘッダーを
// 付けない。RailsのCSRF対策（ApplicationController#verify_request_origin!、Origin検証）は
// この2段目にもOrigin/Refererを要求するため、1段目でブラウザが実際に送ってきた
// Origin/Refererをそのまま2段目へ転送する必要がある。
//
// 偽装されたOrigin/Refererであってもそのまま転送する（=Rails側で正しく拒否させる）。
// ここで検証や書き換えは行わない — 検証はRails側の責務のまま。
export function forwardedOriginHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  if (origin) headers["Origin"] = origin;
  if (referer) headers["Referer"] = referer;

  return headers;
}
