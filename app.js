/**
 * 講義用学習サイトテンプレート - メインアプリケーション
 * 
 * 機能:
 * - Google認証/匿名アクセス
 * - クイズ機能（単一選択/複数選択/記述式）
 * - 類題機能（変数ランダム化）
 * - 進捗キャッシュ（localStorage）
 * - 不正検知
 */

// ========================================
// グローバル状態
// ========================================
let currentUser = null;
let isAdmin = false;
let settings = {};
let levels = [];
let questions = {};
let links = [];
let userProgress = {};

// クイズ状態
let currentLevel = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let selectedAnswers = [];
let quizStartTime = null;
let questionStartTime = null;
let timerInterval = null;

// セッション統計
let sessionStats = {
    correctCount: 0,
    skipCount: 0,
    errorCount: 0,
    fraudFlags: [],
    answers: []
};

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

async function initializeApp() {
    // ダークモード設定
    if (CONFIG.UI_SETTINGS.DARK_MODE_DEFAULT) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }

    // UIテキスト更新
    updateUITexts();

    // Google認証設定
    setupGoogleAuth();

    // 設定とデータ読み込み
    await loadSettings();
    await loadLevels();
    await loadLinks();

    // アクセス制御チェック
    checkAccessControl();
}

function updateUITexts() {
    document.getElementById('logo').querySelector('.logo-icon').textContent = CONFIG.APP_ICON;
    document.getElementById('logo').querySelector('.logo-text').textContent = CONFIG.APP_NAME;
    document.getElementById('login-icon').textContent = CONFIG.APP_ICON;
    document.getElementById('login-title').innerHTML = `${CONFIG.APP_NAME}<br>プラットフォーム`;
    document.getElementById('login-description').textContent = CONFIG.APP_DESCRIPTION;
    document.title = CONFIG.APP_NAME;
}

function setupGoogleAuth() {
    const googleOnloadDiv = document.getElementById('g_id_onload');
    if (googleOnloadDiv && CONFIG.GOOGLE_CLIENT_ID !== 'YOUR_CLIENT_ID.apps.googleusercontent.com') {
        googleOnloadDiv.setAttribute('data-client_id', CONFIG.GOOGLE_CLIENT_ID);
    }
}

function checkAccessControl() {
    if (!CONFIG.ACCESS_CONTROL.REQUIRE_AUTH) {
        // 認証不要モード：匿名アクセスボタンを表示
        document.getElementById('anonymous-access-btn').style.display = 'block';
    }
}

// ========================================
// 認証
// ========================================
function handleCredentialResponse(response) {
    const payload = parseJwt(response.credential);

    if (!payload) {
        showToast('認証エラーが発生しました', 'error');
        return;
    }

    const email = payload.email;
    const name = payload.name;

    // ドメインチェック
    if (CONFIG.ACCESS_CONTROL.REQUIRE_AUTH && CONFIG.ACCESS_CONTROL.RESTRICT_DOMAIN) {
        const domain = email.split('@')[1];
        const isAllowedDomain = CONFIG.ACCESS_CONTROL.ALLOWED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
        const isAdmin = settings.adminEmails?.includes(email) || CONFIG.ADMIN_EMAILS.includes(email);

        if (!isAllowedDomain && !isAdmin) {
            showToast(`このドメインではアクセスできません。許可されたドメイン: ${CONFIG.ACCESS_CONTROL.ALLOWED_DOMAINS.join(', ')}`, 'error');
            return;
        }
    }

    // ログイン成功
    currentUser = { email, name, picture: payload.picture };
    isAdmin = settings.adminEmails?.includes(email) || CONFIG.ADMIN_EMAILS.includes(email);

    onLoginSuccess();
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('JWT parse error:', e);
        return null;
    }
}

function startAnonymousAccess() {
    currentUser = { email: 'anonymous', name: 'ゲスト', isAnonymous: true };
    isAdmin = false;
    onLoginSuccess();
}

async function onLoginSuccess() {
    // UI更新
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-info').style.display = 'flex';

    if (isAdmin) {
        document.getElementById('admin-btn').style.display = 'flex';
    }

    // ユーザー進捗読み込み
    if (!currentUser.isAnonymous) {
        await loadUserProgress();
    }

    // ホーム画面に遷移
    showScreen('home-screen');
    renderHomeScreen();
}

function handleLogout() {
    currentUser = null;
    isAdmin = false;
    userProgress = {};

    document.getElementById('user-info').style.display = 'none';
    document.getElementById('admin-btn').style.display = 'none';

    showScreen('login-screen');
    showToast('ログアウトしました', 'success');
}

// ========================================
// データ読み込み
// ========================================
async function loadSettings() {
    try {
        const response = await fetch(`${CONFIG.SHEETS_API_URL}?type=settings`);
        const data = await response.json();
        if (data.success) {
            settings = data.settings || {};
        }
    } catch (e) {
        console.log('Settings load error (using defaults):', e);
        settings = {
            adminEmails: CONFIG.ADMIN_EMAILS
        };
    }
}

async function loadLevels() {
    try {
        const response = await fetch(`${CONFIG.SHEETS_API_URL}?type=levels`);
        const data = await response.json();
        if (data.success) {
            levels = data.levels || [];
        }
    } catch (e) {
        console.log('Levels load error (using demo data):', e);
        // デモ用レベルデータ
        levels = [
            { id: 'level-1', title: 'Level 1: 基礎', icon: '📗', description: '基本的な概念を学びます', order: 1, unlockConditions: null, hidden: false },
            { id: 'level-2', title: 'Level 2: 応用', icon: '📘', description: '応用的な問題に挑戦', order: 2, unlockConditions: { type: 'all', requirements: [{ levelId: 'level-1', minScore: 80 }] }, hidden: false },
            { id: 'level-3', title: 'Level 3: 最終', icon: '📙', description: '総合的な理解度を確認', order: 3, unlockConditions: { type: 'all', requirements: [{ levelId: 'level-2', minScore: 80 }] }, hidden: false },
            { id: 'optional', title: '任意課題', icon: '📓', description: 'チャレンジ問題', order: 4, unlockConditions: null, hidden: false },
        ];
    }
}

async function loadLinks() {
    try {
        const response = await fetch(`${CONFIG.SHEETS_API_URL}?type=links`);
        const data = await response.json();
        if (data.success) {
            links = data.links || [];
        }
    } catch (e) {
        console.log('Links load error (using demo data):', e);
        // デモ用リンクデータ
        links = [
            { id: 'slide-1', type: 'drive', title: '第1回 講義スライド', url: '#', icon: '📄', category: 'materials' },
            { id: 'slide-2', type: 'drive', title: '第2回 講義スライド', url: '#', icon: '📄', category: 'materials' },
            { id: 'external-1', type: 'external', title: '参考サイト', url: '#', icon: '🌐', category: 'external' },
        ];
    }
}

async function loadQuestions(levelId) {
    try {
        const response = await fetch(`${CONFIG.SHEETS_API_URL}?type=questions&levelId=${levelId}`);
        const data = await response.json();
        if (data.success) {
            questions[levelId] = data.questions || [];
        }
    } catch (e) {
        console.log('Questions load error (using demo data):', e);
        // デモ用問題データ
        questions[levelId] = [
            {
                id: 'q1',
                type: 'single',
                question: 'これはサンプル問題です。正しい選択肢を選んでください。',
                options: ['選択肢A', '選択肢B（正解）', '選択肢C', '選択肢D'],
                answer: '選択肢B（正解）',
                explanation: 'Bが正解です。これは解説文です。'
            },
            {
                id: 'q2',
                type: 'multiple',
                question: '複数選択問題です。正しいものをすべて選んでください。',
                options: ['正解1', '不正解1', '正解2', '不正解2'],
                answer: ['正解1', '正解2'],
                explanation: '正解1と正解2が正しい選択肢です。'
            },
            {
                id: 'q3',
                type: 'text',
                question: '「Hello」を入力してください。',
                answer: 'Hello',
                explanation: '正解は「Hello」です。'
            }
        ];
    }
}

async function loadUserProgress() {
    if (currentUser?.isAnonymous) return;

    try {
        const response = await fetch(`${CONFIG.SHEETS_API_URL}?type=progress&email=${encodeURIComponent(currentUser.email)}`);
        const data = await response.json();
        if (data.success) {
            userProgress = data.progress || {};
        }
    } catch (e) {
        console.log('Progress load error:', e);
        // localStorageからキャッシュを復元
        const cached = localStorage.getItem(`${CONFIG.CACHE_SETTINGS.CACHE_PREFIX}progress_${currentUser?.email}`);
        if (cached) {
            try {
                userProgress = JSON.parse(cached);
            } catch (e) { }
        }
    }
}

// ========================================
// ホーム画面レンダリング
// ========================================
function renderHomeScreen() {
    renderMaterialsLinks();
    renderExternalLinks();
    renderLevelsGrid();
}

function renderMaterialsLinks() {
    const container = document.getElementById('materials-links');
    const materialLinks = links.filter(l => l.category === 'materials');

    if (materialLinks.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📚</span><p class="empty-state-text">講義資料がまだ登録されていません</p></div>';
        return;
    }

    container.innerHTML = materialLinks.map(link => `
        <a href="${generateLinkUrl(link)}" target="_blank" class="link-card">
            <span class="link-icon">${link.icon || '📄'}</span>
            <div class="link-content">
                <div class="link-title">${escapeHtml(link.title)}</div>
                ${link.description ? `<div class="link-description">${escapeHtml(link.description)}</div>` : ''}
            </div>
        </a>
    `).join('');
}

function renderExternalLinks() {
    const container = document.getElementById('external-links');
    const externalLinks = links.filter(l => l.category === 'external');

    if (externalLinks.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-state-icon">🔗</span><p class="empty-state-text">外部リンクがまだ登録されていません</p></div>';
        return;
    }

    container.innerHTML = externalLinks.map(link => `
        <a href="${generateLinkUrl(link)}" target="_blank" class="link-card">
            <span class="link-icon">${link.icon || '🔗'}</span>
            <div class="link-content">
                <div class="link-title">${escapeHtml(link.title)}</div>
                ${link.description ? `<div class="link-description">${escapeHtml(link.description)}</div>` : ''}
            </div>
        </a>
    `).join('');
}

function generateLinkUrl(link) {
    let url = link.url;
    if (link.type === 'drive' && link.pageNumber) {
        url += `#page=${link.pageNumber}`;
    }
    return url;
}

function renderLevelsGrid() {
    const container = document.getElementById('levels-grid');

    // レベルをソートして表示
    const sortedLevels = [...levels].sort((a, b) => (a.order || 0) - (b.order || 0));

    container.innerHTML = sortedLevels
        .filter(level => !level.hidden || isLevelUnlocked(level))
        .map(level => renderLevelCard(level))
        .join('');
}

function renderLevelCard(level) {
    const isLocked = !isLevelUnlocked(level);
    const progress = getBestProgress(level.id);
    const hasProgress = progress !== null;

    return `
        <div class="level-card ${isLocked ? 'level-locked' : ''}" onclick="${isLocked ? '' : `startLevel('${level.id}')`}">
            <div class="level-header">
                <div class="level-title">
                    <span class="level-icon">${isLocked ? '🔒' : level.icon || '📚'}</span>
                    <span>${escapeHtml(level.hidden && !isLevelUnlocked(level) ? '???' : level.title)}</span>
                </div>
                <div class="level-status">
                    ${hasProgress && progress.fraudCount > 0 ? '<span class="fraud-warning" title="不正の疑いがあります">⚠️</span>' : ''}
                    ${hasProgress && progress.correctRate >= 100 && progress.skipCount === 0 ? '<span class="level-badge complete">完了</span>' : ''}
                    ${isLocked ? '<span class="level-badge locked">ロック中</span>' : ''}
                </div>
            </div>
            ${hasProgress ? `
                <div class="level-progress">
                    <div class="level-progress-bar">
                        <div class="level-progress-fill" style="width: ${progress.correctRate}%"></div>
                    </div>
                </div>
                <div class="level-stats">
                    <span class="level-stat">✅ 正答率: ${progress.correctRate}%</span>
                    <span class="level-stat">⏭️ スキップ: ${progress.skipCount}</span>
                </div>
            ` : `
                <div class="level-stats">
                    <span class="level-stat" style="color: var(--color-text-muted)">未挑戦</span>
                </div>
            `}
        </div>
    `;
}

function isLevelUnlocked(level) {
    if (!level.unlockConditions) return true;

    const conditions = level.unlockConditions;
    const requirements = conditions.requirements || [];

    if (requirements.length === 0) return true;

    const checkRequirement = (req) => {
        const progress = getBestProgress(req.levelId);
        if (!progress) return false;

        if (req.minScore && progress.correctRate < req.minScore) return false;
        if (req.requirePerfect && progress.correctRate < 100) return false;
        if (req.noSkip && progress.skipCount > 0) return false;

        return true;
    };

    if (conditions.type === 'all') {
        return requirements.every(checkRequirement);
    } else {
        return requirements.some(checkRequirement);
    }
}

function getBestProgress(levelId) {
    const records = userProgress[levelId];
    if (!records || records.length === 0) return null;

    // ベスト記録を選択するアルゴリズム
    return records
        .filter(r => r.correctRate === Math.max(...records.map(x => x.correctRate)))
        .filter((r, i, arr) => r.skipCount === Math.min(...arr.map(x => x.skipCount)))
        .filter((r, i, arr) => r.fraudCount === Math.min(...arr.map(x => x.fraudCount)))
        .sort((a, b) => b.startTime - a.startTime)[0] || null;
}

// ========================================
// クイズ機能
// ========================================
async function startLevel(levelId) {
    currentLevel = levels.find(l => l.id === levelId);
    if (!currentLevel) {
        showToast('レベルが見つかりません', 'error');
        return;
    }

    // 問題を読み込み
    if (!questions[levelId]) {
        await loadQuestions(levelId);
    }

    // キャッシュ確認
    const cacheKey = `${CONFIG.CACHE_SETTINGS.CACHE_PREFIX}quiz_${levelId}_${currentUser?.email || 'anon'}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached && CONFIG.CACHE_SETTINGS.ENABLE_PROGRESS_CACHE) {
        try {
            const cachedData = JSON.parse(cached);
            if (cachedData.answers && cachedData.answers.length > 0) {
                // キャッシュ復元ダイアログを表示
                window.pendingCacheData = cachedData;
                document.getElementById('cache-modal').style.display = 'flex';
                return;
            }
        } catch (e) { }
    }

    // 新規開始
    startFresh();
}

function startFresh() {
    closeCacheModal();
    window.pendingCacheData = null;
    initializeQuiz();
}

function resumeFromCache() {
    closeCacheModal();
    const cachedData = window.pendingCacheData;
    window.pendingCacheData = null;

    if (cachedData) {
        currentQuestionIndex = cachedData.currentQuestionIndex || 0;
        sessionStats = {
            correctCount: cachedData.correctCount || 0,
            skipCount: cachedData.skipCount || 0,
            errorCount: cachedData.errorCount || 0,
            fraudFlags: cachedData.fraudFlags || [],
            answers: cachedData.answers || []
        };
        quizStartTime = cachedData.startTime || Date.now();

        // 問題を準備（キャッシュ時と同じ順序を復元）
        if (cachedData.questionOrder) {
            const levelQuestions = questions[currentLevel.id] || [];
            currentQuestions = cachedData.questionOrder.map(id => levelQuestions.find(q => q.id === id)).filter(Boolean);
        } else {
            prepareQuestions();
        }

        showScreen('quiz-screen');
        renderQuestion();
        startTimer();
    } else {
        initializeQuiz();
    }
}

function closeCacheModal() {
    document.getElementById('cache-modal').style.display = 'none';
}

function initializeQuiz() {
    currentQuestionIndex = 0;
    sessionStats = {
        correctCount: 0,
        skipCount: 0,
        errorCount: 0,
        fraudFlags: [],
        answers: []
    };
    quizStartTime = Date.now();

    prepareQuestions();
    showScreen('quiz-screen');
    renderQuestion();
    startTimer();
}

function prepareQuestions() {
    let levelQuestions = [...(questions[currentLevel.id] || [])];

    // 問題順ランダム化
    if (CONFIG.QUIZ_SETTINGS.RANDOMIZE_QUESTIONS) {
        levelQuestions = shuffleArray(levelQuestions);
    }

    // 類題処理（変数をランダム化）
    currentQuestions = levelQuestions.map(q => processQuestionVariables(q));
}

function processQuestionVariables(question) {
    // 類題機能: テンプレート変数を処理
    if (!question.questionTemplate && !question.variables) {
        return question;
    }

    const processedQuestion = { ...question };
    const variables = {};

    // 変数の値をランダム選択
    if (question.variables) {
        for (const [key, values] of Object.entries(question.variables)) {
            variables[key] = values[Math.floor(Math.random() * values.length)];
        }
    }

    // 問題文のテンプレート処理
    if (question.questionTemplate) {
        processedQuestion.question = evaluateTemplate(question.questionTemplate, variables);
    }

    // 選択肢のテンプレート処理
    if (question.optionsTemplate) {
        processedQuestion.options = question.optionsTemplate.map(opt => evaluateTemplate(opt, variables));
        // 正解インデックスから正解を設定
        if (typeof question.answerIndex === 'number') {
            processedQuestion.answer = processedQuestion.options[question.answerIndex];
        }
    }

    return processedQuestion;
}

function evaluateTemplate(template, variables) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
        try {
            // 安全な数式評価
            const safeExpr = expr.replace(/[A-Z]+/g, (varName) => {
                return variables[varName] !== undefined ? variables[varName] : varName;
            });
            // eslint-disable-next-line no-eval
            const result = Function('"use strict"; return (' + safeExpr + ')')();
            return typeof result === 'number' ? Math.round(result * 1000) / 1000 : result;
        } catch (e) {
            return variables[expr] !== undefined ? variables[expr] : match;
        }
    });
}

function renderQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        completeQuiz();
        return;
    }

    const question = currentQuestions[currentQuestionIndex];
    questionStartTime = Date.now();
    selectedAnswers = [];

    // 進捗更新
    const progress = ((currentQuestionIndex) / currentQuestions.length) * 100;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = `問題 ${currentQuestionIndex + 1} / ${currentQuestions.length}`;

    // 問題番号とタイプ
    document.getElementById('question-number').textContent = `Q${currentQuestionIndex + 1}`;
    document.getElementById('question-type-badge').textContent = getQuestionTypeName(question.type);

    // 問題文
    document.getElementById('question-text').innerHTML = escapeHtml(question.question);

    // 問題画像
    const questionImageContainer = document.getElementById('question-image');
    if (question.questionImage) {
        document.getElementById('question-img').src = question.questionImage;
        questionImageContainer.style.display = 'block';
    } else {
        questionImageContainer.style.display = 'none';
    }

    // 選択肢または入力欄
    const optionsContainer = document.getElementById('options-container');
    const textInputContainer = document.getElementById('text-input-container');

    if (question.type === 'text') {
        optionsContainer.style.display = 'none';
        textInputContainer.style.display = 'block';
        document.getElementById('text-answer-input').value = '';
        document.getElementById('text-answer-input').focus();
    } else {
        textInputContainer.style.display = 'none';
        optionsContainer.style.display = 'flex';
        renderOptions(question);
    }

    // ボタン状態
    document.getElementById('submit-btn').disabled = true;
    document.getElementById('skip-btn').style.display = CONFIG.QUIZ_SETTINGS.ALLOW_SKIP ? 'inline-flex' : 'none';

    // 結果オーバーレイを非表示
    document.getElementById('result-overlay').style.display = 'none';

    // キャッシュ保存
    saveQuizCache();
}

function renderOptions(question) {
    const container = document.getElementById('options-container');
    let options = [...(question.options || [])];

    // 選択肢ランダム化
    if (CONFIG.QUIZ_SETTINGS.RANDOMIZE_OPTIONS) {
        options = shuffleArray(options);
    }

    const markers = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    container.innerHTML = options.map((option, index) => `
        <button type="button" class="option-btn" data-value="${escapeHtml(option)}" onclick="selectOption(this, '${question.type}')">
            <span class="option-marker">${markers[index] || index + 1}</span>
            <div class="option-content">
                <span class="option-text">${escapeHtml(option)}</span>
                ${question.optionImages && question.optionImages[option] ? `
                    <div class="option-image">
                        <img src="${question.optionImages[option]}" alt="選択肢画像">
                    </div>
                ` : ''}
            </div>
        </button>
    `).join('');
}

function selectOption(button, type) {
    const value = button.dataset.value;

    if (type === 'multiple') {
        // 複数選択
        button.classList.toggle('selected');
        if (button.classList.contains('selected')) {
            selectedAnswers.push(value);
        } else {
            selectedAnswers = selectedAnswers.filter(a => a !== value);
        }
    } else {
        // 単一選択
        document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        selectedAnswers = [value];
    }

    document.getElementById('submit-btn').disabled = selectedAnswers.length === 0;
}

// テキスト入力イベント
document.addEventListener('input', (e) => {
    if (e.target.id === 'text-answer-input') {
        const value = e.target.value.trim();
        selectedAnswers = value ? [value] : [];
        document.getElementById('submit-btn').disabled = !value;
    }
});

// Enterキーで回答
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.id === 'text-answer-input') {
        if (selectedAnswers.length > 0) {
            submitAnswer();
        }
    }
});

function submitAnswer() {
    const question = currentQuestions[currentQuestionIndex];
    const answerTime = (Date.now() - questionStartTime) / 1000;

    // 正解判定
    let isCorrect = false;

    if (question.type === 'multiple') {
        const correctAnswers = Array.isArray(question.answer) ? question.answer : [question.answer];
        isCorrect = selectedAnswers.length === correctAnswers.length &&
            selectedAnswers.every(a => correctAnswers.includes(a));
    } else if (question.type === 'text') {
        const correctAnswer = String(question.answer).toLowerCase().trim();
        const userAnswer = String(selectedAnswers[0] || '').toLowerCase().trim();
        isCorrect = correctAnswer === userAnswer;
    } else {
        isCorrect = selectedAnswers[0] === question.answer;
    }

    // 不正検知
    let fraudFlag = null;
    if (question.fraudDetection?.enabled) {
        const minTime = question.fraudDetection.minAnswerTime || CONFIG.FRAUD_DETECTION_DEFAULTS.MIN_ANSWER_TIME;
        if (answerTime < minTime) {
            fraudFlag = { type: 'fast_answer', time: answerTime, minTime };
        }
    }

    // 統計更新
    if (isCorrect) {
        sessionStats.correctCount++;
    } else {
        sessionStats.errorCount++;

        // 誤答数不正検知
        if (question.fraudDetection?.enabled) {
            const maxErrors = question.fraudDetection.maxErrorCount || CONFIG.FRAUD_DETECTION_DEFAULTS.MAX_ERROR_COUNT;
            const questionErrors = sessionStats.answers.filter(a => a.questionId === question.id && !a.correct).length + 1;
            if (questionErrors > maxErrors) {
                fraudFlag = { type: 'too_many_errors', errors: questionErrors, maxErrors };
            }
        }
    }

    if (fraudFlag) {
        sessionStats.fraudFlags.push({ ...fraudFlag, questionId: question.id });
    }

    sessionStats.answers.push({
        questionId: question.id,
        answer: selectedAnswers,
        correct: isCorrect,
        time: answerTime,
        skipped: false
    });

    // UIフィードバック
    showResult(isCorrect, question);

    // キャッシュ保存
    saveQuizCache();
}

function skipQuestion() {
    const question = currentQuestions[currentQuestionIndex];

    sessionStats.skipCount++;
    sessionStats.answers.push({
        questionId: question.id,
        answer: null,
        correct: false,
        time: (Date.now() - questionStartTime) / 1000,
        skipped: true
    });

    // 次の問題へ
    currentQuestionIndex++;
    renderQuestion();
}

function showResult(isCorrect, question) {
    // 選択肢の正解/不正解表示
    if (question.type !== 'text') {
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
            const value = btn.dataset.value;
            const correctAnswers = Array.isArray(question.answer) ? question.answer : [question.answer];

            if (correctAnswers.includes(value)) {
                btn.classList.add('correct');
            } else if (btn.classList.contains('selected')) {
                btn.classList.add('incorrect');
            }
        });
    }

    // 結果オーバーレイ
    const overlay = document.getElementById('result-overlay');
    document.getElementById('result-icon').textContent = isCorrect ? '✅' : '❌';
    document.getElementById('result-text').textContent = isCorrect ? '正解！' : '不正解...';
    document.getElementById('result-text').style.color = isCorrect ? 'var(--color-success)' : 'var(--color-error)';

    // 解説
    const explanationEl = document.getElementById('result-explanation');
    if (question.explanation) {
        explanationEl.textContent = question.explanation;
        explanationEl.style.display = 'block';
    } else {
        explanationEl.style.display = 'none';
    }

    // 解説画像
    const explanationImageEl = document.getElementById('result-explanation-image');
    if (question.explanationImage) {
        document.getElementById('explanation-img').src = question.explanationImage;
        explanationImageEl.style.display = 'block';
    } else {
        explanationImageEl.style.display = 'none';
    }

    overlay.style.display = 'flex';
}

function nextQuestion() {
    currentQuestionIndex++;
    renderQuestion();
}

function completeQuiz() {
    stopTimer();

    const elapsedTime = Math.floor((Date.now() - quizStartTime) / 1000);
    const correctRate = Math.round((sessionStats.correctCount / currentQuestions.length) * 100);

    // 結果表示
    document.getElementById('complete-accuracy').textContent = `${correctRate}%`;
    document.getElementById('complete-correct').textContent = `${sessionStats.correctCount}/${currentQuestions.length}`;
    document.getElementById('complete-skip').textContent = sessionStats.skipCount;
    document.getElementById('complete-time').textContent = formatTime(elapsedTime);

    showScreen('complete-screen');

    // 結果保存
    saveQuizResult(correctRate, elapsedTime);

    // キャッシュクリア
    clearQuizCache();
}

async function saveQuizResult(correctRate, elapsedTime) {
    if (currentUser?.isAnonymous) return;

    const result = {
        email: currentUser.email,
        levelId: currentLevel.id,
        correctCount: sessionStats.correctCount,
        totalQuestions: currentQuestions.length,
        correctRate,
        skipCount: sessionStats.skipCount,
        errorCount: sessionStats.errorCount,
        fraudCount: sessionStats.fraudFlags.length,
        fraudFlags: sessionStats.fraudFlags,
        perfectWithoutSkip: correctRate === 100 && sessionStats.skipCount === 0,
        elapsedTime,
        startTime: quizStartTime,
        endTime: Date.now()
    };

    // ローカルキャッシュに追加
    if (!userProgress[currentLevel.id]) {
        userProgress[currentLevel.id] = [];
    }
    userProgress[currentLevel.id].push(result);

    // localStorageに保存
    localStorage.setItem(
        `${CONFIG.CACHE_SETTINGS.CACHE_PREFIX}progress_${currentUser.email}`,
        JSON.stringify(userProgress)
    );

    // サーバーに送信
    try {
        await fetch(CONFIG.SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'progress', data: result })
        });
    } catch (e) {
        console.error('Progress save error:', e);
    }
}

function retryQuiz() {
    initializeQuiz();
}

// ========================================
// キャッシュ管理
// ========================================
function saveQuizCache() {
    if (!CONFIG.CACHE_SETTINGS.ENABLE_PROGRESS_CACHE) return;

    const cacheKey = `${CONFIG.CACHE_SETTINGS.CACHE_PREFIX}quiz_${currentLevel?.id}_${currentUser?.email || 'anon'}`;
    const cacheData = {
        currentQuestionIndex,
        correctCount: sessionStats.correctCount,
        skipCount: sessionStats.skipCount,
        errorCount: sessionStats.errorCount,
        fraudFlags: sessionStats.fraudFlags,
        answers: sessionStats.answers,
        startTime: quizStartTime,
        questionOrder: currentQuestions.map(q => q.id)
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
}

function clearQuizCache() {
    const cacheKey = `${CONFIG.CACHE_SETTINGS.CACHE_PREFIX}quiz_${currentLevel?.id}_${currentUser?.email || 'anon'}`;
    localStorage.removeItem(cacheKey);
}

// ========================================
// タイマー
// ========================================
function startTimer() {
    if (!CONFIG.UI_SETTINGS.SHOW_TIMER) {
        document.getElementById('timer-text').style.display = 'none';
        return;
    }

    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
        document.getElementById('timer-text').textContent = formatTime(elapsed);
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ========================================
// 画面遷移
// ========================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    document.getElementById(screenId).style.display = screenId === 'login-screen' ? 'flex' : 'block';
}

function returnToHome() {
    stopTimer();
    showScreen('home-screen');
    renderHomeScreen();
}

// ========================================
// ユーティリティ
// ========================================
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getQuestionTypeName(type) {
    const types = {
        single: '単一選択',
        multiple: '複数選択',
        text: '記述式'
    };
    return types[type] || type;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// 管理画面（admin.jsにも依存）
// ========================================
function showAdminPanel() {
    if (!isAdmin) {
        showToast('管理者権限がありません', 'error');
        return;
    }
    showScreen('admin-screen');
    if (typeof initAdminPanel === 'function') {
        initAdminPanel();
    }
}
