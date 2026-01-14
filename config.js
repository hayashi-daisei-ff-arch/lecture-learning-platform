/**
 * 講義用学習サイトテンプレート - 設定ファイル
 * 
 * このファイルを編集して、サイトの基本設定を行ってください。
 * 多くの設定はスプレッドシートの Settings シートからも変更可能です。
 */

const CONFIG = {
    // ========================================
    // Google OAuth 設定（必須）
    // ========================================
    // Google Cloud Console で取得した Client ID を設定
    // https://console.cloud.google.com/ → APIとサービス → 認証情報
    GOOGLE_CLIENT_ID: '537299528854-e7n59duh8nma38ep6qvfunsqkave73ut.apps.googleusercontent.com',

    // ========================================
    // Google Apps Script 設定（必須）
    // ========================================
    // GAS をウェブアプリとしてデプロイ後に取得した URL を設定
    SHEETS_API_URL: 'https://script.google.com/macros/s/AKfycbxzuiTAQVig_S3BL3Y5xdFY8a1r_jXPG4ob5msG9n6BtSr9n6Yq0pREIicCCABRRhbt/exec',

    // ========================================
    // アプリケーション情報
    // ========================================
    APP_NAME: '医用工学学習',
    APP_ICON: '🏥',
    APP_DESCRIPTION: '医用工学の基礎を学ぶための学習プラットフォーム',

    // ========================================
    // アクセス制御
    // ========================================
    ACCESS_CONTROL: {
        // Google認証を必須にするか（false=匿名アクセス可、進捗保存なし）
        REQUIRE_AUTH: true,

        // ドメイン制限を有効にするか（false=全ドメイン許可）
        RESTRICT_DOMAIN: true,

        // 許可するメールドメイン（複数指定可能）
        // 例: ['s.takaggakuen.ac.jp', 'takaggakuen.ac.jp']
        ALLOWED_DOMAINS: ['s.takagigakuen.ac.jp'],
    },

    // 管理者メールアドレス（スプレッドシートの Settings シートからも設定可能）
    ADMIN_EMAILS: ['hayashi-daisei-ff@s.takagigakuen.ac.jp'],

    // ========================================
    // UI設定
    // ========================================
    UI_SETTINGS: {
        // 経過時間タイマーを表示
        SHOW_TIMER: true,

        // 進捗バーを表示
        SHOW_PROGRESS_BAR: true,

        // 回答後に自動スクロール
        AUTO_SCROLL: true,

        // ダークモードをデフォルトにする
        DARK_MODE_DEFAULT: true,
    },

    // ========================================
    // クイズ設定
    // ========================================
    QUIZ_SETTINGS: {
        // 問題順をランダム化
        RANDOMIZE_QUESTIONS: true,

        // 選択肢順をランダム化
        RANDOMIZE_OPTIONS: true,

        // スキップボタンを表示
        ALLOW_SKIP: true,

        // 正解時に確認コードを表示
        SHOW_CONFIRMATION_CODE: true,
    },

    // ========================================
    // キャッシュ設定
    // ========================================
    CACHE_SETTINGS: {
        // localStorageで進捗を保存
        ENABLE_PROGRESS_CACHE: true,

        // キャッシュのプレフィックス
        CACHE_PREFIX: 'lecture_quiz_',
    },

    // ========================================
    // 不正検知デフォルト設定
    // ========================================
    FRAUD_DETECTION_DEFAULTS: {
        // 最低回答時間（秒）- これより速い回答は不正フラグ
        MIN_ANSWER_TIME: 3,

        // 最大許容誤答数 - これを超えると不正フラグ
        MAX_ERROR_COUNT: 5,
    },
};

// 設定を固定（変更不可に）
Object.freeze(CONFIG);
Object.freeze(CONFIG.ACCESS_CONTROL);
Object.freeze(CONFIG.UI_SETTINGS);
Object.freeze(CONFIG.QUIZ_SETTINGS);
Object.freeze(CONFIG.CACHE_SETTINGS);
Object.freeze(CONFIG.FRAUD_DETECTION_DEFAULTS);
