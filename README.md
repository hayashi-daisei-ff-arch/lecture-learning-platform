# 📚 講義用学習サイトテンプレート

医用工学等の講義向けインタラクティブ学習プラットフォームです。

## ✨ 機能

- **認証**: Google OAuth 2.0 / 匿名アクセス / ドメイン制限
- **クイズ**: 単一選択・複数選択・記述式 / 画像対応 / ランダム化
- **類題機能**: 数値をランダム化して暗記を防止
- **進捗管理**: localStorage キャッシュ / スプレッドシート保存
- **不正検知**: 回答時間・誤答数によるフラグ
- **条件付きテーマ解放**: 全問正解・スキップなしなど
- **外部リンク**: Google Drive / Classroom / 任意URL

## 📑 ファイル構成

```
lecture-learning-platform/
├── index.html          # メインHTML
├── styles.css          # スタイルシート
├── app.js              # メインアプリケーション
├── admin.js            # 管理画面
├── config.js           # 設定ファイル ← 編集必要
├── gas-code.js         # Google Apps Script用コード
├── README.md           # このファイル
└── QUESTION_GUIDE.md   # 問題作成ガイド
```

## 🚀 セットアップ

### 1. Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. **APIとサービス → 認証情報 → OAuth クライアントID作成**
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みJavaScript生成元:
     - `http://localhost:8080` (ローカルテスト用)
     - `https://YOUR_USERNAME.github.io` (GitHub Pages用)
3. クライアントIDをコピー

### 2. スプレッドシート & GAS設定

1. [Google Sheets](https://sheets.google.com/) で新規スプレッドシート作成
2. **拡張機能 → Apps Script** を開く
3. `gas-code.js` の内容を貼り付け
4. **デプロイ → 新しいデプロイ**
   - 種類: ウェブアプリ
   - 実行ユーザー: 自分
   - アクセスできるユーザー: 全員
5. デプロイ後のURLをコピー

### 3. config.js の設定

```javascript
const CONFIG = {
    GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    SHEETS_API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    
    APP_NAME: '医用工学学習',
    APP_ICON: '🏥',
    
    ACCESS_CONTROL: {
        REQUIRE_AUTH: true,
        RESTRICT_DOMAIN: true,
        ALLOWED_DOMAINS: ['s.takaggakuen.ac.jp'],
    },
    // ...
};
```

### 4. ローカルテスト

```bash
cd lecture-learning-platform
python -m http.server 8080
```

ブラウザで `http://localhost:8080` にアクセス

### 5. GitHub Pages デプロイ

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

リポジトリの **Settings → Pages** で main ブランチを選択

## 📊 スプレッドシート構成

GASが自動的に以下のシートを作成します:

| シート名 | 用途 |
|---------|------|
| Settings | サイト設定（管理者メール等） |
| Levels | レベル/テーマ定義 |
| Questions | 問題データ |
| Links | 外部リンク |
| UserProgress | ユーザー進捗 |

## 🎓 使い方

### 学生向け

1. Googleアカウントでログイン
2. クイズを選択して開始
3. 正解またはスキップで次の問題へ
4. 完了後、結果が保存される

### 管理者向け

1. Settings シートに管理者メールを追加
2. ログイン後、⚙️ボタンで管理画面を開く
3. レベル・問題・リンクを管理

## 🔧 カスタマイズ

### ドメイン制限の変更

```javascript
ACCESS_CONTROL: {
    RESTRICT_DOMAIN: true,  // false で全ドメイン許可
    ALLOWED_DOMAINS: ['example.ac.jp'],
}
```

### 匿名アクセスを許可

```javascript
ACCESS_CONTROL: {
    REQUIRE_AUTH: false,  // 匿名アクセス可能
}
```

### デザイン変更

`styles.css` のCSS変数を編集:

```css
:root {
    --color-primary: #6366f1;  /* メインカラー */
    /* ... */
}
```

## 📝 問題作成

詳細は [QUESTION_GUIDE.md](./QUESTION_GUIDE.md) を参照

## ❓ トラブルシューティング

| 問題 | 解決策 |
|------|--------|
| ログインできない | Cloud ConsoleのOAuth設定を確認 |
| データが保存されない | GASのデプロイ設定を確認 |
| 問題が表示されない | Questionsシートのデータ形式を確認 |

## 📄 ライセンス

MIT License
