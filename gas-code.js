/**
 * 講義用学習サイトテンプレート - Google Apps Script バックエンド
 * 
 * このスクリプトは以下のシートを使用します：
 * - "Settings": サイト設定
 * - "Levels": レベル/テーマ定義
 * - "Questions": 問題データ
 * - "Links": 外部リンク
 * - "UserProgress": ユーザー進捗
 * - "SessionLog": セッション記録
 * 
 * デプロイ手順:
 * 1. スプレッドシートを開く
 * 2. 拡張機能 → Apps Script
 * 3. このコードを貼り付け
 * 4. デプロイ → 新しいデプロイ
 * 5. 種類: ウェブアプリ
 * 6. 実行ユーザー: 自分
 * 7. アクセスできるユーザー: 全員
 * 8. デプロイ後のURLをconfig.jsに設定
 */

// ========================================
// リクエストハンドラー
// ========================================

// GET リクエスト（データ取得）
function doGet(e) {
    try {
        const type = e.parameter.type;

        switch (type) {
            case 'settings':
                return jsonResponse(loadSettings());
            case 'levels':
                return jsonResponse(loadLevels());
            case 'questions':
                const levelId = e.parameter.levelId;
                const all = e.parameter.all === 'true';
                return jsonResponse(loadQuestions(levelId, all));
            case 'links':
                return jsonResponse(loadLinks());
            case 'progress':
                const email = e.parameter.email;
                return jsonResponse(loadUserProgress(email));
            case 'allProgress':
                return jsonResponse(loadAllProgress());
            default:
                return jsonResponse({ success: false, error: 'Unknown type' });
        }
    } catch (error) {
        Logger.log('Error in doGet: ' + error.toString());
        return jsonResponse({ success: false, error: error.toString() });
    }
}

// POST リクエスト（データ保存）
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const type = data.type;
        const action = data.action;

        switch (type) {
            case 'settings':
                return jsonResponse(saveSettings(data.data));
            case 'levels':
                if (action === 'save') return jsonResponse(saveLevel(data.data));
                if (action === 'delete') return jsonResponse(deleteLevel(data.levelId));
                break;
            case 'questions':
                if (action === 'save') return jsonResponse(saveQuestion(data.data));
                if (action === 'delete') return jsonResponse(deleteQuestion(data.questionId, data.levelId));
                break;
            case 'links':
                if (action === 'save') return jsonResponse(saveLink(data.data));
                if (action === 'delete') return jsonResponse(deleteLink(data.linkId));
                break;
            case 'progress':
                return jsonResponse(saveProgress(data.data));
            default:
                return jsonResponse({ success: false, error: 'Unknown type' });
        }

        return jsonResponse({ success: false, error: 'Unknown action' });
    } catch (error) {
        Logger.log('Error in doPost: ' + error.toString());
        return jsonResponse({ success: false, error: error.toString() });
    }
}

function jsonResponse(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

// ========================================
// Settings
// ========================================

function loadSettings() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Settings');

    if (!sheet) {
        sheet = ss.insertSheet('Settings');
        sheet.appendRow(['Key', 'Value']);
        sheet.appendRow(['adminEmails', '[]']);
    }

    const data = sheet.getDataRange().getValues();
    const settings = {};

    for (let i = 1; i < data.length; i++) {
        const key = data[i][0];
        const value = data[i][1];

        try {
            settings[key] = JSON.parse(value);
        } catch (e) {
            settings[key] = value;
        }
    }

    return { success: true, settings };
}

function saveSettings(settingsData) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Settings');

    if (!sheet) {
        sheet = ss.insertSheet('Settings');
        sheet.appendRow(['Key', 'Value']);
    }

    // 既存のキーを更新または追加
    const data = sheet.getDataRange().getValues();

    for (const [key, value] of Object.entries(settingsData)) {
        let found = false;
        for (let i = 1; i < data.length; i++) {
            if (data[i][0] === key) {
                sheet.getRange(i + 1, 2).setValue(JSON.stringify(value));
                found = true;
                break;
            }
        }
        if (!found) {
            sheet.appendRow([key, JSON.stringify(value)]);
        }
    }

    return { success: true, message: 'Settings saved' };
}

// ========================================
// Levels
// ========================================

function loadLevels() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Levels');

    if (!sheet) {
        sheet = ss.insertSheet('Levels');
        sheet.appendRow(['ID', 'Title', 'Icon', 'Description', 'Order', 'UnlockConditions', 'Hidden', 'RevealedTitle', 'CreatedAt']);
    }

    const data = sheet.getDataRange().getValues();
    const levels = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        levels.push({
            id: row[0],
            title: row[1],
            icon: row[2] || '📚',
            description: row[3] || '',
            order: row[4] || i,
            unlockConditions: parseJsonSafe(row[5], null),
            hidden: row[6] === true || row[6] === 'TRUE',
            revealedTitle: row[7] || null
        });
    }

    return { success: true, levels };
}

function saveLevel(levelData) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Levels');

    if (!sheet) {
        sheet = ss.insertSheet('Levels');
        sheet.appendRow(['ID', 'Title', 'Icon', 'Description', 'Order', 'UnlockConditions', 'Hidden', 'RevealedTitle', 'CreatedAt']);
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === levelData.id) {
            rowIndex = i + 1;
            break;
        }
    }

    const row = [
        levelData.id,
        levelData.title,
        levelData.icon || '📚',
        levelData.description || '',
        levelData.order || 1,
        levelData.unlockConditions ? JSON.stringify(levelData.unlockConditions) : '',
        levelData.hidden || false,
        levelData.revealedTitle || '',
        new Date()
    ];

    if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    } else {
        sheet.appendRow(row);
    }

    return { success: true, message: 'Level saved' };
}

function deleteLevel(levelId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Levels');

    if (!sheet) return { success: false, error: 'Levels sheet not found' };

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === levelId) {
            sheet.deleteRow(i + 1);
            return { success: true, message: 'Level deleted' };
        }
    }

    return { success: false, error: 'Level not found' };
}

// ========================================
// Questions
// ========================================

function loadQuestions(levelId, all) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Questions');

    if (!sheet) {
        sheet = ss.insertSheet('Questions');
        sheet.appendRow([
            'ID', 'LevelID', 'Type', 'Question', 'QuestionImage',
            'Options', 'OptionImages', 'Answer', 'Explanation', 'ExplanationImage',
            'QuestionTemplate', 'Variables', 'OptionsTemplate', 'AnswerIndex',
            'FraudDetection', 'CreatedAt'
        ]);
    }

    const data = sheet.getDataRange().getValues();
    const questions = {};

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const qLevelId = row[1];
        if (!all && levelId && qLevelId !== levelId) continue;

        if (!questions[qLevelId]) {
            questions[qLevelId] = [];
        }

        questions[qLevelId].push({
            id: row[0],
            levelId: row[1],
            type: row[2] || 'single',
            question: row[3],
            questionImage: row[4] || null,
            options: parseJsonSafe(row[5], []),
            optionImages: parseJsonSafe(row[6], {}),
            answer: parseJsonSafe(row[7], ''),
            explanation: row[8] || null,
            explanationImage: row[9] || null,
            questionTemplate: row[10] || null,
            variables: parseJsonSafe(row[11], null),
            optionsTemplate: parseJsonSafe(row[12], null),
            answerIndex: row[13] !== '' ? parseInt(row[13]) : null,
            fraudDetection: parseJsonSafe(row[14], null)
        });
    }

    return { success: true, questions };
}

function saveQuestion(questionData) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Questions');

    if (!sheet) {
        sheet = ss.insertSheet('Questions');
        sheet.appendRow([
            'ID', 'LevelID', 'Type', 'Question', 'QuestionImage',
            'Options', 'OptionImages', 'Answer', 'Explanation', 'ExplanationImage',
            'QuestionTemplate', 'Variables', 'OptionsTemplate', 'AnswerIndex',
            'FraudDetection', 'CreatedAt'
        ]);
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === questionData.id) {
            rowIndex = i + 1;
            break;
        }
    }

    const row = [
        questionData.id,
        questionData.levelId,
        questionData.type || 'single',
        questionData.question,
        questionData.questionImage || '',
        JSON.stringify(questionData.options || []),
        JSON.stringify(questionData.optionImages || {}),
        JSON.stringify(questionData.answer),
        questionData.explanation || '',
        questionData.explanationImage || '',
        questionData.questionTemplate || '',
        questionData.variables ? JSON.stringify(questionData.variables) : '',
        questionData.optionsTemplate ? JSON.stringify(questionData.optionsTemplate) : '',
        questionData.answerIndex !== null && questionData.answerIndex !== undefined ? questionData.answerIndex : '',
        questionData.fraudDetection ? JSON.stringify(questionData.fraudDetection) : '',
        new Date()
    ];

    if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    } else {
        sheet.appendRow(row);
    }

    return { success: true, message: 'Question saved' };
}

function deleteQuestion(questionId, levelId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Questions');

    if (!sheet) return { success: false, error: 'Questions sheet not found' };

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === questionId) {
            sheet.deleteRow(i + 1);
            return { success: true, message: 'Question deleted' };
        }
    }

    return { success: false, error: 'Question not found' };
}

// ========================================
// Links
// ========================================

function loadLinks() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Links');

    if (!sheet) {
        sheet = ss.insertSheet('Links');
        sheet.appendRow(['ID', 'Category', 'Type', 'Icon', 'Title', 'URL', 'PageNumber', 'Description', 'Order', 'CreatedAt']);
    }

    const data = sheet.getDataRange().getValues();
    const links = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        links.push({
            id: row[0],
            category: row[1] || 'materials',
            type: row[2] || 'external',
            icon: row[3] || '🔗',
            title: row[4],
            url: row[5],
            pageNumber: row[6] || null,
            description: row[7] || null,
            order: row[8] || i
        });
    }

    return { success: true, links };
}

function saveLink(linkData) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Links');

    if (!sheet) {
        sheet = ss.insertSheet('Links');
        sheet.appendRow(['ID', 'Category', 'Type', 'Icon', 'Title', 'URL', 'PageNumber', 'Description', 'Order', 'CreatedAt']);
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === linkData.id) {
            rowIndex = i + 1;
            break;
        }
    }

    const row = [
        linkData.id,
        linkData.category || 'materials',
        linkData.type || 'external',
        linkData.icon || '🔗',
        linkData.title,
        linkData.url,
        linkData.pageNumber || '',
        linkData.description || '',
        linkData.order || 1,
        new Date()
    ];

    if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    } else {
        sheet.appendRow(row);
    }

    return { success: true, message: 'Link saved' };
}

function deleteLink(linkId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Links');

    if (!sheet) return { success: false, error: 'Links sheet not found' };

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (data[i][0] === linkId) {
            sheet.deleteRow(i + 1);
            return { success: true, message: 'Link deleted' };
        }
    }

    return { success: false, error: 'Link not found' };
}

// ========================================
// UserProgress
// ========================================

function loadUserProgress(email) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('UserProgress');

    if (!sheet) {
        sheet = ss.insertSheet('UserProgress');
        sheet.appendRow([
            'Email', 'LevelID', 'CorrectCount', 'TotalQuestions', 'CorrectRate',
            'SkipCount', 'ErrorCount', 'FraudCount', 'FraudFlags', 'PerfectWithoutSkip',
            'ElapsedTime', 'StartTime', 'EndTime'
        ]);
    }

    const data = sheet.getDataRange().getValues();
    const progress = {};

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0] || row[0] !== email) continue;

        const levelId = row[1];
        if (!progress[levelId]) {
            progress[levelId] = [];
        }

        progress[levelId].push({
            email: row[0],
            levelId: row[1],
            correctCount: row[2],
            totalQuestions: row[3],
            correctRate: row[4],
            skipCount: row[5],
            errorCount: row[6],
            fraudCount: row[7],
            fraudFlags: parseJsonSafe(row[8], []),
            perfectWithoutSkip: row[9] === true || row[9] === 'TRUE',
            elapsedTime: row[10],
            startTime: row[11],
            endTime: row[12]
        });
    }

    return { success: true, progress };
}

function loadAllProgress() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('UserProgress');

    if (!sheet) {
        return { success: true, progress: {} };
    }

    const data = sheet.getDataRange().getValues();
    const progress = {};

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue;

        const email = row[0];
        if (!progress[email]) {
            progress[email] = [];
        }

        progress[email].push({
            email: row[0],
            levelId: row[1],
            correctCount: row[2],
            totalQuestions: row[3],
            correctRate: row[4],
            skipCount: row[5],
            errorCount: row[6],
            fraudCount: row[7],
            fraudFlags: parseJsonSafe(row[8], []),
            perfectWithoutSkip: row[9] === true || row[9] === 'TRUE',
            elapsedTime: row[10],
            startTime: row[11],
            endTime: row[12]
        });
    }

    return { success: true, progress };
}

function saveProgress(progressData) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('UserProgress');

    if (!sheet) {
        sheet = ss.insertSheet('UserProgress');
        sheet.appendRow([
            'Email', 'LevelID', 'CorrectCount', 'TotalQuestions', 'CorrectRate',
            'SkipCount', 'ErrorCount', 'FraudCount', 'FraudFlags', 'PerfectWithoutSkip',
            'ElapsedTime', 'StartTime', 'EndTime'
        ]);
    }

    const row = [
        progressData.email,
        progressData.levelId,
        progressData.correctCount,
        progressData.totalQuestions,
        progressData.correctRate,
        progressData.skipCount,
        progressData.errorCount,
        progressData.fraudCount,
        JSON.stringify(progressData.fraudFlags || []),
        progressData.perfectWithoutSkip || false,
        progressData.elapsedTime,
        progressData.startTime,
        progressData.endTime
    ];

    sheet.appendRow(row);

    return { success: true, message: 'Progress saved' };
}

// ========================================
// Utility
// ========================================

function parseJsonSafe(jsonString, defaultValue) {
    if (!jsonString || jsonString === '') return defaultValue;
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        return jsonString || defaultValue;
    }
}
