# Payment Flow Spec

このドキュメントは、寄付決済フローの仕様を固定し、実装ブレと運用事故を防ぐための基準です。

## Scope

- Checkout セッション作成
- Stripe Webhook 受信
- `payments` 保存ルール
- 失敗/返金時のステータス管理

## 1. Authentication Rule (寄付はログイン必須)

- 仕様: 寄付はログイン必須とする。
- 理由: `payments` を必ず `user` に紐づけ、匿名決済による照合不能データを作らないため。
- API ルール:
1. `POST /checkout` は JWT 認証必須。
2. Checkout Session 作成時に `customer`（または `customer_email`）と `metadata.user_id` を必ず付与する。

## 2. User Resolution Rule (user不明時の扱い)

- 仕様: `checkout.session.completed` 受信時に user を特定できない場合、`payments` は保存しない。
- Webhook 応答: 200 OK を返す（Stripe 再送ループを避ける）。
- 記録: warning ログを残す。
- 備考: 将来の調査性向上が必要な場合は別テーブル（例: `unmatched_payments`）を追加する。

## 3. Payment Status Definition

`payments.status` は以下の3値のみを正とする。

- `completed`: 決済が成立し、売上として確定した状態。
- `refunded`: 全額または部分返金が発生した状態。
- `failed`: 決済試行が失敗し、売上不成立の状態。

### State Transition

- `completed -> refunded` は許可。
- `completed -> failed` は許可しない（別イベントとして扱う）。
- `failed -> completed` は別セッション/別 Payment として扱う。

## 4. Stripe Event Mapping (最低限)

| Stripe event | 期待状態 | DB操作 |
| --- | --- | --- |
| `checkout.session.completed` | `completed` | user解決成功時のみ `payments` を upsert |
| `charge.refunded` | `refunded` | 対応する `payments` を `refunded` に更新 |
| `payment_intent.payment_failed` | `failed` | 対応する `payments` があれば `failed` に更新。なければ作成しない |
| その他イベント | 変更なし | 受理して no-op（ログのみ） |

## 5. Idempotency / Duplicate Handling

- `processed_webhook_events.stripe_event_id` の一意制約で同一イベント再処理を防ぐ。
- `payments.stripe_session_id` の一意制約で二重作成を防ぐ。

## 6. Error Handling

- 署名検証失敗/不正JSON: `400 Bad Request`
- `STRIPE_WEBHOOK_SECRET` 未設定: `500 Internal Server Error`
- 処理済みイベント再受信: `200 OK`（スキップ）

## 7. Current Implementation Gap (2026-03-06時点)

現状実装との差分:

- 現状は `POST /checkout` が認証スキップされており、匿名寄付可能。
- 現状の Webhook 保存は `checkout.session.completed` のみ。
- `refunded` / `failed` への更新処理は未実装。

このドキュメントを仕様の正として、実装は順次追従させる。
