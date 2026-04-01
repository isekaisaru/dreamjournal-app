# dall-e-3 廃止対応メモ（期限：2026-05-12）

> OpenAI は `dall-e-3` を **2026年5月12日** に廃止予定。
> 現在 `DreamsController#generate_image` で使用中。**4月中の対応を推奨。**

---

## 現状の実装

[backend/app/controllers/dreams_controller.rb](../backend/app/controllers/dreams_controller.rb) の `generate_image` アクション（約180行目）:

```ruby
response = $openai_client.images.generate(
  parameters: {
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard"
  }
)
```

---

## 移行先の選択肢

| モデル | 単価（standard/medium） | 特徴 |
|---|---|---|
| `gpt-image-1` | $0.040/枚 | dall-e-3 同等品質。正式後継 |
| `gpt-image-1-mini` | $0.011/枚 | 低コスト版。品質はやや落ちる |

**推奨：`gpt-image-1-mini`** — 月上限30枚制限を入れたので品質よりコスト優先が合理的。
単価が dall-e-3（$0.040）から $0.011 に下がり、**原価が約73%削減**になる。

---

## 移行時のコード変更

`ruby-openai` gem で `gpt-image-1` を呼ぶ場合、APIパラメータが異なる。

### dall-e-3（現在）

```ruby
$openai_client.images.generate(
  parameters: {
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard"   # "standard" or "hd"
  }
)
image_url = response.dig("data", 0, "url")
```

### gpt-image-1（移行後）

```ruby
$openai_client.images.generate(
  parameters: {
    model: "gpt-image-1",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    quality: "medium"     # "low" / "medium" / "high"
  }
)
image_url = response.dig("data", 0, "url")
# または b64_json 形式で返る場合は:
# image_b64 = response.dig("data", 0, "b64_json")
```

**注意点：**
- `gpt-image-1` はデフォルトで `b64_json`（Base64）形式で返す場合がある
- `url` 形式も取得できるが、OpenAI の一時 URL（約60分で失効）
- 現行の `generated_image_url` カラムへの保存は URL のまま運用継続予定（S3 永続化は5月以降）

### gem バージョン確認

`ruby-openai` gem が `gpt-image-1` に対応しているか確認が必要。

```bash
# Gemfile.lock で現在のバージョン確認
grep openai backend/Gemfile.lock

# 最新版を確認
gem list ruby-openai
```

---

## 実装手順（4月中にやること）

```
[ ] 1. ruby-openai gem のバージョンを確認（gpt-image-1 対応済みか）
[ ] 2. ローカルで model: "gpt-image-1" or "gpt-image-1-mini" に差し替えてテスト
[ ] 3. レスポンス形式（url vs b64_json）を確認してパース方法を調整
[ ] 4. 本番デプロイ
```

**締め切り：2026年5月11日（廃止前日）**

---

## コスト比較（移行後）

月30枚制限 × 1ユーザーの場合：

| モデル | 月コスト/人 | 500円に対する割合 |
|---|---|---|
| dall-e-3（現在） | $1.20（約192円） | 40% |
| gpt-image-1 | $1.20（約192円） | 40% |
| **gpt-image-1-mini（推奨）** | **$0.33（約53円）** | **11%** |

`gpt-image-1-mini` に切り替えると利益率が 60% → 89% に改善。

---

## 参考

- [OpenAI Image Generation Guide](https://platform.openai.com/docs/guides/image-generation)
- [ruby-openai gem](https://github.com/alexrudall/ruby-openai)
