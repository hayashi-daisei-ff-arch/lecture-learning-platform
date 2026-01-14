# 📝 問題作成ガイド

このガイドでは、クイズ問題の作成方法を説明します。

## 問題タイプ

### 1. 単一選択 (single)

4つの選択肢から1つを選ぶ問題です。

**スプレッドシート例:**

| 列 | 値 |
|----|-----|
| Type | `single` |
| Question | 人体における電気抵抗が最も高い組織は？ |
| Options | `["皮膚", "筋肉", "血液", "骨"]` |
| Answer | `"皮膚"` |

### 2. 複数選択 (multiple)

複数の正解を選ぶ問題です。

**スプレッドシート例:**

| 列 | 値 |
|----|-----|
| Type | `multiple` |
| Question | 医用工学で使用される生体信号を選べ（複数選択） |
| Options | `["心電図", "脳波", "血圧", "体温"]` |
| Answer | `["心電図", "脳波", "血圧"]` |

### 3. 記述式 (text)

テキストを入力して回答する問題です。

**スプレッドシート例:**

| 列 | 値 |
|----|-----|
| Type | `text` |
| Question | オームの法則で、電圧(V)、電流(I)、抵抗(R)の関係式は？（V=...の形式で） |
| Options | (空欄) |
| Answer | `"V=IR"` |

## 類題機能（暗記防止）

数値をランダム化して、毎回異なる問題を表示します。

**スプレッドシート設定:**

| 列 | 値 |
|----|-----|
| QuestionTemplate | `抵抗値が{{R}}Ωのとき、{{V}}Vの電圧をかけた場合の電流は何Aか？` |
| Variables | `{"R": [10, 20, 50, 100], "V": [5, 10, 12, 24]}` |
| OptionsTemplate | `["{{V/R}}", "{{V*R}}", "{{R/V}}", "{{V+R}}"]` |
| AnswerIndex | `0` |

**動作例:**
- R=20, V=10 が選ばれた場合
- 問題: 「抵抗値が20Ωのとき、10Vの電圧をかけた場合の電流は何Aか？」
- 選択肢: `0.5`, `200`, `2`, `30`
- 正解: `0.5` (インデックス0)

### 使える演算子

- `+` 加算
- `-` 減算
- `*` 乗算
- `/` 除算
- `()` 括弧

例: `{{(V*1000)/R}}` → V=10, R=20 の場合 500

## 画像の使用

### 問題画像

| 列 | 値 |
|----|-----|
| QuestionImage | `https://drive.google.com/uc?id=FILE_ID` |

### 解説画像

| 列 | 値 |
|----|-----|
| ExplanationImage | `https://drive.google.com/uc?id=FILE_ID` |

### Google Driveからの画像URL

1. 画像をDriveにアップロード
2. 共有設定を「リンクを知っている全員」に変更
3. URLの形式を変換:
   - 元: `https://drive.google.com/file/d/FILE_ID/view`
   - 変換後: `https://drive.google.com/uc?id=FILE_ID`

## 不正検知設定

特定の問題で不正検知を有効にします。

| 列 | 値 |
|----|-----|
| FraudDetection | `{"enabled": true, "minAnswerTime": 5, "maxErrorCount": 3}` |

- `minAnswerTime`: 最低回答時間（秒）。これより速いと不正フラグ
- `maxErrorCount`: 最大許容誤答数。これを超えると不正フラグ

## レベル条件設定

レベルの解放条件を設定します。

### 基本的な条件

```json
{
    "type": "all",
    "requirements": [
        {"levelId": "level-1", "minScore": 80}
    ]
}
```

- `type`: `all`（すべて満たす）/ `any`（いずれか満たす）
- `minScore`: 最低正答率（%）

### 隠しレベルの条件

```json
{
    "type": "all",
    "requirements": [
        {"levelId": "level-1", "minScore": 100, "requirePerfect": true, "noSkip": true},
        {"levelId": "level-2", "minScore": 100, "requirePerfect": true, "noSkip": true}
    ]
}
```

- `requirePerfect`: 全問正解が必要
- `noSkip`: スキップなしが必要

## スプレッドシート全列一覧

### Questions シート

| 列名 | 必須 | 説明 |
|-----|-----|------|
| ID | ✓ | 問題の一意ID |
| LevelID | ✓ | 所属レベルID |
| Type | ✓ | single/multiple/text |
| Question | ✓ | 問題文 |
| QuestionImage | | 問題画像URL |
| Options | | 選択肢 (JSON配列) |
| OptionImages | | 選択肢画像 (JSON) |
| Answer | ✓ | 正解 (文字列またはJSON配列) |
| Explanation | | 解説文 |
| ExplanationImage | | 解説画像URL |
| QuestionTemplate | | 類題用テンプレート |
| Variables | | 類題用変数 (JSON) |
| OptionsTemplate | | 類題用選択肢テンプレート |
| AnswerIndex | | 類題用正解インデックス |
| FraudDetection | | 不正検知設定 (JSON) |

### Levels シート

| 列名 | 必須 | 説明 |
|-----|-----|------|
| ID | ✓ | レベルID |
| Title | ✓ | 表示タイトル |
| Icon | | 絵文字アイコン |
| Description | | 説明文 |
| Order | | 表示順序 |
| UnlockConditions | | 解放条件 (JSON) |
| Hidden | | 隠しレベルか (TRUE/FALSE) |
| RevealedTitle | | 解放後の表示タイトル |

## ヒント

1. **問題IDは一意に**: 重複するとデータが上書きされます
2. **JSONは正確に**: 配列 `[]` とオブジェクト `{}` を間違えないように
3. **画像は公開設定**: Driveの共有設定を確認
4. **テスト**: 管理画面でプレビューしてから公開
