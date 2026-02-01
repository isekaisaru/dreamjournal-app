# Supabase Security Notes

## 📋 RLS（Row Level Security）警告について

### **現在の状況（2026年2月2日）**

Supabaseダッシュボードに、以下の6つのRLS警告が表示されています：

1. `public.active_storage_variant_records`
2. `public.active_storage_attachments`
3. `public.active_storage_blobs`
4. `public.dream_emotions`
5. `public.ar_internal_metadata`
6. `public.schema_migrations`

---

## ✅ 対応方針

### **結論：今すぐ致命的な問題はありません（正常運用範囲）**

これらの警告は、「危険度の低い運用・セキュリティ注意リスト」であって、サービス停止・情報漏洩が起きている状態ではありません。

---

## 🔍 各テーブルの分析

### **1. Active Storageテーブル（3つ）**
- `active_storage_blobs`
- `active_storage_attachments`
- `active_storage_variant_records`

**対応**: **今は触らない**

**理由**：
- Rails 8のActive Storageが使用する内部テーブル
- RLSを有効にすると、ファイルアップロード機能が壊れる可能性
- 現在のAPI認証制御で十分

---

### **2. Rails内部管理テーブル（2つ）**
- `ar_internal_metadata`
- `schema_migrations`

**対応**: **無視でOK**

**理由**：
- Railsの内部管理テーブル
- 機密情報は含まれない
- RLSを有効にすると、マイグレーションが失敗する可能性

---

### **3. 中間テーブル（1つ）**
- `dream_emotions`

**対応**: **将来RLS対象候補**

**理由**：
- ユーザーごとのデータ（夢の感情タグ）
- 現在のAPI認証制御で十分
- ユーザー数が増えたら、RLS導入を検討

---

## 🎯 将来的にRLSを検討すべきテーブル

### **対象候補**
- `dreams`
- `emotions`
- `dream_emotions`

### **理由**
- ユーザーごとのデータ
- 「他人の夢を見せない」ため

### **現在の対策**
- **Auth + API制御で十分**
- RLSは「第2防御線」として、将来的に導入を検討

---

## 📝 現在のセキュリティ対策

### **1. Rails API認証**
- Supabase Authを使用したユーザー認証
- JWTトークンによるAPI認証

### **2. Rails側のアクセス制御**
- `current_user`による所有者チェック
- `before_action`による認証チェック

### **3. Supabase RLS（将来的に導入）**
- 第2防御線として、ユーザー数が増えたら導入を検討

---

## 💡 面談での説明テンプレート

### 質問：「Supabaseのセキュリティ対策はどうしていますか？」

**回答例**：
> 「現在は、Rails APIでの認証制御を行っています。Supabase Authを使用したユーザー認証と、JWTトークンによるAPI認証で、ユーザーごとのデータアクセスを制御しています。」
> 
> 「Supabaseダッシュボードには、RLS（Row Level Security）の警告が表示されていますが、これらはRails内部管理テーブルとActive Storage由来のものです。現時点ではAPI認証で制御しており、ユーザーデータ系は将来RLS導入を検討しています。」
> 
> 「RLSは『第2防御線』として位置づけており、ユーザー数が増えた段階で導入する予定です。」

---

## 📊 次のステップ

### **Phase 1: 現在（ユーザー数 0〜10人）**
- **対応**: API認証制御のみ
- **RLS**: 導入しない

### **Phase 2: ユーザー数 10〜100人**
- **対応**: `dreams`テーブルにRLS導入を検討
- **RLS**: ユーザーごとのデータアクセス制御

### **Phase 3: ユーザー数 100人以上**
- **対応**: すべてのユーザーデータテーブルにRLS導入
- **RLS**: 第2防御線として完全に機能

---

**作成日**: 2026年2月2日 04:52  
**作成者**: isekaisaru  
**目的**: Supabase RLS警告の分析と対応方針を明確化
