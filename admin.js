/**
 * 講義用学習サイトテンプレート - 管理画面
 * 
 * 機能:
 * - サイト設定管理
 * - レベル/テーマ管理
 * - 問題管理
 * - リンク管理
 * - 進捗確認
 */

// ========================================
// 管理画面初期化
// ========================================
function initAdminPanel() {
    switchAdminTab('settings');
}

function switchAdminTab(tabName) {
    // タブボタンの状態更新
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // コンテンツ更新
    const content = document.getElementById('admin-content');

    switch (tabName) {
        case 'settings':
            renderSettingsTab(content);
            break;
        case 'levels':
            renderLevelsTab(content);
            break;
        case 'questions':
            renderQuestionsTab(content);
            break;
        case 'links':
            renderLinksTab(content);
            break;
        case 'progress':
            renderProgressTab(content);
            break;
    }
}

// ========================================
// 設定タブ
// ========================================
function renderSettingsTab(container) {
    const accessControl = CONFIG.ACCESS_CONTROL;

    container.innerHTML = `
        <h3>サイト設定</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-xl);">
            サイトの基本設定を管理します。一部の設定はconfig.jsで直接編集が必要です。
        </p>
        
        <form id="settings-form" onsubmit="saveSettings(event)">
            <div class="form-group">
                <label class="form-label">アプリケーション名</label>
                <input type="text" class="form-input" id="setting-app-name" value="${escapeHtml(CONFIG.APP_NAME)}" readonly>
                <small style="color: var(--color-text-muted);">config.jsで変更してください</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">アプリアイコン</label>
                <input type="text" class="form-input" id="setting-app-icon" value="${CONFIG.APP_ICON}" readonly>
                <small style="color: var(--color-text-muted);">config.jsで変更してください</small>
            </div>
            
            <hr style="border: none; border-top: 1px solid var(--color-border); margin: var(--spacing-xl) 0;">
            
            <h4>アクセス制御</h4>
            
            <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox" id="setting-require-auth" ${accessControl.REQUIRE_AUTH ? 'checked' : ''} disabled>
                    <span>Google認証を必須にする</span>
                </label>
                <small style="color: var(--color-text-muted);">config.jsで変更してください</small>
            </div>
            
            <div class="form-group">
                <label class="form-checkbox">
                    <input type="checkbox" id="setting-restrict-domain" ${accessControl.RESTRICT_DOMAIN ? 'checked' : ''} disabled>
                    <span>ドメイン制限を有効にする</span>
                </label>
                <small style="color: var(--color-text-muted);">config.jsで変更してください</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">許可ドメイン</label>
                <input type="text" class="form-input" id="setting-domains" value="${accessControl.ALLOWED_DOMAINS.join(', ')}" readonly>
                <small style="color: var(--color-text-muted);">config.jsで変更してください</small>
            </div>
            
            <hr style="border: none; border-top: 1px solid var(--color-border); margin: var(--spacing-xl) 0;">
            
            <h4>管理者設定</h4>
            
            <div class="form-group">
                <label class="form-label">管理者メールアドレス（1行に1つ）</label>
                <textarea class="form-textarea" id="setting-admins" rows="4">${(settings.adminEmails || CONFIG.ADMIN_EMAILS).join('\n')}</textarea>
            </div>
            
            <button type="submit" class="btn btn-primary">管理者設定を保存</button>
        </form>
    `;
}

async function saveSettings(event) {
    event.preventDefault();

    const adminEmails = document.getElementById('setting-admins').value
        .split('\n')
        .map(e => e.trim())
        .filter(e => e);

    try {
        const response = await fetch(CONFIG.SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'settings',
                action: 'save',
                data: { adminEmails }
            })
        });

        const result = await response.json();
        if (result.success) {
            settings.adminEmails = adminEmails;
            showToast('設定を保存しました', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error('Settings save error:', e);
        showToast('設定の保存に失敗しました', 'error');
    }
}

// ========================================
// レベル管理タブ
// ========================================
function renderLevelsTab(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl);">
            <h3>レベル管理</h3>
            <button class="btn btn-primary" onclick="showLevelForm()">+ 新規レベル</button>
        </div>
        
        <div id="levels-list">
            ${levels.length === 0 ? `
                <div class="empty-state">
                    <span class="empty-state-icon">📚</span>
                    <p class="empty-state-text">レベルがまだ登録されていません</p>
                </div>
            ` : `
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>順序</th>
                                <th>アイコン</th>
                                <th>タイトル</th>
                                <th>解放条件</th>
                                <th>隠し</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${levels.map(level => `
                                <tr>
                                    <td>${level.order || '-'}</td>
                                    <td>${level.icon || '📚'}</td>
                                    <td>${escapeHtml(level.title)}</td>
                                    <td>${level.unlockConditions ? 'あり' : 'なし'}</td>
                                    <td>${level.hidden ? '✓' : ''}</td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" onclick="editLevel('${level.id}')">編集</button>
                                        <button class="btn btn-sm btn-secondary" onclick="deleteLevel('${level.id}')" style="color: var(--color-error);">削除</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
        
        <div id="level-form-container" style="display: none; margin-top: var(--spacing-xl);">
            <hr style="border: none; border-top: 1px solid var(--color-border); margin-bottom: var(--spacing-xl);">
            <h4 id="level-form-title">新規レベル</h4>
            <form id="level-form" onsubmit="saveLevel(event)">
                <input type="hidden" id="level-id">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                    <div class="form-group">
                        <label class="form-label">レベルID（英数字）</label>
                        <input type="text" class="form-input" id="level-id-input" required pattern="[a-z0-9-]+">
                    </div>
                    <div class="form-group">
                        <label class="form-label">表示順序</label>
                        <input type="number" class="form-input" id="level-order" value="1" min="1">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 80px 1fr; gap: var(--spacing-md);">
                    <div class="form-group">
                        <label class="form-label">アイコン</label>
                        <input type="text" class="form-input" id="level-icon" value="📚" maxlength="4">
                    </div>
                    <div class="form-group">
                        <label class="form-label">タイトル</label>
                        <input type="text" class="form-input" id="level-title" required placeholder="Level 1: 基礎">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">説明</label>
                    <textarea class="form-textarea" id="level-description" rows="2" placeholder="基本的な概念を学びます"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-checkbox">
                        <input type="checkbox" id="level-hidden">
                        <span>隠しレベル（条件を満たすまで非表示）</span>
                    </label>
                </div>
                
                <div class="form-group">
                    <label class="form-label">解放条件（JSON形式、空欄で無条件）</label>
                    <textarea class="form-textarea" id="level-conditions" rows="4" placeholder='{"type": "all", "requirements": [{"levelId": "level-1", "minScore": 80}]}'></textarea>
                    <small style="color: var(--color-text-muted);">
                        条件例: minScore(最低正答率), requirePerfect(100%必須), noSkip(スキップなし必須)
                    </small>
                </div>
                
                <div style="display: flex; gap: var(--spacing-md);">
                    <button type="submit" class="btn btn-primary">保存</button>
                    <button type="button" class="btn btn-secondary" onclick="hideLevelForm()">キャンセル</button>
                </div>
            </form>
        </div>
    `;
}

function showLevelForm(level = null) {
    document.getElementById('level-form-container').style.display = 'block';
    document.getElementById('level-form-title').textContent = level ? 'レベル編集' : '新規レベル';

    if (level) {
        document.getElementById('level-id').value = level.id;
        document.getElementById('level-id-input').value = level.id;
        document.getElementById('level-id-input').readOnly = true;
        document.getElementById('level-order').value = level.order || 1;
        document.getElementById('level-icon').value = level.icon || '📚';
        document.getElementById('level-title').value = level.title || '';
        document.getElementById('level-description').value = level.description || '';
        document.getElementById('level-hidden').checked = level.hidden || false;
        document.getElementById('level-conditions').value = level.unlockConditions ? JSON.stringify(level.unlockConditions, null, 2) : '';
    } else {
        document.getElementById('level-form').reset();
        document.getElementById('level-id').value = '';
        document.getElementById('level-id-input').readOnly = false;
        document.getElementById('level-icon').value = '📚';
    }
}

function hideLevelForm() {
    document.getElementById('level-form-container').style.display = 'none';
}

function editLevel(levelId) {
    const level = levels.find(l => l.id === levelId);
    if (level) {
        showLevelForm(level);
    }
}

async function saveLevel(event) {
    event.preventDefault();

    const levelData = {
        id: document.getElementById('level-id-input').value.trim(),
        order: parseInt(document.getElementById('level-order').value) || 1,
        icon: document.getElementById('level-icon').value.trim() || '📚',
        title: document.getElementById('level-title').value.trim(),
        description: document.getElementById('level-description').value.trim(),
        hidden: document.getElementById('level-hidden').checked,
        unlockConditions: null
    };

    const conditionsStr = document.getElementById('level-conditions').value.trim();
    if (conditionsStr) {
        try {
            levelData.unlockConditions = JSON.parse(conditionsStr);
        } catch (e) {
            showToast('解放条件のJSON形式が正しくありません', 'error');
            return;
        }
    }

    try {
        const response = await fetch(CONFIG.SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'levels',
                action: 'save',
                data: levelData
            })
        });

        const result = await response.json();
        if (result.success) {
            // ローカル更新
            const existingIndex = levels.findIndex(l => l.id === levelData.id);
            if (existingIndex >= 0) {
                levels[existingIndex] = levelData;
            } else {
                levels.push(levelData);
            }

            hideLevelForm();
            switchAdminTab('levels');
            showToast('レベルを保存しました', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error('Level save error:', e);
        showToast('レベルの保存に失敗しました', 'error');
    }
}

async function deleteLevel(levelId) {
    if (!confirm(`レベル「${levelId}」を削除しますか？関連する問題も確認してください。`)) {
        return;
    }

    try {
        const response = await fetch(CONFIG.SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'levels',
                action: 'delete',
                levelId
            })
        });

        const result = await response.json();
        if (result.success) {
            levels = levels.filter(l => l.id !== levelId);
            switchAdminTab('levels');
            showToast('レベルを削除しました', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error('Level delete error:', e);
        showToast('レベルの削除に失敗しました', 'error');
    }
}

// ========================================
// 問題管理タブ
// ========================================
function renderQuestionsTab(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl);">
            <h3>問題管理</h3>
            <button class="btn btn-primary" onclick="showQuestionForm()">+ 新規問題</button>
        </div>
        
        <div class="form-group" style="margin-bottom: var(--spacing-lg);">
            <label class="form-label">レベルで絞り込み</label>
            <select class="form-select" id="question-filter-level" onchange="filterQuestions()">
                <option value="">すべて</option>
                ${levels.map(l => `<option value="${l.id}">${escapeHtml(l.title)}</option>`).join('')}
            </select>
        </div>
        
        <div id="questions-list">
            <div class="empty-state">
                <span class="empty-state-icon">📝</span>
                <p class="empty-state-text">問題を読み込み中...</p>
            </div>
        </div>
        
        <div id="question-form-container" style="display: none; margin-top: var(--spacing-xl);">
            <hr style="border: none; border-top: 1px solid var(--color-border); margin-bottom: var(--spacing-xl);">
            <h4 id="question-form-title">新規問題</h4>
            <form id="question-form" onsubmit="saveQuestion(event)">
                <input type="hidden" id="question-id">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                    <div class="form-group">
                        <label class="form-label">レベル</label>
                        <select class="form-select" id="question-level" required>
                            ${levels.map(l => `<option value="${l.id}">${escapeHtml(l.title)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">問題タイプ</label>
                        <select class="form-select" id="question-type" required onchange="updateQuestionFormFields()">
                            <option value="single">単一選択</option>
                            <option value="multiple">複数選択</option>
                            <option value="text">記述式</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">問題文</label>
                    <textarea class="form-textarea" id="question-text" rows="3" required placeholder="問題文を入力してください"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">問題画像URL（任意）</label>
                    <input type="url" class="form-input" id="question-image" placeholder="https://...">
                </div>
                
                <div id="options-section">
                    <div class="form-group">
                        <label class="form-label">選択肢（1行に1つ）</label>
                        <textarea class="form-textarea" id="question-options" rows="4" placeholder="選択肢A
選択肢B
選択肢C
選択肢D"></textarea>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">正解（複数選択の場合は1行に1つ）</label>
                    <textarea class="form-textarea" id="question-answer" rows="2" required placeholder="正解を入力"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">解説（任意）</label>
                    <textarea class="form-textarea" id="question-explanation" rows="2" placeholder="解説文を入力"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">解説画像URL（任意）</label>
                    <input type="url" class="form-input" id="question-explanation-image" placeholder="https://...">
                </div>
                
                <hr style="border: none; border-top: 1px solid var(--color-border); margin: var(--spacing-xl) 0;">
                
                <h5>不正検知設定</h5>
                
                <div class="form-group">
                    <label class="form-checkbox">
                        <input type="checkbox" id="question-fraud-enabled" onchange="toggleFraudSettings()">
                        <span>この問題で不正検知を有効にする</span>
                    </label>
                </div>
                
                <div id="fraud-settings" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                        <div class="form-group">
                            <label class="form-label">最低回答時間（秒）</label>
                            <input type="number" class="form-input" id="question-min-time" value="3" min="1">
                        </div>
                        <div class="form-group">
                            <label class="form-label">最大許容誤答数</label>
                            <input type="number" class="form-input" id="question-max-errors" value="5" min="1">
                        </div>
                    </div>
                </div>
                
                <div style="display: flex; gap: var(--spacing-md); margin-top: var(--spacing-lg);">
                    <button type="submit" class="btn btn-primary">保存</button>
                    <button type="button" class="btn btn-secondary" onclick="hideQuestionForm()">キャンセル</button>
                </div>
            </form>
        </div>
    `;

    loadAllQuestionsForAdmin();
}

async function loadAllQuestionsForAdmin() {
    try {
        const response = await fetch(`${CONFIG.SHEETS_API_URL}?type=questions&all=true`);
        const data = await response.json();
        if (data.success) {
            // 問題をグローバルに保存
            for (const [levelId, qs] of Object.entries(data.questions || {})) {
                questions[levelId] = qs;
            }
        }
    } catch (e) {
        console.log('Questions load error:', e);
    }

    filterQuestions();
}

function filterQuestions() {
    const filterLevel = document.getElementById('question-filter-level')?.value || '';
    const container = document.getElementById('questions-list');

    let allQuestions = [];
    for (const [levelId, qs] of Object.entries(questions)) {
        if (!filterLevel || levelId === filterLevel) {
            allQuestions = allQuestions.concat(qs.map(q => ({ ...q, levelId })));
        }
    }

    if (allQuestions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">📝</span>
                <p class="empty-state-text">問題がまだ登録されていません</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-container">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>レベル</th>
                        <th>タイプ</th>
                        <th>問題文</th>
                        <th>不正検知</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${allQuestions.map(q => `
                        <tr>
                            <td style="font-size: var(--font-size-sm); color: var(--color-text-muted);">${q.id || '-'}</td>
                            <td>${q.levelId}</td>
                            <td>${getQuestionTypeName(q.type)}</td>
                            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(q.question)}</td>
                            <td>${q.fraudDetection?.enabled ? '✓' : ''}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick='editQuestion(${JSON.stringify(q).replace(/'/g, "\\'")})'>編集</button>
                                <button class="btn btn-sm btn-secondary" onclick="deleteQuestion('${q.id}', '${q.levelId}')" style="color: var(--color-error);">削除</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function showQuestionForm(question = null) {
    document.getElementById('question-form-container').style.display = 'block';
    document.getElementById('question-form-title').textContent = question ? '問題編集' : '新規問題';

    if (question) {
        document.getElementById('question-id').value = question.id;
        document.getElementById('question-level').value = question.levelId || question.course;
        document.getElementById('question-type').value = question.type;
        document.getElementById('question-text').value = question.question || '';
        document.getElementById('question-image').value = question.questionImage || '';
        document.getElementById('question-options').value = (question.options || []).join('\n');
        document.getElementById('question-answer').value = Array.isArray(question.answer) ? question.answer.join('\n') : (question.answer || '');
        document.getElementById('question-explanation').value = question.explanation || '';
        document.getElementById('question-explanation-image').value = question.explanationImage || '';

        const fraud = question.fraudDetection || {};
        document.getElementById('question-fraud-enabled').checked = fraud.enabled || false;
        document.getElementById('question-min-time').value = fraud.minAnswerTime || 3;
        document.getElementById('question-max-errors').value = fraud.maxErrorCount || 5;
    } else {
        document.getElementById('question-form').reset();
        document.getElementById('question-id').value = '';
    }

    updateQuestionFormFields();
    toggleFraudSettings();
}

function hideQuestionForm() {
    document.getElementById('question-form-container').style.display = 'none';
}

function editQuestion(question) {
    showQuestionForm(question);
}

function updateQuestionFormFields() {
    const type = document.getElementById('question-type').value;
    const optionsSection = document.getElementById('options-section');
    optionsSection.style.display = type === 'text' ? 'none' : 'block';
}

function toggleFraudSettings() {
    const enabled = document.getElementById('question-fraud-enabled').checked;
    document.getElementById('fraud-settings').style.display = enabled ? 'block' : 'none';
}

async function saveQuestion(event) {
    event.preventDefault();

    const type = document.getElementById('question-type').value;
    const optionsText = document.getElementById('question-options').value.trim();
    const answerText = document.getElementById('question-answer').value.trim();

    const questionData = {
        id: document.getElementById('question-id').value || `q-${Date.now()}`,
        levelId: document.getElementById('question-level').value,
        type,
        question: document.getElementById('question-text').value.trim(),
        questionImage: document.getElementById('question-image').value.trim() || null,
        options: type !== 'text' ? optionsText.split('\n').filter(o => o.trim()) : [],
        answer: type === 'multiple' ? answerText.split('\n').filter(a => a.trim()) : answerText,
        explanation: document.getElementById('question-explanation').value.trim() || null,
        explanationImage: document.getElementById('question-explanation-image').value.trim() || null,
        fraudDetection: null
    };

    if (document.getElementById('question-fraud-enabled').checked) {
        questionData.fraudDetection = {
            enabled: true,
            minAnswerTime: parseInt(document.getElementById('question-min-time').value) || 3,
            maxErrorCount: parseInt(document.getElementById('question-max-errors').value) || 5
        };
    }

    try {
        const response = await fetch(CONFIG.SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'questions',
                action: 'save',
                data: questionData
            })
        });

        const result = await response.json();
        if (result.success) {
            // ローカル更新
            if (!questions[questionData.levelId]) {
                questions[questionData.levelId] = [];
            }
            const existingIndex = questions[questionData.levelId].findIndex(q => q.id === questionData.id);
            if (existingIndex >= 0) {
                questions[questionData.levelId][existingIndex] = questionData;
            } else {
                questions[questionData.levelId].push(questionData);
            }

            hideQuestionForm();
            filterQuestions();
            showToast('問題を保存しました', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error('Question save error:', e);
        showToast('問題の保存に失敗しました', 'error');
    }
}

async function deleteQuestion(questionId, levelId) {
    if (!confirm('この問題を削除しますか？')) {
        return;
    }

    try {
        const response = await fetch(CONFIG.SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'questions',
                action: 'delete',
                questionId,
                levelId
            })
        });

        const result = await response.json();
        if (result.success) {
            if (questions[levelId]) {
                questions[levelId] = questions[levelId].filter(q => q.id !== questionId);
            }
            filterQuestions();
            showToast('問題を削除しました', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error('Question delete error:', e);
        showToast('問題の削除に失敗しました', 'error');
    }
}

// ========================================
// リンク管理タブ
// ========================================
function renderLinksTab(container) {
    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl);">
            <h3>リンク管理</h3>
            <button class="btn btn-primary" onclick="showLinkForm()">+ 新規リンク</button>
        </div>
        
        <div id="links-list">
            ${links.length === 0 ? `
                <div class="empty-state">
                    <span class="empty-state-icon">🔗</span>
                    <p class="empty-state-text">リンクがまだ登録されていません</p>
                </div>
            ` : `
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>アイコン</th>
                                <th>タイトル</th>
                                <th>カテゴリ</th>
                                <th>URL</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${links.map(link => `
                                <tr>
                                    <td>${link.icon || '🔗'}</td>
                                    <td>${escapeHtml(link.title)}</td>
                                    <td>${link.category === 'materials' ? '講義資料' : '外部サイト'}</td>
                                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        <a href="${link.url}" target="_blank">${escapeHtml(link.url)}</a>
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-secondary" onclick='editLink(${JSON.stringify(link).replace(/'/g, "\\'")})'>編集</button>
                                        <button class="btn btn-sm btn-secondary" onclick="deleteLink('${link.id}')" style="color: var(--color-error);">削除</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `}
        </div>
        
        <div id="link-form-container" style="display: none; margin-top: var(--spacing-xl);">
            <hr style="border: none; border-top: 1px solid var(--color-border); margin-bottom: var(--spacing-xl);">
            <h4 id="link-form-title">新規リンク</h4>
            <form id="link-form" onsubmit="saveLink(event)">
                <input type="hidden" id="link-id">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                    <div class="form-group">
                        <label class="form-label">カテゴリ</label>
                        <select class="form-select" id="link-category" required>
                            <option value="materials">講義資料</option>
                            <option value="external">外部サイト</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">タイプ</label>
                        <select class="form-select" id="link-type">
                            <option value="drive">Google Drive</option>
                            <option value="classroom">Google Classroom</option>
                            <option value="external">外部サイト</option>
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 80px 1fr; gap: var(--spacing-md);">
                    <div class="form-group">
                        <label class="form-label">アイコン</label>
                        <input type="text" class="form-input" id="link-icon" value="📄" maxlength="4">
                    </div>
                    <div class="form-group">
                        <label class="form-label">タイトル</label>
                        <input type="text" class="form-input" id="link-title" required placeholder="第1回 講義スライド">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">URL</label>
                    <input type="url" class="form-input" id="link-url" required placeholder="https://...">
                </div>
                
                <div class="form-group">
                    <label class="form-label">ページ番号（Google Driveの場合、任意）</label>
                    <input type="number" class="form-input" id="link-page" min="1" placeholder="5">
                </div>
                
                <div class="form-group">
                    <label class="form-label">説明（任意）</label>
                    <input type="text" class="form-input" id="link-description" placeholder="リンクの説明">
                </div>
                
                <div style="display: flex; gap: var(--spacing-md);">
                    <button type="submit" class="btn btn-primary">保存</button>
                    <button type="button" class="btn btn-secondary" onclick="hideLinkForm()">キャンセル</button>
                </div>
            </form>
        </div>
    `;
}

function showLinkForm(link = null) {
    document.getElementById('link-form-container').style.display = 'block';
    document.getElementById('link-form-title').textContent = link ? 'リンク編集' : '新規リンク';

    if (link) {
        document.getElementById('link-id').value = link.id;
        document.getElementById('link-category').value = link.category || 'materials';
        document.getElementById('link-type').value = link.type || 'external';
        document.getElementById('link-icon').value = link.icon || '📄';
        document.getElementById('link-title').value = link.title || '';
        document.getElementById('link-url').value = link.url || '';
        document.getElementById('link-page').value = link.pageNumber || '';
        document.getElementById('link-description').value = link.description || '';
    } else {
        document.getElementById('link-form').reset();
        document.getElementById('link-id').value = '';
        document.getElementById('link-icon').value = '📄';
    }
}

function hideLinkForm() {
    document.getElementById('link-form-container').style.display = 'none';
}

function editLink(link) {
    showLinkForm(link);
}

async function saveLink(event) {
    event.preventDefault();

    const linkData = {
        id: document.getElementById('link-id').value || `link-${Date.now()}`,
        category: document.getElementById('link-category').value,
        type: document.getElementById('link-type').value,
        icon: document.getElementById('link-icon').value.trim() || '📄',
        title: document.getElementById('link-title').value.trim(),
        url: document.getElementById('link-url').value.trim(),
        pageNumber: parseInt(document.getElementById('link-page').value) || null,
        description: document.getElementById('link-description').value.trim() || null
    };

    try {
        const response = await fetch(CONFIG.SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'links',
                action: 'save',
                data: linkData
            })
        });

        const result = await response.json();
        if (result.success) {
            const existingIndex = links.findIndex(l => l.id === linkData.id);
            if (existingIndex >= 0) {
                links[existingIndex] = linkData;
            } else {
                links.push(linkData);
            }

            hideLinkForm();
            switchAdminTab('links');
            showToast('リンクを保存しました', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error('Link save error:', e);
        showToast('リンクの保存に失敗しました', 'error');
    }
}

async function deleteLink(linkId) {
    if (!confirm('このリンクを削除しますか？')) {
        return;
    }

    try {
        const response = await fetch(CONFIG.SHEETS_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'links',
                action: 'delete',
                linkId
            })
        });

        const result = await response.json();
        if (result.success) {
            links = links.filter(l => l.id !== linkId);
            switchAdminTab('links');
            showToast('リンクを削除しました', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (e) {
        console.error('Link delete error:', e);
        showToast('リンクの削除に失敗しました', 'error');
    }
}

// ========================================
// 進捗確認タブ
// ========================================
function renderProgressTab(container) {
    container.innerHTML = `
        <h3>進捗確認</h3>
        <p style="color: var(--color-text-secondary); margin-bottom: var(--spacing-xl);">
            ユーザーの学習進捗を確認できます。
        </p>
        
        <div id="progress-list">
            <div class="empty-state">
                <span class="empty-state-icon">📊</span>
                <p class="empty-state-text">進捗データを読み込み中...</p>
            </div>
        </div>
    `;

    loadProgressData();
}

async function loadProgressData() {
    const container = document.getElementById('progress-list');

    try {
        const response = await fetch(`${CONFIG.SHEETS_API_URL}?type=allProgress`);
        const data = await response.json();

        if (!data.success || !data.progress || Object.keys(data.progress).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-state-icon">📊</span>
                    <p class="empty-state-text">進捗データがありません</p>
                </div>
            `;
            return;
        }

        // ユーザーごとにグループ化
        const progressByUser = data.progress;

        container.innerHTML = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ユーザー</th>
                            <th>レベル</th>
                            <th>正答率</th>
                            <th>スキップ</th>
                            <th>不正フラグ</th>
                            <th>最終更新</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(progressByUser).flatMap(([email, records]) =>
            records.map(r => `
                                <tr>
                                    <td>${escapeHtml(email)}</td>
                                    <td>${escapeHtml(r.levelId)}</td>
                                    <td>${r.correctRate}%</td>
                                    <td>${r.skipCount}</td>
                                    <td>${r.fraudCount > 0 ? `⚠️ ${r.fraudCount}` : '-'}</td>
                                    <td>${new Date(r.endTime).toLocaleString('ja-JP')}</td>
                                </tr>
                            `)
        ).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (e) {
        console.error('Progress load error:', e);
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-state-icon">⚠️</span>
                <p class="empty-state-text">進捗データの読み込みに失敗しました</p>
            </div>
        `;
    }
}
