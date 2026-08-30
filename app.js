        // =============================================
        //  Supabase 配置
        // =============================================
        var SUPABASE_URL = 'https://suvinowselchywjhuaig.supabase.co';
        var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1dmlub3dzZWxjaHl3amh1YWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDU4OTYsImV4cCI6MjA5OTQyMTg5Nn0.rC1xV0rhII4Pl5Wtx2T5kouKUWc-6xFYa-78vGnUM-U';
        var sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        var USER_ID = null;
        var USER_NAME = null;
        var manageMode = false;

        // =============================================
        //  用户身份
        // =============================================

        function nameToUUID(name) {
            var hash1 = 5381;
            var hash2 = 1234567;
            for (var i = 0; i < name.length; i++) {
                var c = name.charCodeAt(i);
                hash1 = ((hash1 << 5) + hash1 + c) & 0xffffffff;
                hash2 = ((hash2 << 3) + hash2 + c * 7) & 0xffffffff;
            }
            var h1 = ('00000000' + (hash1 >>> 0).toString(16)).slice(-8);
            var h2 = ('00000000' + (hash2 >>> 0).toString(16)).slice(-8);
            return h1 + '-' + h2.slice(0, 4) + '-' + h2.slice(4, 8) + '-0000-' + (h1 + h2).split('').reverse().join('').slice(0, 12);
        }

        function loadUser() {
            try {
                var raw = localStorage.getItem("vocab_user");
                if (raw) {
                    var d = JSON.parse(raw);
                    USER_NAME = d.name;
                    USER_ID = d.id;
                    return true;
                }
            } catch (e) {}
            return false;
        }

        function saveUser(name) {
            USER_NAME = name;
            USER_ID = nameToUUID(name);
            try {
                localStorage.setItem("vocab_user", JSON.stringify({ name: name, id: USER_ID }));
            } catch (e) {}
        }

        function logoutUser() {
            USER_NAME = null;
            USER_ID = null;
            try {
                localStorage.removeItem("vocab_user");
            } catch (e) {}
        }

        function updateUserBadge() {
            var badge = document.getElementById("userBadge");
            var label = document.getElementById("userNameLabel");
            if (USER_NAME) {
                badge.style.display = "";
                label.textContent = USER_NAME;
            } else {
                badge.style.display = "none";
            }
        }

        function handleUserBadge() {
            var hasProgress = false;
            if (USER_ID) {
                try {
                    var raw = localStorage.getItem(progressKey());
                    hasProgress = !!raw;
                } catch (e) {}
            }

            if (hasProgress) {
                if (!confirm("确定要中断当前学习吗？\n进行中的进度将不会保留。")) {
                    return;
                }
                clearProgress();
            }

            logoutUser();
            showLogin();
        }

        // =============================================
        //  用户列表管理
        // =============================================

        function getAllUsers() {
            var users = [];
            try {
                var raw = localStorage.getItem("vocab_users_list");
                if (raw) users = JSON.parse(raw);
            } catch (e) {}
            return users;
        }

        function addUserToList(name) {
            var users = getAllUsers();
            if (users.indexOf(name) === -1) {
                users.push(name);
                try { localStorage.setItem("vocab_users_list", JSON.stringify(users)); }
                catch (e) {}
            }
        }

        function removeUserFromList(name) {
            var users = getAllUsers();
            var idx = users.indexOf(name);
            if (idx !== -1) {
                users.splice(idx, 1);
                try { localStorage.setItem("vocab_users_list", JSON.stringify(users)); }
                catch (e) {}
            }
        }

        // =============================================
        //  登录界面
        // =============================================

        function showLogin() {
            manageMode = false;
            lastAction = null;
            document.getElementById("progressBar").style.display = "none";
            document.getElementById("subtitle").textContent = "";
            document.getElementById("userBadge").style.display = "none";
            renderLoginCard();
        }

        function renderLoginCard() {
            var users = getAllUsers();
            var lastUser = null;
            try { var raw = localStorage.getItem("vocab_user"); if (raw) lastUser = JSON.parse(raw).name; } catch(e) {}

            var html = '<div class="login-card">';
            html += '  <div class="login-icon">📖</div>';
            html += '  <div class="login-title">VOCAB</div>';
            html += '  <div class="login-desc">输入你的名字，开始背单词<br>每人拥有独立的学习记录</div>';
            html += '  <div style="display:flex;gap:8px;align-items:center;">';
            html += '    <input class="login-input" id="loginName" type="text" maxlength="20"'
                 + ' placeholder="你的名字" style="flex:1;" oninput="validateLogin()" onkeydown="if(event.key===\'Enter\')handleLogin()">';
            html += '    <button class="login-btn" id="loginBtn" disabled onclick="handleLogin()" style="margin-top:0;width:auto;padding:14px 24px;flex-shrink:0;">进入</button>';
            html += '  </div>';

            if (users.length > 0) {
                html += '  <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border-light);">';
                html += '    <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:14px;">选一个名字快速进入</div>';
                html += '    <div class="user-chips' + (manageMode ? ' manage-mode' : '') + '" id="userChips">';
                users.forEach(function (u) {
                    var isLast = (u === lastUser);
                    html += '  <div class="user-chip' + (isLast ? ' is-last' : '') + '" data-name="' + escapeAttr(u) + '">';
                    html += '    <span class="chip-label" onclick="quickLogin(\'' + escapeStr(u) + '\')">' + u + (isLast ? ' · 上次' : '') + '</span>';
                    html += '    <button class="chip-delete" onclick="event.stopPropagation();promptDeleteUser(\'' + escapeStr(u) + '\')">✕</button>';
                    html += '  </div>';
                });
                html += '    </div>';
                html += '    <button class="manage-btn' + (manageMode ? ' active' : '') + '" onclick="toggleManageMode()">';
                html += '      ' + (manageMode ? '完成管理' : '⚙ 管理列表');
                html += '    </button>';
                html += '  </div>';
            }

            html += '</div>';
            document.getElementById("mainArea").innerHTML = html;

            setTimeout(function () {
                var input = document.getElementById("loginName");
                if (input && !manageMode) input.focus();
            }, 100);
        }

        function toggleManageMode() {
            manageMode = !manageMode;
            renderLoginCard();
        }

        function quickLogin(name) {
            if (manageMode) return;
            saveUser(name);
            updateUserBadge();
            enterApp();
        }

        function validateLogin() {
            var name = document.getElementById("loginName").value.trim();
            document.getElementById("loginBtn").disabled = (name.length === 0);
        }

        function handleLogin() {
            var name = document.getElementById("loginName").value.trim();
            if (!name) return;
            saveUser(name);
            addUserToList(name);
            updateUserBadge();
            enterApp();
        }

        // [改动] enterApp: 读本地缓存立即渲染，后台同步云端
        function enterApp() {
            syncFromCloud();
            if (loadProgress()) {
                document.getElementById("progressBar").style.display = "";
                updateStats();
                renderCard();
            } else {
                showSelector();
            }
        }

        // =============================================
        //  删除用户（确认弹窗）
        // =============================================

        function promptDeleteUser(name) {
            var overlay = document.createElement("div");
            overlay.className = "delete-overlay";
            overlay.id = "deleteOverlay";
            overlay.innerHTML =
                '<div class="delete-dialog">'
              + '  <div class="delete-dialog-title">删除「' + name + '」</div>'
              + '  <div class="delete-dialog-subtitle">选择删除方式</div>'
              + '  <div class="delete-option selected" id="optKeep" onclick="selectDeleteOption(\'keep\')">'
              + '    <input type="radio" name="deleteMode" value="keep" checked>'
              + '    <span class="option-dot"></span>'
              + '    <div class="option-text">'
              + '      <div class="option-title">保留学习记录</div>'
              + '      <div class="option-desc">只移除名字，云端数据保留<br>以后用同一名字登录可恢复</div>'
              + '    </div>'
              + '  </div>'
              + '  <div class="delete-option" id="optAll" onclick="selectDeleteOption(\'all\')">'
              + '    <input type="radio" name="deleteMode" value="all">'
              + '    <span class="option-dot"></span>'
              + '    <div class="option-text">'
              + '      <div class="option-title">彻底删除所有数据</div>'
              + '      <div class="option-desc">移除名字，云端历史分数和<br>学习记录全部清除，不可恢复</div>'
              + '    </div>'
              + '  </div>'
              + '  <div class="delete-dialog-actions">'
              + '    <button class="delete-cancel" onclick="closeDeleteDialog()">取消</button>'
              + '    <button class="delete-confirm" onclick="confirmDeleteUser(\'' + escapeStr(name) + '\')">删除</button>'
              + '  </div>'
              + '</div>';
            document.body.appendChild(overlay);
        }

        function selectDeleteOption(mode) {
            var keep = document.getElementById("optKeep");
            var all = document.getElementById("optAll");
            keep.classList.toggle("selected", mode === "keep");
            all.classList.toggle("selected", mode === "all");
            keep.querySelector("input").checked = (mode === "keep");
            all.querySelector("input").checked = (mode === "all");
        }

        function closeDeleteDialog() {
            var el = document.getElementById("deleteOverlay");
            if (el) el.remove();
        }

        // [改动] 彻底删除时同时清理本地缓存
        async function confirmDeleteUser(name) {
            var mode = document.querySelector('input[name="deleteMode"]:checked').value;
            var uid = nameToUUID(name);

            removeUserFromList(name);
            try { localStorage.removeItem("vocab_progress_" + uid); } catch (e) {}

            if (USER_NAME === name) { logoutUser(); }

            if (mode === "all") {
                // 清理本地缓存
                try {
                    localStorage.removeItem("vocab_history_" + uid);
                    localStorage.removeItem("vocab_sessions_" + uid);
                } catch (e) {}
                // 清理云端数据
                try {
                    await sb.from('vocab_history').delete().eq('user_id', uid);
                    await sb.from('vocab_sessions').delete().eq('user_id', uid);
                } catch (e) { console.warn('删除云端数据失败', e); }
            }

            closeDeleteDialog();
            var users = getAllUsers();
            if (users.length === 0) { showLogin(); }
            else { renderLoginCard(); }
        }

        // =============================================
        //  状态变量
        // =============================================

        var bookName = "";
        var unitName = "";
        var allWords = [];
        var remainingWords = [];
        var currentIndex = 0;
        var currentRound = 1;
        var meaningShown = false;
        var currentChoice = null;
        var wordScores = {};
        var en2cnScores = {};
        var cn2enScores = {};
        var wordsLearnedRound = {};
        var currentPhase = "en2cn";
        var autoPlay = false;
        var lastAction = null;

        var sessionConfig = {
            selectedUnits: [],
            wordCount: 20,
            strategy: "random"
        };

        var cachedNoHistUnits = [];
        var redReviewWords = [];

        // =============================================
        //  自动朗读
        // =============================================

        function loadAutoPlayPref() {
            try {
                var v = localStorage.getItem("vocab_autoplay");
                autoPlay = v === "true";
            } catch (e) {}
            updateAutoPlayUI();
        }

        function toggleAutoPlay() {
            autoPlay = !autoPlay;
            try { localStorage.setItem("vocab_autoplay", autoPlay ? "true" : "false"); }
            catch (e) {}
            updateAutoPlayUI();
        }

        function updateAutoPlayUI() {
            var toggle = document.getElementById("autoPlayToggle");
            var icon = document.getElementById("autoPlayIcon");
            var label = document.getElementById("autoPlayLabel");
            if (autoPlay) {
                toggle.classList.add("active");
                icon.textContent = "🔊";
                label.textContent = "朗读";
            } else {
                toggle.classList.remove("active");
                icon.textContent = "🔇";
                label.textContent = "静音";
            }
        }

        // =============================================
        //  [新增] 本地缓存层
        // =============================================

        function cacheLoadHistory() {
            if (!USER_ID) return {};
            try {
                var raw = localStorage.getItem("vocab_history_" + USER_ID);
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return {};
        }

        function cacheSaveHistory(map) {
            if (!USER_ID) return;
            try {
                localStorage.setItem("vocab_history_" + USER_ID, JSON.stringify(map));
            } catch (e) {}
        }

        // [新增] 分相历史：英→中 / 中→英 各自一条时间线，仅供进步卡对比使用
        function cacheLoadPhaseHistory() {
            if (!USER_ID) return {};
            try {
                var raw = localStorage.getItem("vocab_phase_history_" + USER_ID);
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return {};
        }

        function cacheSavePhaseHistory(map) {
            if (!USER_ID) return;
            try { localStorage.setItem("vocab_phase_history_" + USER_ID, JSON.stringify(map)); } catch (e) {}
        }

        function cacheLoadSessions() {
            if (!USER_ID) return [];
            try {
                var raw = localStorage.getItem("vocab_sessions_" + USER_ID);
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return [];
        }

        function cacheSaveSessions(dates) {
            if (!USER_ID) return;
            try {
                localStorage.setItem("vocab_sessions_" + USER_ID, JSON.stringify(dates));
            } catch (e) {}
        }

        function cacheLoadLastSession() {
            if (!USER_ID) return null;
            try {
                var raw = localStorage.getItem("vocab_last_session_" + USER_ID);
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return null;
        }

        function cacheSaveLastSession(obj) {
            if (!USER_ID) return;
            try { localStorage.setItem("vocab_last_session_" + USER_ID, JSON.stringify(obj)); } catch (e) {}
        }

        function mergeHistory(local, cloud) {
            var merged = {};
            var allKeys = {};
            for (var k in local) allKeys[k] = true;
            for (var k in cloud) allKeys[k] = true;
            for (var k in allKeys) {
                var lArr = local[k] || [];
                var cArr = cloud[k] || [];
                merged[k] = lArr.length >= cArr.length ? lArr : cArr;
            }
            return merged;
        }

        function mergeSessions(local, cloud) {
            var merged = {};
            local.forEach(function (d) { merged[d] = true; });
            cloud.forEach(function (d) { merged[d] = true; });
            return Object.keys(merged).sort();
        }

        // =============================================
        //  [改动] 云端操作（仅用于同步）
        // =============================================

        async function cloudFetchHistory() {
            if (!USER_ID) return {};
            try {
                var { data, error } = await sb.from('vocab_history')
                    .select('word, scores')
                    .eq('user_id', USER_ID);
                if (error) { console.warn(error); return {}; }
                var result = {};
                if (data) data.forEach(function (row) {
                    result[row.word] = row.scores || [];
                });
                return result;
            } catch (e) { return {}; }
        }

        async function cloudPushHistory(historyMap) {
            if (!USER_ID) return;
            try {
                var words = Object.keys(historyMap);
                if (words.length === 0) return;

                var { data: existing } = await sb.from('vocab_history')
                    .select('word')
                    .eq('user_id', USER_ID);

                var existingWords = {};
                if (existing) existing.forEach(function (r) { existingWords[r.word] = true; });

                var toInsert = [];
                var toUpdate = [];

                words.forEach(function (w) {
                    if (existingWords[w]) {
                        toUpdate.push({ user_id: USER_ID, word: w, scores: historyMap[w] });
                    } else {
                        toInsert.push({ user_id: USER_ID, word: w, scores: historyMap[w] });
                    }
                });

                // 并行执行所有写入
                var promises = [];
                if (toInsert.length > 0) {
                    promises.push(sb.from('vocab_history').insert(toInsert));
                }
                for (var i = 0; i < toUpdate.length; i++) {
                    promises.push(
                        sb.from('vocab_history')
                            .update({ scores: toUpdate[i].scores })
                            .eq('user_id', USER_ID)
                            .eq('word', toUpdate[i].word)
                    );
                }
                if (promises.length > 0) {
                    await Promise.all(promises);
                }
            } catch (e) { console.warn('同步历史到云端失败', e); }
        }

        async function cloudPushSession() {
            if (!USER_ID) return;
            try {
                await sb.from('vocab_sessions')
                    .insert({ user_id: USER_ID, date: new Date().toISOString().slice(0, 10) });
            } catch (e) { console.warn('推送会话失败', e); }
        }

        async function cloudFetchSessions() {
            if (!USER_ID) return [];
            try {
                var { data } = await sb.from('vocab_sessions')
                    .select('date')
                    .eq('user_id', USER_ID);
                return data ? data.map(function (r) { return r.date; }) : [];
            } catch (e) { return []; }
        }

        // [改动] 批量删除，单次请求
        async function cloudDeleteHistory(words) {
            if (!USER_ID) return;
            try {
                await sb.from('vocab_history')
                    .delete()
                    .eq('user_id', USER_ID)
                    .in('word', words);
            } catch (e) { console.warn('删除失败', e); }
        }

        // [新增] 上次会话快照（用于记分看板进步对比），单用户一行
        async function cloudPushLastSession(obj) {
            if (!USER_ID || !obj) return;
            try {
                await sb.from('vocab_last_session').upsert({
                    user_id: USER_ID,
                    time: obj.time,
                    words: obj.words
                }, { onConflict: 'user_id' });
            } catch (e) { console.warn('推送上次会话失败', e); }
        }

        async function cloudFetchLastSession() {
            if (!USER_ID) return null;
            try {
                var { data, error } = await sb.from('vocab_last_session')
                    .select('time, words').eq('user_id', USER_ID);
                if (error) { console.warn(error); return null; }
                if (data && data.length > 0) return { time: data[0].time, words: data[0].words || [] };
            } catch (e) {}
            return null;
        }

        // =============================================
        //  [新增] 同步逻辑
        // =============================================

        async function syncFromCloud() {
            if (!USER_ID) return;
            try {
                var results = await Promise.all([
                    cloudFetchHistory(),
                    cloudFetchSessions(),
                    cloudFetchLastSession()
                ]);
                var cloudHistory = results[0];
                var cloudSessions = results[1];
                var cloudLast = results[2];

                var localHistory = cacheLoadHistory();
                var localSessions = cacheLoadSessions();

                cacheSaveHistory(mergeHistory(localHistory, cloudHistory));
                cacheSaveSessions(mergeSessions(localSessions, cloudSessions));

                var localLast = cacheLoadLastSession();
                var bestLast = pickLatestLastSession(localLast, cloudLast);
                if (bestLast) cacheSaveLastSession(bestLast);
            } catch (e) { console.warn('从云端同步失败', e); }
        }

        async function syncToCloud() {
            if (!USER_ID) return;
            try {
                var history = cacheLoadHistory();
                await cloudPushHistory(history);
                await cloudPushLastSession(cacheLoadLastSession());
            } catch (e) { console.warn('推送到云端失败', e); }
        }

        function pickLatestLastSession(a, b) {
            if (!a && !b) return null;
            if (!a) return b;
            if (!b) return a;
            return (b.time || 0) > (a.time || 0) ? b : a;
        }

        async function loadLastSession() {
            var local = cacheLoadLastSession();
            var cloud = null;
            try { cloud = await cloudFetchLastSession(); } catch (e) {}
            var best = pickLatestLastSession(local, cloud);
            if (best && (!local || (best.time || 0) > (local.time || 0))) cacheSaveLastSession(best);
            return best;
        }

        function saveLastSession(obj) {
            cacheSaveLastSession(obj);
            cloudPushLastSession(obj);
        }

        // =============================================
        //  [新增] 每用户词书订阅（隐藏 / 显示）
        //  默认显示全部静态词书；用户可“隐藏”不想看的。
        //  隐藏集合存云端 vocab_user_books(user_id, book_name)，跨设备同步。
        // =============================================

        var hiddenBooks = null; // null=未加载; array of hidden book names

        function allStaticBookNames() {
            var arr = [];
            for (var b in wordBank) arr.push(b);
            return arr;
        }

        function effectiveWordBank() {
            if (!hiddenBooks) return wordBank; // 未加载时退化为全部
            var eff = {};
            for (var b in wordBank) {
                if (hiddenBooks.indexOf(b) === -1) eff[b] = wordBank[b];
            }
            return eff;
        }

        function cacheHiddenBooks(arr) {
            if (!USER_ID) return;
            try { localStorage.setItem("vocab_books_" + USER_ID, JSON.stringify(arr)); } catch (e) {}
        }

        async function loadHiddenBooks() {
            if (!USER_ID) { hiddenBooks = []; return; }
            try {
                var raw = localStorage.getItem("vocab_books_" + USER_ID);
                if (raw) { hiddenBooks = JSON.parse(raw); return; }
            } catch (e) {}
            try {
                var res = await sb.from('vocab_user_books').select('book_name').eq('user_id', USER_ID);
                if (!res.error && res.data) {
                    hiddenBooks = res.data.map(function (r) { return r.book_name; });
                    cacheHiddenBooks(hiddenBooks);
                    return;
                }
            } catch (e) { console.warn('读取词书订阅失败', e); }
            hiddenBooks = []; // 云端空 = 全部显示
            cacheHiddenBooks(hiddenBooks);
        }

        async function saveHiddenBooks(arr) {
            hiddenBooks = arr;
            cacheHiddenBooks(arr);
            if (!USER_ID) return;
            try {
                await sb.from('vocab_user_books').delete().eq('user_id', USER_ID);
                if (arr.length > 0) {
                    var rows = arr.map(function (b) { return { user_id: USER_ID, book_name: b }; });
                    await sb.from('vocab_user_books').insert(rows);
                }
            } catch (e) { console.warn('保存词书订阅失败', e); }
        }

        async function toggleBookHidden(book) {
            var arr = (hiddenBooks || []).slice();
            var i = arr.indexOf(book);
            if (i === -1) arr.push(book); else arr.splice(i, 1);
            await saveHiddenBooks(arr);
        }

        function showBookManager() {
            var all = allStaticBookNames();
            var hidden = hiddenBooks || [];
            var html = '<div class="bookmgr-overlay" id="bookMgrOverlay" onclick="if(event.target===this)closeBookManager()">';
            html += '  <div class="bookmgr-dialog">';
            html += '    <div class="bookmgr-title">管理词书</div>';
            html += '    <div class="bookmgr-sub">勾选 = 在学习中显示；取消勾选 = 从你的列表隐藏（不影响别人）</div>';
            html += '    <div class="bookmgr-list">';
            all.forEach(function (b) {
                var cnt = 0;
                for (var u in wordBank[b]) cnt += wordBank[b][u].length;
                var isHidden = hidden.indexOf(b) !== -1;
                html += '  <label class="bookmgr-item">';
                html += '    <input type="checkbox" ' + (isHidden ? '' : 'checked') + ' onchange="onBookMgrToggle(\'' + escapeAttr(b) + '\', this.checked)">';
                html += '    <span class="bookmgr-name">' + b + '</span>';
                html += '    <span class="bookmgr-count">' + cnt + ' 词</span>';
                html += '  </label>';
            });
            html += '    </div>';
            html += '    <div class="bookmgr-actions"><button class="manage-btn active" onclick="closeBookManager()">完成</button></div>';
            html += '  </div>';
            html += '</div>';
            var existing = document.getElementById("bookMgrOverlay");
            if (existing) existing.remove();
            document.body.insertAdjacentHTML('beforeend', html);
        }

        async function onBookMgrToggle(book, checked) {
            var arr = (hiddenBooks || []).slice();
            var i = arr.indexOf(book);
            if (checked) { if (i !== -1) arr.splice(i, 1); }   // 显示
            else { if (i === -1) arr.push(book); }             // 隐藏
            await saveHiddenBooks(arr);
        }

        function closeBookManager() {
            var el = document.getElementById("bookMgrOverlay");
            if (el) el.remove();
            showSelector();
        }

        // =============================================
        //  本地进度存储
        // =============================================

        function progressKey() {
            return USER_ID ? "vocab_progress_" + USER_ID : "vocab_progress";
        }

        function saveProgress() {
            if (!USER_ID) return;
            var data = {
                bookName: bookName, unitName: unitName,
                allWords: allWords, remainingWords: remainingWords,
                currentIndex: currentIndex, currentRound: currentRound,
                wordScores: wordScores, wordsLearnedRound: wordsLearnedRound,
                currentPhase: currentPhase, sessionConfig: sessionConfig
            };
            try { localStorage.setItem(progressKey(), JSON.stringify(data)); }
            catch (e) {}
        }

        function loadProgress() {
            if (!USER_ID) return false;
            try {
                var raw = localStorage.getItem(progressKey());
                if (!raw) return false;
                var d = JSON.parse(raw);
                if (!d.allWords || !d.wordScores) return false;

                bookName = d.bookName || "";
                unitName = d.unitName || "";
                allWords = d.allWords;
                remainingWords = d.remainingWords;
                currentIndex = d.currentIndex || 0;
                currentRound = d.currentRound || 1;
                wordScores = d.wordScores;
                wordsLearnedRound = d.wordsLearnedRound || {};
                currentPhase = d.currentPhase || "en2cn";

                if (d.sessionConfig && d.sessionConfig.selectedUnits) {
                    sessionConfig = d.sessionConfig;
                } else {
                    sessionConfig = {
                        selectedUnits: [{book: bookName, unit: unitName}],
                        wordCount: allWords.length, strategy: "random"
                    };
                }
                return true;
            } catch (e) { return false; }
        }

        function clearProgress() {
            try { localStorage.removeItem(progressKey()); } catch (e) {}
        }

        // =============================================
        //  辅助函数
        // =============================================

        function escapeStr(s) { return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
        function escapeAttr(s) { return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }

        function normalizeForDisplay(text) {
            return text.replace(/…/g, ' ').replace(/\s+/g, ' ').trim();
        }

        // [改动] 去掉 -、…、— 和所有空格，容忍用户少打连接符
        function normalizeForCompare(text) {
            return text.toLowerCase()
                .replace(/…/g, '')
                .replace(/['']/g, "'")
                .replace(/[""]/g, '"')
                .replace(/—/g, '')
                .replace(/-/g, '')
                .replace(/\s+/g, '')
                .trim();
        }

        // 掌握判定（两档）：最近三次（不足三次则看全部）每次答错次数均为 0 → 已掌握
        function isMastered(arr) {
            if (!arr || arr.length === 0) return false;
            var tail = arr.slice(-3);
            for (var i = 0; i < tail.length; i++) {
                if (tail[i] !== 0) return false;
            }
            return true;
        }

        function speakEnglish(text) {
            var cleanText = text.replace(/…/g, ' ').replace(/\s+/g, ' ').trim();
            var audio = new Audio('https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(cleanText) + '&type=2');
            audio.play().catch(function() {});
        }

        // =============================================
        //  选择面板
        // =============================================

        var currentStrategy = "smart";

        function getLevelPrefix(unitName) {
            var m = unitName.match(/^(.*?级)\s/);
            return m ? m[1] : null;
        }

        function sortUnitsByLevel(unitsObj) {
            var keys = Object.keys(unitsObj);
            if (keys.length === 0) return keys;
            var levelOf = {};
            keys.forEach(function (k) { levelOf[k] = getLevelPrefix(k); });
            var distinct = {};
            keys.forEach(function (k) { if (levelOf[k]) distinct[levelOf[k]] = true; });
            var levelNames = Object.keys(distinct);
            if (levelNames.length <= 1) return keys; // 单级书（或无“级”前缀）保持原序
            var levelFirstIdx = {};
            keys.forEach(function (k, i) {
                var lvl = levelOf[k];
                if (lvl && !(lvl in levelFirstIdx)) levelFirstIdx[lvl] = i;
            });
            var sortedLevels = levelNames.sort(function (a, b) {
                return levelFirstIdx[b] - levelFirstIdx[a]; // 后加的级别在最上
            });
            var ordered = [];
            sortedLevels.forEach(function (lvl) {
                keys.forEach(function (k) {
                    if (levelOf[k] === lvl) ordered.push(k);
                });
            });
            return ordered;
        }

        function unitItemHtml(book, unit, units) {
            var cnt = units[unit].length;
            var h = '<label class="unit-item">';
            h += '  <input type="checkbox" class="unit-checkbox"'
               + ' data-book="' + escapeAttr(book) + '"'
               + ' data-unit="' + escapeAttr(unit) + '"'
               + ' onchange="updateSelectedCount()">';
            h += '  <span class="unit-checkmark"></span>';
            h += '  <span class="unit-name">' + unit + '</span>';
            h += '  <span class="unit-count">' + cnt + ' 词</span>';
            h += '</label>';
            return h;
        }

        function groupUnitsByLevel(orderedKeys) {
            var groups = [];
            var index = {};
            orderedKeys.forEach(function (k) {
                var lvl = getLevelPrefix(k) || "";
                if (!(lvl in index)) { index[lvl] = groups.length; groups.push({ level: lvl, units: [] }); }
                groups[index[lvl]].units.push(k);
            });
            return groups;
        }

        function toggleLevel(headerEl) {
            var sec = headerEl.parentElement;
            if (sec && sec.classList.contains("level-section")) sec.classList.toggle("collapsed");
        }

        function toggleLevelAll(book, level, box) {
            var check = box.checked;
            var cbs = document.querySelectorAll('.unit-checkbox[data-book="' + escapeAttr(book) + '"]');
            cbs.forEach(function (cb) {
                var u = cb.getAttribute("data-unit");
                if ((getLevelPrefix(u) || "") === level) cb.checked = check;
            });
            updateSelectedCount();
        }

        async function showSelector() {
            clearProgress();
            lastAction = null;
            document.getElementById("progressBar").style.display = "none";
            document.getElementById("subtitle").textContent = "";
            updateUserBadge();

            await loadHiddenBooks(); // 加载本用户已隐藏的词书

            var html = '<div class="selector-card">';
            html += '<div class="selector-title">选择背诵内容</div>';
            html += '<div class="selector-subbar">';
            html += '  <span class="selector-hint">只显示你选定的词书</span>';
            html += '  <button class="manage-books-btn" onclick="showBookManager()">⚙ 管理词书</button>';
            html += '</div>';

            var wb = effectiveWordBank();
            var hasAnyUnit = false;
            for (var book in wb) {
                var units = wb[book];
                var hasWords = false;
                for (var u in units) {
                    if (units[u].length > 0) { hasWords = true; break; }
                }
                if (!hasWords) continue;

                html += '<div class="book-section collapsed" id="book_' + book + '">';
                html += '<div class="book-header" onclick="toggleBook(\'' + escapeStr(book) + '\')">';
                html += '  <input type="checkbox" class="book-checkbox" title="选择整本词书"'
                     + ' onclick="event.stopPropagation()"'
                     + ' onchange="toggleBookAll(\'' + escapeAttr(book) + '\', this)">';
                html += '  <span class="unit-checkmark" title="选择整本词书"'
                     + ' onclick="event.stopPropagation(); this.previousElementSibling.click();"></span>';
                html += '  <span class="book-name">' + book + '</span>';
                html += '  <span class="book-arrow">▾</span>';
                html += '</div>';
                html += '<div class="book-units">';

                var orderedUnits = sortUnitsByLevel(units);
                var levelGroups = groupUnitsByLevel(orderedUnits);
                if (levelGroups.length > 1) {
                    levelGroups.forEach(function (grp) {
                        var lvl = grp.level;
                        html += '<div class="level-section collapsed">';
                        html += '  <div class="level-header" onclick="toggleLevel(this)">';
                        html += '    <input type="checkbox" class="level-checkbox" data-book="' + escapeAttr(book) + '" data-level="' + escapeAttr(lvl) + '"'
                             + ' title="选择整个级别" onclick="event.stopPropagation()"'
                             + ' onchange="toggleLevelAll(\'' + escapeStr(book) + '\',\'' + escapeStr(lvl) + '\',this)">';
                        html += '    <span class="unit-checkmark" title="选择整个级别"'
                             + ' onclick="event.stopPropagation(); this.previousElementSibling.click();"></span>';
                        html += '    <span class="level-name">' + lvl + '</span>';
                        html += '    <span class="level-arrow">▾</span>';
                        html += '  </div>';
                        html += '  <div class="level-units">';
                        grp.units.forEach(function (unit) {
                            var cnt = units[unit].length;
                            if (cnt === 0) return;
                            hasAnyUnit = true;
                            html += unitItemHtml(book, unit, units);
                        });
                        html += '  </div>';
                        html += '</div>';
                    });
                } else {
                    orderedUnits.forEach(function (unit) {
                        var cnt = units[unit].length;
                        if (cnt === 0) return;
                        hasAnyUnit = true;
                        html += unitItemHtml(book, unit, units);
                    });
                }
                html += '</div></div>';
            }

            if (!hasAnyUnit) {
                html += '<div style="text-align:center;color:var(--text-muted);padding:20px 0;">'
                      + '还没有单词数据</div>';
            }

            html += '<div class="selector-divider"></div>';
            html += '<div class="selector-info">已选 <strong id="selectedCount">0</strong> 词</div>';

            html += '<div class="config-row">';
            html += '  <span class="config-label">每次背诵</span>';
            html += '  <div class="count-stepper">';
            html += '    <button onclick="adjustCount(-5)">−</button>';
            html += '    <div class="count-display" id="countDisplay">20</div>';
            html += '    <button onclick="adjustCount(5)">+</button>';
            html += '  </div>';
            html += '  <button class="btn-all" onclick="setCountAll()">全部</button>';
            html += '</div>';

            html += '<div class="config-row">';
            html += '  <span class="config-label">选词策略</span>';
            html += '  <div class="strategy-btns">';
            html += '    <button class="strat-btn" data-strategy="random"'
                 + ' onclick="setStrategy(\'random\')">随机</button>';
            html += '    <button class="strat-btn active" data-strategy="smart"'
                 + ' onclick="setStrategy(\'smart\')">智能选词</button>';
            html += '  </div>';
            html += '</div>';

            html += '<div style="text-align:center;font-size:0.78rem;color:var(--text-muted);margin:0 0 16px 0;line-height:1.6;">'
                  + '每轮将依次进行 <strong style="color:var(--accent);">英→中</strong> 和 <strong style="color:var(--accent);">中→英</strong> 两个阶段</div>';

            html += '<button class="start-btn" id="startBtn" disabled onclick="startFromSelector()">开始背诵</button>';
            html += '<div style="height:10px;"></div>';
            html += '<button class="start-btn" onclick="showScoreBoard()" style="background:var(--bg-subtle);color:var(--text-muted);border:1px solid var(--border-light);font-size:0.88rem;">📊 记分看板</button>';
            html += '<div style="height:8px;"></div>';
            html += '<button class="start-btn" onclick="showStats()" style="background:var(--bg-subtle);color:var(--text-muted);border:1px solid var(--border-light);font-size:0.88rem;">📈 学习统计</button>';
            html += '<div style="height:8px;"></div>';
            html += '<div style="display:flex;gap:8px;justify-content:center;">';
            html += '<button class="start-btn" onclick="exportData()" style="flex:1;background:var(--bg-subtle);color:var(--text-muted);border:1px solid var(--border-light);font-size:0.82rem;">📥 导出数据</button>';
            html += '<button class="start-btn" onclick="importData()" style="flex:1;background:var(--bg-subtle);color:var(--text-muted);border:1px solid var(--border-light);font-size:0.82rem;">📤 导入数据</button>';
            html += '</div>';
            html += '</div>';

            document.getElementById("mainArea").innerHTML = html;
            currentStrategy = "smart";
        }

        function toggleBook(book) {
            var el = document.getElementById("book_" + book);
            if (el) el.classList.toggle("collapsed");
        }

        function toggleBookAll(book, box) {
            var check = box.checked;
            var cbs = document.querySelectorAll('.unit-checkbox[data-book="' + escapeAttr(book) + '"]');
            cbs.forEach(function (cb) { cb.checked = check; });
            updateSelectedCount();
        }

        // [改动] 读本地缓存
        function updateSelectedCount() {
            var cbs = document.querySelectorAll(".unit-checkbox");
            var total = 0;
            var noHistUnits = [];

            var history = cacheLoadHistory();

            cbs.forEach(function (cb) {
                if (cb.checked) {
                    var b = cb.getAttribute("data-book");
                    var u = cb.getAttribute("data-unit");
                    total += wordBank[b][u].length;
                    var has = false;
                    var words = wordBank[b][u];
                    for (var i = 0; i < words.length; i++) {
                        if (history[words[i].en] && history[words[i].en].length > 0) {
                            has = true; break;
                        }
                    }
                    if (!has) noHistUnits.push(b + " · " + u);
                }
            });

            cachedNoHistUnits = noHistUnits;

            // 同步各词书标题上的“全选”复选框状态
            var bookState = {};
            cbs.forEach(function (cb) {
                var b = cb.getAttribute("data-book");
                if (!bookState[b]) bookState[b] = { total: 0, checked: 0 };
                bookState[b].total++;
                if (cb.checked) bookState[b].checked++;
            });
            for (var b in bookState) {
                var sec = document.getElementById("book_" + b);
                if (!sec) continue;
                var box = sec.querySelector(".book-checkbox");
                if (!box) continue;
                box.checked = (bookState[b].total > 0 && bookState[b].checked === bookState[b].total);
                box.indeterminate = (bookState[b].checked > 0 && bookState[b].checked < bookState[b].total);
            }

            // 同步各级别标题上的“全选”复选框状态
            var levelState = {};
            cbs.forEach(function (cb) {
                var b = cb.getAttribute("data-book");
                var u = cb.getAttribute("data-unit");
                var lvl = getLevelPrefix(u) || "";
                var key = b + "\u0000" + lvl;
                if (!levelState[key]) levelState[key] = { total: 0, checked: 0 };
                levelState[key].total++;
                if (cb.checked) levelState[key].checked++;
            });
            for (var lk in levelState) {
                var parts = lk.split("\u0000");
                var lcb = document.querySelector('.level-checkbox[data-book="' + escapeAttr(parts[0]) + '"][data-level="' + escapeAttr(parts[1]) + '"]');
                if (!lcb) continue;
                lcb.checked = (levelState[lk].total > 0 && levelState[lk].checked === levelState[lk].total);
                lcb.indeterminate = (levelState[lk].checked > 0 && levelState[lk].checked < levelState[lk].total);
            }

            document.getElementById("selectedCount").textContent = total;

            var countEl = document.getElementById("countDisplay");
            var cur = parseInt(countEl.textContent) || 20;
            if (total > 0 && cur > total) countEl.textContent = total;
            if (total === 0) countEl.textContent = 0;

            // 智能选词永不灰掉：无历史单词会与最薄弱单词等权出现，无需禁用
            document.getElementById("startBtn").disabled = (total === 0);
        }

        function adjustCount(delta) {
            var el = document.getElementById("countDisplay");
            var total = parseInt(document.getElementById("selectedCount").textContent) || 0;
            var cur = parseInt(el.textContent) || 0;
            var next;

            if (delta > 0) {
                if (cur < 5) { next = 5; } else { next = cur + 5; }
                if (next > total) next = total;
            } else {
                if (cur <= 5) { next = 1; } else { next = cur - 5; }
            }

            if (next < 1) next = 1;
            el.textContent = next;
        }

        function setCountAll() {
            var total = parseInt(document.getElementById("selectedCount").textContent) || 0;
            if (total > 0) document.getElementById("countDisplay").textContent = total;
        }

        function setStrategy(s) {
            currentStrategy = s;
            document.querySelectorAll(".strat-btn").forEach(function (btn) {
                btn.classList.toggle("active", btn.getAttribute("data-strategy") === s);
            });
        }

        // =============================================
        //  [新增] 导出 / 导入学习数据
        // =============================================

        function exportData() {
            if (!USER_ID) return;
            var data = {
                version: 1,
                exportedAt: new Date().toISOString(),
                userName: (function () {
                    try { var raw = localStorage.getItem("vocab_user"); if (raw) return JSON.parse(raw).name; } catch (e) { }
                    return "";
                })(),
                history: cacheLoadHistory(),
                sessions: cacheLoadSessions()
            };
            var json = JSON.stringify(data, null, 2);
            var blob = new Blob([json], { type: "application/json" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "vocab_" + data.userName + "_" + new Date().toISOString().slice(0, 10) + ".json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function importData() {
            var input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.onchange = function (e) {
                var file = e.target.files[0];
                if (!file) return;
                var reader = new FileReader();
                reader.onload = function (ev) {
                    try {
                        var data = JSON.parse(ev.target.result);
                        if (!data.version || !data.history || !data.sessions) {
                            alert("文件格式不正确，无法导入。");
                            return;
                        }
                        var importUser = data.userName || "未知用户";
                        var currentUser = "";
                        try { var raw = localStorage.getItem("vocab_user"); if (raw) currentUser = JSON.parse(raw).name; } catch (e) { }
                        if (importUser && currentUser && importUser !== currentUser) {
                            if (!confirm("这个数据来自「" + importUser + "」，确定要导入到「" + currentUser + "」的记录中吗？")) return;
                        }
                        var localHistory = cacheLoadHistory();
                        var mergedHistory = mergeHistory(localHistory, data.history);
                        cacheSaveHistory(mergedHistory);
                        var localSessions = cacheLoadSessions();
                        var mergedSessions = mergeSessions(localSessions, data.sessions);
                        cacheSaveSessions(mergedSessions);
                        pushImportedSessions(data.sessions);
                        alert("导入成功！已合并 " + Object.keys(mergedHistory).length + " 个单词的记录和 " + mergedSessions.length + " 天学习记录。");
                        showSelector();
                    } catch (ex) {
                        alert("文件解析失败：" + ex.message);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }

        async function pushImportedSessions(sessions) {
            if (!USER_ID || !sb) return;
            try {
                for (var i = 0; i < sessions.length; i++) {
                    await sb.from("vocab_sessions")
                        .insert({ user_id: USER_ID, date: sessions[i] });
                }
            } catch (e) { }
        }

        // =============================================
        //  选词策略
        // =============================================

        function pickRandom(pool, count) {
            var arr = pool.slice();
            for (var i = arr.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
            }
            return arr.slice(0, count);
        }

        // [改动] 读本地缓存
        // 智能选词：有历史词按真实薄弱度排序；无历史词与"最薄弱词"等权并列。
        // 排序前先 shuffle，避免等权词因稳定排序总抽到同一批，导致覆盖不均。
        function pickWeakest(pool, count) {
            var history = cacheLoadHistory();

            // 1) 先打乱，保证等权词之间随机分布
            var arr = pool.slice();
            for (var i = arr.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
            }

            // 2) 最近一次答错次数最高的词，作为无历史词的等权基准
            var maxScore = 0;
            arr.forEach(function (w) {
                var h = history[w.en];
                if (h && h.length > 0) {
                    var s = h[h.length - 1]; // 最近一次答错次数
                    if (s > maxScore) maxScore = s;
                }
            });
            if (maxScore === 0) maxScore = 1; // 全掌握或无历史时，新词与最薄弱等权

            // 3) 计算每词薄弱分：有历史=最近一次得分；无历史=与最薄弱词等权
            var items = arr.map(function (w) {
                var h = history[w.en];
                var weaknessScore = (h && h.length > 0) ? h[h.length - 1] : maxScore;
                return { word: w, weaknessScore: weaknessScore };
            });

            // 4) 纯按薄弱度降序取前 count
            items.sort(function (a, b) { return b.weaknessScore - a.weaknessScore; });
            return items.slice(0, count).map(function (it) { return it.word; });
        }

        // =============================================
        //  开始学习
        // =============================================

        async function startFromSelector() {
            var cbs = document.querySelectorAll(".unit-checkbox:checked");
            if (cbs.length === 0) return;

            var selectedUnits = [];
            var pool = [];
            cbs.forEach(function (cb) {
                var b = cb.getAttribute("data-book");
                var u = cb.getAttribute("data-unit");
                selectedUnits.push({ book: b, unit: u });
                pool = pool.concat(wordBank[b][u]);
            });

            var count = parseInt(document.getElementById("countDisplay").textContent) || 20;
            count = Math.min(count, pool.length);
            if (count <= 0) return;

            var words;
            if (currentStrategy === "smart") {
                words = pickWeakest(pool, count);
            } else {
                words = pickRandom(pool, count);
            }

            sessionConfig = {
                selectedUnits: selectedUnits,
                wordCount: count,
                strategy: currentStrategy
            };

            startSession(words);
        }

        var wordLocationMap = {};

        function startSession(words) {
            lastAction = null;

            if (sessionConfig.selectedUnits.length === 1) {
                bookName = sessionConfig.selectedUnits[0].book;
                unitName = sessionConfig.selectedUnits[0].unit;
            } else {
                bookName = sessionConfig.selectedUnits.length + " 个单元";
                unitName = "共 " + words.length + " 词";
            }

            allWords = words.slice();
            remainingWords = allWords.slice();
            currentIndex = 0;
            currentRound = 1;
            currentPhase = "en2cn";
            wordScores = {};
            en2cnScores = {};
            cn2enScores = {};
            wordsLearnedRound = {};
            allWords.forEach(function (w) {
                wordScores[w.en] = 0;
                en2cnScores[w.en] = 0;
                cn2enScores[w.en] = 0;
                wordsLearnedRound[w.en] = 0;
            });

            wordLocationMap = {};
            sessionConfig.selectedUnits.forEach(function (sel) {
                var arr = (wordBank[sel.book] && wordBank[sel.book][sel.unit]) || [];
                arr.forEach(function (w) { wordLocationMap[w.en] = { book: sel.book, unit: sel.unit }; });
            });

            document.getElementById("progressBar").style.display = "";
            saveProgress();
            updateStats();
            renderCard();
        }

        // =============================================
        //  统计
        // =============================================

        // 卡片右上角得分标签：两档（本轮全对=绿，有错=红）
        function getScoreStyle(score) {
            if (score === 0) return "score-low";
            return "score-high";
        }

        function updateStats() {
            // 中→英阶段只计算需要默写的词
            var total = allWords.length;
            if (currentPhase === "cn2en") {
                total = 0;
                for (var i = 0; i < allWords.length; i++) {
                    if (allWords[i].spell !== false) total++;
                }
            }
            var left = remainingWords.length;
            var done = total - left;
            var pct = total > 0 ? Math.round(done / total * 100) : 0;

            var label = bookName;
            if (bookName !== unitName && unitName) label += " · " + unitName;
            document.getElementById("subtitle").textContent = label;

            var phaseLabel = currentPhase === "en2cn" ? "英→中" : "中→英";
            document.getElementById("roundInfo").textContent = phaseLabel + " · 第 " + currentRound + " 轮";
            document.getElementById("countInfo").textContent = "剩余 " + left + " / " + total;
            document.getElementById("progressFill").style.width = pct + "%";
        }

        // =============================================
        //  卡片交互
        // =============================================

        function renderCard() {
            if (remainingWords.length === 0) {
                if (currentPhase === "en2cn") { showPhaseTransition(); }
                else { showReport(); }
                return;
            }
            if (currentIndex >= remainingWords.length) { showRoundEnd(); return; }

            var word = remainingWords[currentIndex];
            var score = wordScores[word.en];
            var scoreClass = getScoreStyle(score);
            meaningShown = false;
            currentChoice = null;

            var phaseTag = currentPhase === "en2cn" ? "英→中" : "中→英";

            var html = '<div class="card">';
            html += '  <div class="phase-tag">' + phaseTag + '</div>';
            html += '  <div class="score-tag ' + scoreClass + '">' + score + '</div>';

            if (currentPhase === "en2cn") {
                html += '  <div class="english" onclick="speakEnglish(\'' + escapeStr(word.en) + '\')" style="cursor:pointer;" title="点击发音">' + normalizeForDisplay(word.en) + '</div>';
                html += '  <div class="phonetic">' + (word.phonetic || '') + '</div>';
            } else {
                html += '  <div class="cn-text">' + word.cn + '</div>';
                html += '  <div class="phonetic" style="visibility:hidden;">' + (word.phonetic || '') + '</div>';
            }

            html += '  <div class="meaning" id="meaningArea">';
            if (currentPhase === "cn2en") {
                html += '    <div class="spell-wrap" id="spellWrap">';
                html += '      <input class="spell-input" id="spellInput" type="text"'
                     + ' autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"'
                     + ' placeholder="拼写英文单词"'
                     + ' onkeydown="if(event.key===\'Enter\')checkSpelling()">';
                html += '      <button class="spell-confirm" onclick="checkSpelling()">确认</button>';
                html += '    </div>';
                html += '    <div id="spellFeedback"></div>';
            }
            html += '  </div>';
            html += '</div>';
            var hasDetail = wordDetail && wordDetail[word.en];

            html += '<div id="actionBtns">';
            html += '  <button class="action-btn btn-known" id="btnKnown" onclick="handleBtn(\'known\')">已会</button>';
            if (hasDetail) {
                html += '  <button class="action-btn btn-detail" onclick="showDetail(remainingWords[currentIndex])">拓展</button>';
            }
            html += '  <button class="action-btn btn-arrow" onclick="handleBtn(\'arrow\')">→</button>';
            html += '</div>';

            document.getElementById("mainArea").innerHTML = html;

            if (currentPhase === "cn2en") {
                setTimeout(function () {
                    var inp = document.getElementById("spellInput");
                    if (inp) inp.focus();
                }, 100);
            }

            if (autoPlay && currentPhase === "en2cn") {
                speakEnglish(word.en);
            }
        }

        // [改动] 已会按钮可切换回浅绿
        function handleBtn(btn) {
            if (!meaningShown) {
                meaningShown = true;
                showMeaning();
                currentChoice = (btn === "known") ? "known" : null;
                updateHighlights();
            } else {
                if (currentChoice === "known") {
                    if (btn === "known") {
                        currentChoice = null;
                        updateHighlights();
                    } else {
                        advanceWord("known");
                    }
                } else {
                    advanceWord(btn === "known" ? "known" : "unknown");
                }
            }
        }

        function showMeaning() {
            var word = remainingWords[currentIndex];
            var el = document.getElementById("meaningArea");

            if (currentPhase === "en2cn") {
                el.textContent = word.cn;
            } else {
                el.innerHTML = '<div style="font-family:Inter,sans-serif;font-size:1.8rem;font-weight:800;margin-bottom:4px;cursor:pointer;"'
                    + ' onclick="speakEnglish(\'' + escapeStr(word.en) + '\')" title="点击发音">'
                    + normalizeForDisplay(word.en) + '</div>'
                    + '<div style="font-family:Inter,sans-serif;font-size:0.85rem;color:var(--text-muted);">'
                    + (word.phonetic || '') + '</div>';

                if (autoPlay) {
                    speakEnglish(word.en);
                }
            }

            el.classList.remove('meaning-animate');
            void el.offsetWidth;
            el.classList.add('meaning-animate');
        }

        function checkSpelling() {
            if (meaningShown) return;

            var input = document.getElementById("spellInput");
            if (!input) return;

            var userAnswer = input.value.trim();
            if (!userAnswer) return;

            var word = remainingWords[currentIndex];
            var correct = normalizeForCompare(userAnswer) === normalizeForCompare(word.en);

            if (correct) {
                input.disabled = true;
                var fb = document.getElementById("spellFeedback");
                fb.innerHTML = '<div class="spell-correct">✓ 拼写正确</div>';
                setTimeout(function () {
                    advanceWord("known");
                }, 500);
            } else {
                meaningShown = true;
                currentChoice = null;
                showMeaning();

                var hint = document.createElement("div");
                hint.className = "spell-wrong-hint";
                hint.textContent = "✕ 你输入了「" + userAnswer + "」";
                var meaningEl = document.getElementById("meaningArea");
                meaningEl.insertBefore(hint, meaningEl.firstChild);
                updateHighlights();
            }
        }

        function updateHighlights() {
            var el = document.getElementById("btnKnown");
            el.className = "action-btn btn-known" + (currentChoice === "known" ? " active" : "");
        }

        // [改动] 推进时记录 lastAction，用于右滑撤销
        function advanceWord(status) {
            if (currentIndex >= remainingWords.length) {
                if (remainingWords.length === 0) {
                    if (currentPhase === "en2cn") { showPhaseTransition(); }
                    else { showReport(); }
                } else {
                    showRoundEnd();
                }
                return;
            }

            var word = remainingWords[currentIndex];
            var spliceIdx = currentIndex;
            var prevRound = wordsLearnedRound[word.en];

            // 薄弱度 = 本轮答错次数（known 不计数，最低 0 = 全对 = 掌握）
            if (status !== "known") {
                wordScores[word.en]++;
                if (currentPhase === "en2cn") en2cnScores[word.en] = (en2cnScores[word.en] || 0) + 1;
                else cn2enScores[word.en] = (cn2enScores[word.en] || 0) + 1;
            }

            if (status === "known") {
                wordsLearnedRound[word.en] = currentRound;
                remainingWords.splice(currentIndex, 1);
            } else {
                currentIndex++;
            }

            saveProgress();
            updateStats();

            if (remainingWords.length === 0) {
                lastAction = null;
                if (currentPhase === "en2cn") { showPhaseTransition(); }
                else { showReport(); }
            } else if (currentIndex >= remainingWords.length) {
                lastAction = null;
                currentIndex = 0;
                updateStats();
                showRoundEnd();
            } else {
                lastAction = { word: word, status: status, spliceIndex: spliceIdx, prevLearnedRound: prevRound, meaningShown: meaningShown, currentChoice: currentChoice };
                renderCard();
            }
        }

        // =============================================
        //  [新增] 右滑撤销
        // =============================================

        function undoLastAction() {
            if (!lastAction) return;

            var savedMeaningShown = lastAction.meaningShown;
            var savedCurrentChoice = lastAction.currentChoice;

            var word = lastAction.word;
            var status = lastAction.status;
            var spliceIdx = lastAction.spliceIndex;

            // 撤销时对称：仅当上一次是答错（unknown）才回退计数
            if (status !== "known") wordScores[word.en]--;
            wordsLearnedRound[word.en] = lastAction.prevLearnedRound;

            if (status === "known") {
                remainingWords.splice(spliceIdx, 0, word);
            }
            currentIndex = spliceIdx;

            lastAction = null;
            saveProgress();
            updateStats();
            renderCard();

            // 恢复之前的视觉状态
            if (savedMeaningShown) {
                meaningShown = true;
                currentChoice = savedCurrentChoice;
                showMeaning();
                updateHighlights();
            }
        }

        var _touchStartX = 0;
        var _touchStartY = 0;

        document.addEventListener('touchstart', function (e) {
            if (e.touches.length === 1) {
                _touchStartX = e.touches[0].clientX;
                _touchStartY = e.touches[0].clientY;
            }
        }, { passive: true });

        document.addEventListener('touchend', function (e) {
            if (!lastAction) return;
            if (e.changedTouches.length !== 1) return;
            var dx = e.changedTouches[0].clientX - _touchStartX;
            var dy = e.changedTouches[0].clientY - _touchStartY;
            if (dx > 50 && Math.abs(dx) > Math.abs(dy)) {
                undoLastAction();
            }
        }, { passive: true });

        document.addEventListener('keydown', function (e) {
            // 仅在卡片学习阶段生效
            if (!document.getElementById('actionBtns')) return;
            // 有弹窗时不响应
            if (document.getElementById('deleteOverlay')) return;
            if (document.querySelector('.report-overlay')) return;
            // 拼写输入中不拦截
            var spellInp = document.getElementById('spellInput');
            if (spellInp && !spellInp.disabled && document.activeElement === spellInp) return;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleBtn('arrow');
            } else if (e.key === ' ') {
                e.preventDefault();
                handleBtn('known');
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (lastAction) undoLastAction();
            } else if (e.key === 'd' || e.key === 'D') {
                var word = remainingWords[currentIndex];
                if (wordDetail && wordDetail[word.en]) {
                    e.preventDefault();
                    showDetail(word);
                }
            }
        });

        // =============================================
        //  轮次 / 阶段
        // =============================================

        function showRoundEnd() {
            lastAction = null;
            var learned = allWords.length - remainingWords.length;
            var html = '<div class="card round-card">'
                + '<div class="round-title">第 ' + currentRound + ' 轮结束</div>'
                + '<div class="round-detail">'
                + '已划掉 <strong style="color:var(--success)">' + learned + '</strong> 个词<br>'
                + '还剩 <strong style="color:var(--accent)">' + remainingWords.length + '</strong> 个词需要复习'
                + '</div></div>'
                + '<button class="btn-round" onclick="nextRound()">'
                + '🔄 开始第 ' + (currentRound + 1) + ' 轮</button>';
            document.getElementById("mainArea").innerHTML = html;
        }

        function nextRound() {
            lastAction = null;
            currentRound++;
            currentIndex = 0;
            saveProgress();
            updateStats();
            renderCard();
        }

        function showPhaseTransition() {
            lastAction = null;
            var phaseLabel = currentPhase === "en2cn" ? "英→中" : "中→英";
            var nextLabel = currentPhase === "en2cn" ? "中→英" : "英→中";

            var spellingWords = allWords.filter(function(w) { return w.spell !== false; });
            var readingOnlyCount = allWords.length - spellingWords.length;

            // 英→中完成，但所有词都只需认读，跳过中→英
            if (currentPhase === "en2cn" && spellingWords.length === 0) {
                var html = '<div class="card phase-card">'
                    + '<div class="phase-icon">✅</div>'
                    + '<div class="phase-title">全部完成</div>'
                    + '<div class="phase-detail">共 ' + currentRound + ' 轮 · ' + allWords.length + ' 词全部通过</div>'
                    + '<div class="phase-detail" style="margin-top:12px;">'
                    + '本批词汇只需认读，无需默写</div>'
                    + '</div>'
                    + '<button class="btn-round" onclick="showReport()">'
                    + '查看学习报告</button>';
                document.getElementById("mainArea").innerHTML = html;
                saveProgress();
                return;
            }

            var html = '<div class="card phase-card">'
                + '<div class="phase-icon">✅</div>'
                + '<div class="phase-title">' + phaseLabel + ' 阶段完成</div>'
                + '<div class="phase-detail">共 ' + currentRound + ' 轮 · ' + allWords.length + ' 词全部通过</div>';

            // 英→中完成，混合词类时显示分类信息
            if (currentPhase === "en2cn" && readingOnlyCount > 0) {
                html += '<div class="phase-detail" style="margin-top:8px;">'
                    + spellingWords.length + ' 词需默写，' + readingOnlyCount + ' 词只需认读</div>';
            }

            html += '<div class="phase-detail" style="margin-top:12px;">'
                + '接下来进行 <strong style="color:var(--accent)">' + nextLabel + '</strong></div>'
                + '</div>'
                + '<button class="btn-round" onclick="startNextPhase()">'
                + '开始' + nextLabel + '</button>';

            document.getElementById("mainArea").innerHTML = html;
            saveProgress();
        }

        function startNextPhase() {
            lastAction = null;
            currentPhase = "cn2en";
            // 只保留需要默写的词
            remainingWords = allWords.filter(function(w) { return w.spell !== false; });
            currentIndex = 0;
            currentRound = 1;
            saveProgress();
            updateStats();
            renderCard();
        }

        // =============================================
        //  学习报告
        // =============================================

        // [改动] 读写本地缓存，瞬间渲染，后台同步云端
        function showReport() {
            lastAction = null;

            var history = cacheLoadHistory();
            var phaseHistory = cacheLoadPhaseHistory();
            var snapWords = [];
            allWords.forEach(function (w) {
                if (!history[w.en]) history[w.en] = [];
                var prev = history[w.en].length > 0 ? history[w.en][history[w.en].length - 1] : null;
                history[w.en].push(wordScores[w.en]);

                var ec = en2cnScores[w.en] || 0;
                var ce = cn2enScores[w.en] || 0;
                if (!phaseHistory[w.en]) phaseHistory[w.en] = { en2cn: [], cn2en: [] };
                var prevEC = phaseHistory[w.en].en2cn.length > 0 ? phaseHistory[w.en].en2cn[phaseHistory[w.en].en2cn.length - 1] : null;
                var prevCE = phaseHistory[w.en].cn2en.length > 0 ? phaseHistory[w.en].cn2en[phaseHistory[w.en].cn2en.length - 1] : null;
                phaseHistory[w.en].en2cn.push(ec);
                phaseHistory[w.en].cn2en.push(ce);

                var loc = wordLocationMap[w.en] || { book: '', unit: '' };
                snapWords.push({
                    en: w.en, prev: prev, latest: wordScores[w.en],
                    prev_en2cn: prevEC, latest_en2cn: ec,
                    prev_cn2en: prevCE, latest_cn2en: ce,
                    book: loc.book, unit: loc.unit
                });
            });
            cacheSaveHistory(history);
            cacheSavePhaseHistory(phaseHistory);

            // [新增] 记录“上次会话快照”用于记分看板进步对比（本地 + 云端）
            saveLastSession({ time: Date.now(), words: snapWords });

            var sessions = cacheLoadSessions();
            var today = new Date().toISOString().slice(0, 10);
            if (sessions.indexOf(today) === -1) sessions.push(today);
            cacheSaveSessions(sessions);

            // 后台同步，不阻塞 UI
            syncToCloud();
            cloudPushSession();

            clearProgress();

            var total = 0;
            allWords.forEach(function (w) { total += wordScores[w.en]; });
            var avg = allWords.length > 0 ? (total / allWords.length).toFixed(1) : 0;

            var sorted = allWords.slice().sort(function (a, b) {
                return wordScores[b.en] - wordScores[a.en];
            });

            // 掌握判定改为两档：已掌握 = 最近三次答错次数均为 0；否则未掌握
            var unmasteredList = sorted.filter(function (w) { return !isMastered(history[w.en]); });
            var masteredList   = sorted.filter(function (w) { return  isMastered(history[w.en]); });
            redReviewWords = unmasteredList;

            function makeRows(list, bg, tc) {
                return list.map(function (w) {
                    var roundText = w.spell === false ? '认读' : '第' + wordsLearnedRound[w.en] + '轮';
                    return '<tr><td>' + w.en + '</td>'
                        + '<td><span class="report-score-badge" style="background:' + bg + ';color:' + tc + '">'
                        + wordScores[w.en] + '</span></td>'
                        + '<td style="color:var(--text-muted);">' + roundText + '</td></tr>';
                }).join('');
            }

            var sections = '';
            if (unmasteredList.length > 0)
                sections += '<div class="report-section"><h3 style="color:var(--danger);">🔴 未掌握（' + unmasteredList.length + ' 词）</h3>'
                    + '<table class="report-table"><thead><tr><th>单词</th><th>本轮得分</th><th>中→英轮次</th></tr></thead>'
                    + '<tbody>' + makeRows(unmasteredList, 'var(--danger-bg)', 'var(--danger)') + '</tbody></table></div>';
            if (masteredList.length > 0)
                sections += '<div class="report-section"><h3 style="color:var(--success);">🟢 已掌握（' + masteredList.length + ' 词）</h3>'
                    + '<table class="report-table"><thead><tr><th>单词</th><th>本轮得分</th><th>中→英轮次</th></tr></thead>'
                    + '<tbody>' + makeRows(masteredList, 'var(--success-bg)', 'var(--success)') + '</tbody></table></div>';

            var displayName = bookName;
            if (bookName !== unitName && unitName) displayName += " · " + unitName;

            var overlay = document.createElement("div");
            overlay.className = "report-overlay";
            overlay.innerHTML = '<h2>📊 学习报告</h2>'
                + '<div class="report-summary">' + displayName
                + '<br>共 ' + allWords.length + ' 词'
                + (function() {
                    var sp = allWords.filter(function(w) { return w.spell !== false; }).length;
                    var ro = allWords.length - sp;
                    if (sp > 0 && ro > 0) return '（' + sp + ' 词默写 + ' + ro + ' 词认读）';
                    if (ro > 0) return '（全部认读）';
                    return '';
                })()
                + ' · '
                + (allWords.filter(function(w) { return w.spell !== false; }).length > 0 ? '英→中 + 中→英' : '英→中')
                + ' · 平均得分 <strong>' + avg + '</strong></div>'
                + (function () {
                    function agg(pk, lk) {
                        var prev = 0, latest = 0, imp = 0, reg = 0, sm = 0, nw = 0, n = 0;
                        snapWords.forEach(function (s) {
                            var p = s[pk], l = s[lk];
                            if (p === null || p === undefined) {
                                if (l > 0) { nw++; latest += l; n++; }
                                return;
                            }
                            prev += p; latest += l; n++;
                            if (l < p) imp++; else if (l > p) reg++; else sm++;
                        });
                        return { prev: prev, latest: latest, imp: imp, reg: reg, sm: sm, nw: nw, n: n };
                    }
                    function trendLine(a, label) {
                        if (a.n === 0) return label + '：本次未练习';
                        if (a.prev === 0) {
                            if (a.latest === 0) return label + '：0 次（保持全对）';
                            return label + '：0 → ' + a.latest + '，增加 <strong style="color:var(--danger)">' + a.latest + '</strong> 次（↑ 100%）';
                        }
                        var reduce = a.prev - a.latest;
                        var pct = Math.round(reduce / a.prev * 100);
                        var t;
                        if (reduce > 0) t = '减少 <strong style="color:var(--success)">' + reduce + '</strong> 次（↓ ' + pct + '%）';
                        else if (reduce < 0) t = '增加 <strong style="color:var(--danger)">' + (-reduce) + '</strong> 次（↑ ' + (-pct) + '%）';
                        else t = '持平';
                        return label + '：' + a.prev + ' → ' + a.latest + '，' + t;
                    }
                    var all = agg('prev', 'latest');
                    if (all.n === 0) {
                        return '<div class="report-progress">本次 ' + all.nw + ' 词均为新词，共答错 ' + all.latest + ' 次（暂无历史对比）</div>';
                    }
                    var hasPhase = snapWords.some(function (s) { return 'prev_en2cn' in s; });
                    var html = '<div class="report-progress">';
                    if (hasPhase) {
                        html += trendLine(all, '总答错');
                        html += '<br>· ' + trendLine(agg('prev_en2cn', 'latest_en2cn'), '英→中');
                        html += '<br>· ' + trendLine(agg('prev_cn2en', 'latest_cn2en'), '中→英');
                    } else {
                        html += trendLine(all, '总答错');
                    }
                    html += '<br>' + all.imp + ' 词进步 / ' + all.reg + ' 词退步 / ' + all.sm + ' 词持平' + (all.nw > 0 ? (' / ' + all.nw + ' 词新') : '');
                    html += '</div>';
                    return html;
                })()
                + sections
                + '<div class="report-actions">'
                + '  <button class="report-btn report-btn-primary" onclick="restartFromConfig()">🔄 再背一遍</button>'
                + (unmasteredList.length > 0 ? '  <button class="report-btn report-btn-secondary" onclick="showRedReviewConfig()" style="background:var(--danger-bg);color:var(--danger);border-color:var(--danger-border);">🔄 复习未掌握词汇（' + unmasteredList.length + ' 词）</button>'
                + '  <div id="redReviewConfig" style="display:none;width:100%;"></div>' : '')
                + '  <button class="report-btn report-btn-secondary" onclick="switchUnit()">📚 选择其他单元</button>'
                + '  <button class="report-btn report-btn-secondary" onclick="removeReportAndShowScoreBoard()">📊 查看记分看板</button>'
                + '  <button class="report-btn report-btn-secondary" onclick="removeReportAndShowStats()">📈 学习统计</button>'
                + '</div>';
            document.body.appendChild(overlay);
        }

        async function restartFromConfig() {
            var el = document.querySelector(".report-overlay");
            if (el) el.remove();

            if (!sessionConfig.selectedUnits || sessionConfig.selectedUnits.length === 0) {
                showSelector(); return;
            }

            var pool = [];
            if (sessionConfig.redWords) {
                pool = sessionConfig.redWords.slice();
            } else {
                sessionConfig.selectedUnits.forEach(function (sel) {
                    pool = pool.concat(wordBank[sel.book][sel.unit]);
                });
            }

            var count = Math.min(sessionConfig.wordCount, pool.length);
            var words;
            if (sessionConfig.strategy === "smart") {
                words = pickWeakest(pool, count);
            } else {
                words = pickRandom(pool, count);
            }
            sessionConfig.wordCount = count;
            startSession(words);
        }

        function switchUnit() {
            clearProgress();
            var el = document.querySelector(".report-overlay");
            if (el) el.remove();
            showSelector();
        }

        function removeReportAndShowScoreBoard() {
            var el = document.querySelector(".report-overlay");
            if (el) el.remove();
            showScoreBoard();
        }

        function removeReportAndShowStats() {
            var el = document.querySelector(".report-overlay");
            if (el) el.remove();
            showStats();
        }

        // [新增] 红色词汇重点复习
        function showRedReviewConfig() {
            var container = document.getElementById('redReviewConfig');
            if (!container) return;
            if (container.style.display !== 'none') {
                container.style.display = 'none';
                return;
            }
            var total = redReviewWords.length;
            var defaultCount = Math.min(20, total);
            var html = '<div style="background:var(--bg-subtle);border-radius:14px;padding:16px;margin-top:10px;border:1px solid var(--border-light);">';
            html += '<div style="font-size:0.85rem;margin-bottom:12px;">复习数量</div>';
            html += '<div style="display:flex;align-items:center;justify-content:center;gap:8px;">';
            html += '<div class="count-stepper">';
            html += '<button onclick="adjustRedCount(-5)">−</button>';
            html += '<div class="count-display" id="redCountDisplay">' + defaultCount + '</div>';
            html += '<button onclick="adjustRedCount(5)">+</button>';
            html += '</div>';
            html += '<button class="btn-all" onclick="setRedCountAll()">全部</button>';
            html += '</div>';
            html += '<button class="start-btn" onclick="startRedReview()" style="margin-top:12px;">开始复习</button>';
            html += '</div>';
            container.innerHTML = html;
            container.style.display = 'block';
        }

        function adjustRedCount(delta) {
            var el = document.getElementById('redCountDisplay');
            var total = redReviewWords.length;
            var cur = parseInt(el.textContent) || 0;
            var next;
            if (delta > 0) {
                if (cur < 5) { next = 5; } else { next = cur + 5; }
                if (next > total) next = total;
            } else {
                if (cur <= 5) { next = 1; } else { next = cur - 5; }
            }
            if (next < 1) next = 1;
            el.textContent = next;
        }

        function setRedCountAll() {
            var el = document.getElementById('redCountDisplay');
            if (el) el.textContent = redReviewWords.length;
        }

        function startRedReview() {
            var el = document.querySelector('.report-overlay');
            if (el) el.remove();
            var count = parseInt(document.getElementById('redCountDisplay').textContent) || redReviewWords.length;
            count = Math.min(count, redReviewWords.length);
            if (count <= 0) return;
            var words = pickRandom(redReviewWords, count);
            sessionConfig = {
                selectedUnits: [{ book: '重点复习', unit: '红色词汇' }],
                wordCount: count,
                strategy: 'random',
                redWords: redReviewWords.slice()
            };
            startSession(words);
        }

        // =============================================
        //  记分看板
        // =============================================

        // 记分看板选词状态（模块级）：选中哪些单元就只显示那些单元；为空则显示全部
        var scoreboardItems = [];
        var scoreboardSelectedUnits = {};

        // [改动] 读本地缓存
        async function showScoreBoard() {
            clearProgress();
            lastAction = null;
            document.getElementById("progressBar").style.display = "none";
            document.getElementById("subtitle").textContent = "";

            if (!hiddenBooks) await loadHiddenBooks();
            var lastSession = await loadLastSession();
            var history = cacheLoadHistory();
            var items = [];

            var wb = effectiveWordBank();
            for (var book in wb) {
                for (var unit in wb[book]) {
                    wb[book][unit].forEach(function (w) {
                        var arr = history[w.en];
                        var avg = 0, count = 0, has = false;
                        if (arr && arr.length > 0) {
                            has = true;
                            count = arr.length;          // 背了几次（每次完整学习会话记一条）
                            avg = arr[arr.length - 1];   // 最近一次答错次数
                        }
                        items.push({ word: w, book: book, unit: unit, avg: avg, count: count, hasHistory: has, arr: arr });
                    });
                }
            }

            items.sort(function (a, b) {
                if (a.hasHistory && !b.hasHistory) return -1;
                if (!a.hasHistory && b.hasHistory) return 1;
                return b.avg - a.avg;
            });

            scoreboardItems = items;

            var hasAny = false;
            for (var k = 0; k < items.length; k++) {
                if (items[k].hasHistory) { hasAny = true; break; }
            }

            var html = '<div class="selector-card">';
            html += '<div class="selector-title">📊 记分看板</div>';

            if (!hasAny) {
                html += '<div style="text-align:center;color:var(--text-muted);padding:30px 0;font-size:0.88rem;">暂无学习记录，先去背单词吧</div>';
                html += '<div style="height:12px;"></div>';
                html += '<button class="start-btn" onclick="showSelector()" style="background:var(--bg-subtle);color:var(--text-muted);border:1px solid var(--border-light);">返回</button>';
                html += '</div>';
                document.getElementById("mainArea").innerHTML = html;
                return;
            }

            if (lastSession && lastSession.words && lastSession.words.length > 0) {
                html += renderProgressCard(lastSession);
            }

            html += '<div style="text-align:center;font-size:0.78rem;color:var(--text-muted);margin-bottom:14px;line-height:1.6;">'
                  + '点击上方单元名即可筛选下方单词；不选则显示全部<br>“🗑 归零显示的词”会清除当前所显示单词的历史</div>';

            html += '<div class="scoreboard-actions">';
            html += '  <button class="strat-btn" onclick="scoreboardShowAll()">显示全部</button>';
            html += '  <button class="strat-btn" onclick="resetScoreboardShown()" style="background:var(--danger-bg);color:var(--danger);border-color:var(--danger-border);">🗑 归零显示的词</button>';
            html += '</div>';

            // 顶部：词书/级别可收缩的「单元选择区」（按词书原始顺序排列单元，单元只显示名不显示书名）
            html += '<div class="scoreboard-unitselect">';
            for (var book in wb) {
                var unitsMap = wb[book];
                var orderedUnits = sortUnitsByLevel(unitsMap);
                var levelGroups = groupUnitsByLevel(orderedUnits);
                var bookHasHist = false;
                orderedUnits.forEach(function (u) { if (historyOfAny(unitsMap[u], history)) bookHasHist = true; });
                if (!bookHasHist) continue;

                html += '<div class="book-section collapsed" id="book_' + escapeAttr(book) + '">';
                html += '  <div class="book-header" onclick="toggleBook(\'' + escapeStr(book) + '\')">';
                html += '    <input type="checkbox" class="book-checkbox" title="选择整本词书"'
                     + ' onclick="event.stopPropagation()"'
                     + ' onchange="toggleScoreboardBookAll(\'' + escapeAttr(book) + '\', this)">';
                html += '    <span class="unit-checkmark" title="选择整本词书"'
                     + ' onclick="event.stopPropagation(); this.previousElementSibling.click();"></span>';
                html += '    <span class="book-name">' + book + '</span>';
                html += '    <span class="book-arrow">▾</span>';
                html += '  </div>';
                html += '  <div class="book-units">';

                if (levelGroups.length > 1) {
                    levelGroups.forEach(function (grp) {
                        var lvl = grp.level;
                        html += '  <div class="level-section collapsed">';
                        html += '    <div class="level-header" onclick="toggleLevel(this)">';
                        html += '      <input type="checkbox" class="level-checkbox" data-book="' + escapeAttr(book) + '" data-level="' + escapeAttr(lvl) + '"'
                             + ' title="选择整个级别" onclick="event.stopPropagation()"'
                             + ' onchange="toggleScoreboardLevelAll(\'' + escapeStr(book) + '\',\'' + escapeStr(lvl) + '\',this)">';
                        html += '      <span class="unit-checkmark" title="选择整个级别"'
                             + ' onclick="event.stopPropagation(); this.previousElementSibling.click();"></span>';
                        html += '      <span class="level-name">' + lvl + '</span>';
                        html += '      <span class="level-arrow">▾</span>';
                        html += '    </div>';
                        html += '    <div class="level-units">';
                        grp.units.forEach(function (unit) {
                            if (!historyOfAny(unitsMap[unit], history)) return;
                            var unitKey = book + ' · ' + unit;
                            html += '<div class="unit-tag" data-unit="' + escapeAttr(unit) + '" data-unitkey="' + escapeAttr(unitKey) + '" onclick="toggleUnitTag(this,\'' + escapeStr(unitKey) + '\')">' + unit + '</div>';
                        });
                        html += '    </div>';
                        html += '  </div>';
                    });
                } else {
                    levelGroups[0].units.forEach(function (unit) {
                        if (!historyOfAny(unitsMap[unit], history)) return;
                        var unitKey = book + ' · ' + unit;
                        html += '<div class="unit-tag" data-unit="' + escapeAttr(unit) + '" data-unitkey="' + escapeAttr(unitKey) + '" onclick="toggleUnitTag(this,\'' + escapeStr(unitKey) + '\')">' + unit + '</div>';
                    });
                }

                html += '  </div>';
                html += '</div>';
            }
            html += '</div>';

            // 底部：扁平单词列表（按上方选择的单元过滤；无选择则显示全部；不再逐词勾选）
            html += '<div class="scoreboard-scroll" id="scoreboardScroll">';
            html += renderScoreboardRows();
            html += '</div>';

            html += '<div style="height:16px;"></div>';
            html += '<button class="start-btn" onclick="showSelector()" style="background:var(--bg-subtle);color:var(--text-muted);border:1px solid var(--border-light);">返回</button>';
            html += '</div>';

            document.getElementById("mainArea").innerHTML = html;
        }

        // 某单元是否有任意带历史记录的单词
        function historyOfAny(units, history) {
            for (var i = 0; i < units.length; i++) {
                var arr = history[units[i].en];
                if (arr && arr.length > 0) return true;
            }
            return false;
        }

        function escapeHtml(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        function formatAgo(ts) {
            if (!ts) return '';
            var diff = Date.now() - ts;
            var m = Math.floor(diff / 60000);
            if (m < 1) return '刚刚';
            if (m < 60) return m + ' 分钟前';
            var h = Math.floor(m / 60);
            if (h < 24) return h + ' 小时前';
            var d = Math.floor(h / 24);
            return d + ' 天前';
        }

        // 记分看板顶部“最近一次学习进步”卡（不受单元筛选影响）
        function renderProgressCard(ls) {
            var words = ls.words || [];
            var hasPhase = words.some(function (s) { return 'prev_en2cn' in s; });

            // 旧快照（升级前）只有组合 prev/latest，按原样式渲染，保证向后兼容
            if (!hasPhase) {
                var prevSum = 0, latestSum = 0, improved = 0, regressed = 0, same = 0, isNew = 0;
                words.forEach(function (s) {
                    if (s.prev === null || s.prev === undefined) { isNew++; latestSum += s.latest; return; }
                    prevSum += s.prev; latestSum += s.latest;
                    if (s.latest < s.prev) improved++;
                    else if (s.latest > s.prev) regressed++;
                    else same++;
                });
                var reduce = prevSum - latestSum;
                var summaryHtml;
                if (isNew === words.length) {
                    summaryHtml = '本次 <strong>' + words.length + '</strong> 词均为新词，共答错 <strong>' + latestSum + '</strong> 次（暂无历史对比）';
                } else {
                    var trend;
                    if (reduce > 0) trend = '减少 <strong style="color:var(--success)">' + reduce + '</strong> 次答错';
                    else if (reduce < 0) trend = '增加 <strong style="color:var(--danger)">' + (-reduce) + '</strong> 次答错';
                    else trend = '答错次数持平';
                    summaryHtml = '总答错 <strong>' + prevSum + '</strong> → <strong>' + latestSum + '</strong>，' + trend
                        + '；<span style="color:var(--success)">' + improved + ' 词进步</span> / <span style="color:var(--danger)">' + regressed + ' 词退步</span> / ' + same + ' 词持平'
                        + (isNew > 0 ? (' / ' + isNew + ' 词新') : '');
                }
                var rows = words.map(function (s) {
                    var dcls, dtext;
                    if (s.prev === null || s.prev === undefined) { dcls = 'prog-new'; dtext = '新 → ' + s.latest; }
                    else {
                        var d = s.prev - s.latest;
                        if (d > 0) { dcls = 'prog-up'; dtext = '−' + d + ' ▲'; }
                        else if (d < 0) { dcls = 'prog-down'; dtext = '+' + (-d) + ' ▼'; }
                        else { dcls = 'prog-same'; dtext = '0 —'; }
                    }
                    return '<div class="progress-row">'
                        + '<span class="progress-word">' + escapeHtml(s.en) + '</span>'
                        + '<span class="progress-unit">' + escapeHtml(s.unit || '') + '</span>'
                        + '<span class="progress-prev">' + (s.prev === null || s.prev === undefined ? '—' : s.prev) + ' → ' + s.latest + '</span>'
                        + '<span class="progress-delta ' + dcls + '">' + dtext + '</span>'
                        + '</div>';
                }).join('');
                return '<div class="progress-card">'
                    + '<div class="progress-card-title">📈 最近一次学习进步 · ' + formatAgo(ls.time) + '</div>'
                    + '<div class="progress-summary">' + summaryHtml + '</div>'
                    + '<div class="progress-list">' + rows + '</div>'
                    + '</div>';
            }

            // 新快照：区分英→中 / 中→英 两轮
            function agg(pk, lk) {
                var prev = 0, latest = 0, imp = 0, reg = 0, sm = 0, nw = 0, n = 0;
                words.forEach(function (s) {
                    var p = s[pk], l = s[lk];
                    if (p === null || p === undefined) {
                        if (l > 0) { nw++; latest += l; n++; }
                        return;
                    }
                    prev += p; latest += l; n++;
                    if (l < p) imp++; else if (l > p) reg++; else sm++;
                });
                return { prev: prev, latest: latest, imp: imp, reg: reg, sm: sm, nw: nw, n: n };
            }

            function statBox(label, a) {
                var num, trendCls, trendTxt;
                if (a.n === 0 && a.nw === 0) { num = '—'; trendTxt = '未练习'; trendCls = 'prog-same'; }
                else if (a.prev === 0) {
                    if (a.latest === 0) { num = '0 → 0'; trendTxt = '全对'; trendCls = 'prog-up'; }
                    else { num = '0 → ' + a.latest; trendTxt = '↑100%'; trendCls = 'prog-down'; }
                } else {
                    var reduce = a.prev - a.latest;
                    var pct = Math.round(reduce / a.prev * 100);
                    num = a.prev + ' → ' + a.latest;
                    if (reduce > 0) { trendTxt = '↓' + pct + '%'; trendCls = 'prog-up'; }
                    else if (reduce < 0) { trendTxt = '↑' + (-pct) + '%'; trendCls = 'prog-down'; }
                    else { trendTxt = '0%'; trendCls = 'prog-same'; }
                }
                return '<div class="pphase"><div class="pphase-label">' + label + '</div>'
                    + '<div class="pphase-num">' + num + '</div>'
                    + '<div class="pphase-trend ' + trendCls + '">' + trendTxt + '</div></div>';
            }

            function phaseCell(p, l) {
                if (p === null || p === undefined) {
                    if (l > 0) return '<span class="pp-num">新→' + l + '</span><span class="pp-delta prog-new">新</span>';
                    return '<span class="pp-num pp-none">—</span>';
                }
                var d = p - l, dcls, dtext;
                if (d > 0) { dcls = 'prog-up'; dtext = '−' + d + ' ▲'; }
                else if (d < 0) { dcls = 'prog-down'; dtext = '+' + (-d) + ' ▼'; }
                else { dcls = 'prog-same'; dtext = '0'; }
                return '<span class="pp-num">' + p + '→' + l + '</span><span class="pp-delta ' + dcls + '">' + dtext + '</span>';
            }

            function wordRow(s) {
                return '<div class="progress-row">'
                    + '<span class="progress-word">' + escapeHtml(s.en) + '</span>'
                    + '<span class="progress-unit">' + escapeHtml(s.unit || '') + '</span>'
                    + '<span class="progress-pair"><span class="pp-tag">英</span>' + phaseCell(s.prev_en2cn, s.latest_en2cn) + '</span>'
                    + '<span class="progress-pair"><span class="pp-tag">中</span>' + phaseCell(s.prev_cn2en, s.latest_cn2en) + '</span>'
                    + '</div>';
            }

            var ec = agg('prev_en2cn', 'latest_en2cn');
            var ce = agg('prev_cn2en', 'latest_cn2en');
            var all = agg('prev', 'latest');

            var summaryHtml;
            if (all.n === 0) {
                summaryHtml = '本次 <strong>' + words.length + '</strong> 词均为新词，共答错 <strong>' + all.latest + '</strong> 次（暂无历史对比）';
            } else {
                var atxt;
                if (all.prev === 0) atxt = (all.latest === 0 ? '保持全对' : '首次，共 ' + all.latest + ' 次');
                else {
                    var r = all.prev - all.latest, pct = Math.round(r / all.prev * 100);
                    if (r > 0) atxt = '总答错减少 <strong style="color:var(--success)">' + r + '</strong> 次（↓ ' + pct + '%）';
                    else if (r < 0) atxt = '总答错增加 <strong style="color:var(--danger)">' + (-r) + '</strong> 次（↑ ' + (-pct) + '%）';
                    else atxt = '总答错持平';
                }
                summaryHtml = atxt + '；<span style="color:var(--success)">' + all.imp + ' 词进步</span> / <span style="color:var(--danger)">' + all.reg + ' 词退步</span> / ' + all.sm + ' 词持平'
                    + (all.nw > 0 ? (' / ' + all.nw + ' 词新') : '');
            }

            var boxes = statBox('英→中', ec) + statBox('中→英', ce) + statBox('合计', all);
            var rows = words.map(wordRow).join('');

            return '<div class="progress-card">'
                + '<div class="progress-card-title">📈 最近一次学习进步 · ' + formatAgo(ls.time) + '</div>'
                + '<div class="progress-phases">' + boxes + '</div>'
                + '<div class="progress-summary">' + summaryHtml + '</div>'
                + '<div class="progress-legend"><span class="pp-leg">英</span>英→中　<span class="pp-leg">中</span>中→英　（数值=答错次数，▲减少 ▼增加）</div>'
                + '<div class="progress-list">' + rows + '</div>'
                + '</div>';
        }

        // 依据选中单元过滤，渲染底部单词行（无选中则显示全部；不再逐词勾选）
        function renderScoreboardRows() {
            var keys = Object.keys(scoreboardSelectedUnits);
            var list = (keys.length === 0) ? scoreboardItems : scoreboardItems.filter(function (it) {
                return scoreboardSelectedUnits[it.book + ' · ' + it.unit];
            });
            var html = '';
            list.forEach(function (item) {
                var cls = '', badgeHtml = '';
                if (item.hasHistory) {
                    cls = isMastered(item.arr) ? 'score-low' : 'score-high';
                    badgeHtml = '<span class="scoreboard-badge ' + cls + '">' + item.avg + '</span>';
                } else {
                    badgeHtml = '<span class="scoreboard-badge-empty">无记录</span>';
                }
                html += '<div class="scoreboard-row">';
                html += '  <span class="scoreboard-word">' + item.word.en + '</span>';
                if (item.hasHistory) {
                    html += '  <span class="scoreboard-meta">' + item.unit + '<br>' + item.count + ' 次</span>';
                } else {
                    html += '  <span class="scoreboard-meta">' + item.unit + '</span>';
                }
                html += '  ' + badgeHtml;
                html += '</div>';
            });
            return html;
        }

        function refreshScoreboardRows() {
            var scroll = document.getElementById('scoreboardScroll');
            if (scroll) scroll.innerHTML = renderScoreboardRows();
        }

        function toggleUnitTag(el, unitKey) {
            if (scoreboardSelectedUnits[unitKey]) delete scoreboardSelectedUnits[unitKey];
            else scoreboardSelectedUnits[unitKey] = true;
            el.classList.toggle('active', !!scoreboardSelectedUnits[unitKey]);
            refreshScoreboardRows();
            syncScoreboardCheckboxes();
        }

        function toggleScoreboardBookAll(book, box) {
            var check = box.checked;
            var sec = document.getElementById('book_' + book);
            if (!sec) return;
            sec.querySelectorAll('.unit-tag').forEach(function (tag) {
                var k = tag.getAttribute('data-unitkey');
                if (check) scoreboardSelectedUnits[k] = true; else delete scoreboardSelectedUnits[k];
                tag.classList.toggle('active', check);
            });
            refreshScoreboardRows();
            syncScoreboardCheckboxes();
        }

        function toggleScoreboardLevelAll(book, level, box) {
            var check = box.checked;
            var sec = document.getElementById('book_' + book);
            if (!sec) return;
            sec.querySelectorAll('.unit-tag').forEach(function (tag) {
                var u = tag.getAttribute('data-unit');
                if ((getLevelPrefix(u) || '') === level) {
                    var k = tag.getAttribute('data-unitkey');
                    if (check) scoreboardSelectedUnits[k] = true; else delete scoreboardSelectedUnits[k];
                    tag.classList.toggle('active', check);
                }
            });
            refreshScoreboardRows();
            syncScoreboardCheckboxes();
        }

        // 同步词书标题与级别标题的“全选”复选框（含半选 indeterminate），依据单元名 active 状态
        function syncScoreboardCheckboxes() {
            var wb = effectiveWordBank();
            for (var book in wb) {
                var sec = document.getElementById('book_' + book);
                if (!sec) continue;
                var tags = sec.querySelectorAll('.unit-tag');
                var total = tags.length, active = 0;
                tags.forEach(function (t) { if (t.classList.contains('active')) active++; });
                var box = sec.querySelector('.book-checkbox');
                if (box) {
                    box.checked = (total > 0 && active === total);
                    box.indeterminate = (active > 0 && active < total);
                }
                var levelState = {};
                tags.forEach(function (t) {
                    var u = t.getAttribute('data-unit');
                    var lvl = getLevelPrefix(u) || '';
                    if (!levelState[lvl]) levelState[lvl] = { total: 0, active: 0 };
                    levelState[lvl].total++;
                    if (t.classList.contains('active')) levelState[lvl].active++;
                });
                for (var lvl in levelState) {
                    var lcb = sec.querySelector('.level-checkbox[data-level="' + escapeAttr(lvl) + '"]');
                    if (!lcb) continue;
                    lcb.checked = (levelState[lvl].total > 0 && levelState[lvl].active === levelState[lvl].total);
                    lcb.indeterminate = (levelState[lvl].active > 0 && levelState[lvl].active < levelState[lvl].total);
                }
            }
        }

        function scoreboardShowAll() {
            scoreboardSelectedUnits = {};
            document.querySelectorAll('.unit-tag').forEach(function (t) { t.classList.remove('active'); });
            refreshScoreboardRows();
            syncScoreboardCheckboxes();
        }

        // [改动] 立即写本地 + 立即同步云端（批量单次请求）：归零“当前显示”的单词
        async function resetScoreboardShown() {
            var keys = Object.keys(scoreboardSelectedUnits);
            var list = (keys.length === 0) ? scoreboardItems : scoreboardItems.filter(function (it) {
                return scoreboardSelectedUnits[it.book + ' · ' + it.unit];
            });
            var words = [];
            list.forEach(function (it) { if (it.hasHistory) words.push(it.word.en); });
            if (words.length === 0) { alert('当前显示的单词都没有历史记录，无可归零'); return; }

            var msg = '确定将当前显示的 ' + words.length + ' 个单词的历史分数归零吗？\n\n';
            if (words.length <= 20) msg += words.join('、');
            else msg += words.slice(0, 20).join('、') + '\n……等共 ' + words.length + ' 个词';
            msg += '\n\n此操作不可撤销。';

            if (!confirm(msg)) return;

            var localHistory = cacheLoadHistory();
            words.forEach(function (w) { delete localHistory[w]; });
            cacheSaveHistory(localHistory);

            await cloudDeleteHistory(words);

            alert('已清除 ' + words.length + ' 个单词的历史分数');
            showScoreBoard();
        }

        // =============================================
        //  学习统计
        // =============================================

        // [改动] 读本地缓存
        async function showStats() {
            clearProgress();
            lastAction = null;
            document.getElementById("progressBar").style.display = "none";
            document.getElementById("subtitle").textContent = "";

            if (!hiddenBooks) await loadHiddenBooks();
            var history = cacheLoadHistory();
            var sessions = cacheLoadSessions();

            var uniqueDates = [];
            sessions.forEach(function (d) { if (uniqueDates.indexOf(d) === -1) uniqueDates.push(d); });
            uniqueDates.sort();

            var totalWords = Object.keys(history).length;
            var mastered = 0, unmastered = 0;

            for (var word in history) {
                var arr = history[word];
                if (arr.length === 0) continue;
                if (isMastered(arr)) mastered++;
                else unmastered++;
            }

            // [改动] 按词书分组统计单元进度：主指标=已背比例，副行=掌握数，顶部加词书级汇总
            var bookMap = {};
            var wb = effectiveWordBank();
            for (var book in wb) {
                var bk = { total: 0, practiced: 0, units: [] };
                for (var unit in wb[book]) {
                    var words = wb[book][unit];
                    var practiced = 0, unitMastered = 0, unitTotal = words.length;
                    words.forEach(function (w) {
                        var arr = history[w.en];
                        if (arr && arr.length > 0) {
                            practiced++;
                            if (isMastered(arr)) unitMastered++;
                        }
                    });
                    bk.total += unitTotal;
                    bk.practiced += practiced;
                    if (practiced > 0) {
                        bk.units.push({
                            label: unit, total: unitTotal,
                            practiced: practiced, mastered: unitMastered,
                            rate: Math.round(practiced / unitTotal * 100)
                        });
                    }
                }
                if (bk.units.length > 0) bookMap[book] = bk;
            }

            var html = '<div class="selector-card">';
            html += '<div class="selector-title">📈 学习统计</div>';

            html += '<div class="stats-grid">';
            html += '  <div class="stat-card"><div class="stat-number">' + uniqueDates.length + '</div><div class="stat-label">学习天数</div></div>';
            html += '  <div class="stat-card"><div class="stat-number">' + sessions.length + '</div><div class="stat-label">完成次数</div></div>';
            html += '  <div class="stat-card"><div class="stat-number">' + totalWords + '</div><div class="stat-label">学过单词</div></div>';
            html += '</div>';

            if (totalWords > 0) {
                var mPct = Math.round(mastered / totalWords * 100);
                var uPct = 100 - mPct;

                html += '<div class="stats-section">';
                html += '  <div class="stats-section-title">掌握情况</div>';
                html += '  <div class="mastery-bar">';
                html += '    <div class="mastery-segment mastery-green" style="width:' + mPct + '%;"></div>';
                html += '    <div class="mastery-segment mastery-gray" style="width:' + uPct + '%;"></div>';
                html += '  </div>';
                html += '  <div class="mastery-legend">';
                html += '    <span class="legend-item"><span class="legend-dot" style="background:var(--success);"></span>已掌握 ' + mastered + ' 词</span>';
                html += '    <span class="legend-item"><span class="legend-dot" style="background:var(--border-light);"></span>未掌握 ' + unmastered + ' 词</span>';
                html += '  </div>';
                html += '</div>';
            }

            if (Object.keys(bookMap).length > 0) {
                html += '<div class="stats-section">';
                html += '  <div class="stats-section-title">单元进度</div>';
                for (var book in bookMap) {
                    var bk = bookMap[book];
                    var bookRate = bk.total > 0 ? Math.round(bk.practiced / bk.total * 100) : 0;
                    html += '  <div class="book-summary">';
                    html += '    <span class="book-summary-name">' + book + '</span>';
                    html += '    <span class="book-summary-rate">已背 ' + bk.practiced + ' / ' + bk.total + ' = ' + bookRate + '%</span>';
                    html += '  </div>';
                    bk.units.forEach(function (s) {
                        var practicedRate = s.rate; // 已背比例（= round(practiced/total*100)）
                        var masteredRate = s.total > 0 ? Math.round(s.mastered / s.total * 100) : 0;
                        html += '  <div class="unit-progress">';
                        html += '    <div class="unit-progress-header">';
                        html += '      <span class="unit-progress-name">' + s.label + '</span>';
                        html += '    </div>';
                        // 双层进度条：棕色=已背(底层)，绿色=已掌握(上层，必≤棕色，相等时覆盖为绿色)
                        html += '    <div class="unit-progress-track">';
                        html += '      <div class="unit-progress-fill-brown" style="width:' + practicedRate + '%;"></div>';
                        html += '      <div class="unit-progress-fill-green" style="width:' + masteredRate + '%;"></div>';
                        html += '    </div>';
                        html += '    <div class="unit-progress-detail">';
                        html += '      <span class="up-practiced">已背 ' + s.practiced + '/' + s.total + '词 ' + practicedRate + '%</span>';
                        html += '      <span class="up-sep"> · </span>';
                        html += '      <span class="up-mastered">掌握 ' + s.mastered + '/' + s.total + '词 ' + masteredRate + '%</span>';
                        html += '    </div>';
                        html += '  </div>';
                    });
                }
                html += '</div>';
            }

            if (sessions.length > 0) {
                html += '<div class="stats-section">';
                html += '  <div class="stats-section-title">学习热力图（近90天）</div>';

                // 统计每天学习次数
                var dateCounts = {};
                sessions.forEach(function(d) {
                    dateCounts[d] = (dateCounts[d] || 0) + 1;
                });

                var today = new Date();
                today.setHours(0, 0, 0, 0);
                var gridStart = new Date(today);
                gridStart.setDate(gridStart.getDate() - 89);

                // 对齐到周一
                var dow = gridStart.getDay();
                gridStart.setDate(gridStart.getDate() - (dow + 6) % 7);

                var totalDays = Math.ceil((today - gridStart) / 86400000) + 1;
                var totalWeeks = Math.ceil(totalDays / 7);

                // 月份标签
                var monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
                var monthLabels = [];
                var sm = gridStart.getMonth(), sy = gridStart.getFullYear();
                var em = today.getMonth(), ey = today.getFullYear();
                var cm = sm, cy = sy;
                while (true) {
                    var fm = new Date(cy, cm, 1);
                    if (fm < gridStart) fm = new Date(gridStart);
                    if (fm > today) break;
                    var ci = Math.floor((fm - gridStart) / (1000 * 60 * 60 * 24 * 7));
                    monthLabels.push({ col: ci, label: monthNames[cm] });
                    if (cy === ey && cm === em) break;
                    cm++;
                    if (cm > 11) { cm = 0; cy++; }
                }

                var weekLabels = ['一','二','三','四','五','六','日'];

                html += '<div class="heatmap-wrap">';
                html += '  <div class="heatmap-labels">';
                for (var wi = 0; wi < 7; wi++) {
                    html += '    <div class="heatmap-label">' + (wi % 2 === 0 ? weekLabels[wi] : '') + '</div>';
                }
                html += '  </div>';
                html += '  <div class="heatmap-grid-wrap">';

                // 月份行
                html += '    <div class="heatmap-months" style="width:' + (totalWeeks * 14) + 'px;">';
                for (var mi = 0; mi < monthLabels.length; mi++) {
                    html += '      <div class="heatmap-month" style="left:' + (monthLabels[mi].col * 14) + 'px;">' + monthLabels[mi].label + '</div>';
                }
                html += '    </div>';

                // 格子阵
                html += '    <div class="heatmap-grid">';
                for (var col = 0; col < totalWeeks; col++) {
                    html += '      <div class="heatmap-col">';
                    for (var row = 0; row < 7; row++) {
                        var d = new Date(gridStart);
                        d.setDate(d.getDate() + col * 7 + row);
                        var ds = d.toISOString().slice(0, 10);
                        if (d > today) {
                            html += '        <div class="heatmap-cell" style="background:transparent;"></div>';
                        } else {
                            var cnt = dateCounts[ds] || 0;
                            var color = cnt === 0 ? 'rgba(0,0,0,0.06)'
                                      : cnt === 1 ? 'rgba(90,154,110,0.25)'
                                      : cnt === 2 ? 'rgba(90,154,110,0.55)'
                                      : 'rgba(90,154,110,0.85)';
                            html += '        <div class="heatmap-cell" style="background:' + color + ';" title="' + (d.getMonth()+1) + '月' + d.getDate() + '日: ' + cnt + '次"></div>';
                        }
                    }
                    html += '      </div>';
                }
                html += '    </div>';
                html += '  </div>';
                html += '</div>';

                // 图例
                html += '<div class="heatmap-legend">';
                html += '  <span>少</span>';
                html += '  <div class="heatmap-legend-cell" style="background:rgba(0,0,0,0.06);"></div>';
                html += '  <div class="heatmap-legend-cell" style="background:rgba(90,154,110,0.25);"></div>';
                html += '  <div class="heatmap-legend-cell" style="background:rgba(90,154,110,0.55);"></div>';
                html += '  <div class="heatmap-legend-cell" style="background:rgba(90,154,110,0.85);"></div>';
                html += '  <span>多</span>';
                html += '</div>';

                html += '</div>';
            }

            if (totalWords === 0 && sessions.length === 0) {
                html += '<div style="text-align:center;color:var(--text-muted);padding:30px 0;font-size:0.88rem;">暂无学习记录，先去背单词吧</div>';
            }

            html += '<div style="height:16px;"></div>';
            html += '<button class="start-btn" onclick="showSelector()" style="background:var(--bg-subtle);color:var(--text-muted);border:1px solid var(--border-light);">返回</button>';
            html += '</div>';

            document.getElementById("mainArea").innerHTML = html;
        }

        // =============================================
        //  启动
        // =============================================

        loadAutoPlayPref();
        showLogin();

        // =============================================
        //  拓展知识点浮层
        // =============================================

        function showDetail(word) {
            var d = wordDetail[word.en];
            if (!d) return;

            var html = '<div class="detail-overlay" id="detailOverlay">';
            html += '<div class="detail-title">' + normalizeForDisplay(word.en) + '</div>';
            html += '<div class="detail-phonetic">' + (word.phonetic || '') + '</div>';

            if (d.family && d.family.length > 0) {
                html += '<div class="detail-section">';
                html += '<h3>📖 词族</h3><ul>';
                d.family.forEach(function (item) {
                    html += '<li>' + item + '</li>';
                });
                html += '</ul></div>';
            }

            if (d.phrases && d.phrases.length > 0) {
                html += '<div class="detail-section">';
                html += '<h3>📝 常用短语</h3><ul>';
                d.phrases.forEach(function (item) {
                    html += '<li>' + item + '</li>';
                });
                html += '</ul></div>';
            }

            if (d.examples && d.examples.length > 0) {
                html += '<div class="detail-section">';
                html += '<h3>💬 例句</h3><ul>';
                d.examples.forEach(function (item) {
                    html += '<li><div class="detail-example-en">' + item + '</div></li>';
                });
                html += '</ul></div>';
            }

            if (d.comparison && d.comparison.length > 0) {
                html += '<div class="detail-section">';
                html += '<h3>🔍 词义辨析</h3>';
                html += '<div class="detail-comparison">' + d.comparison + '</div>';
                html += '</div>';
            }

            html += '<button class="detail-close" onclick="closeDetail()">返回</button>';
            html += '</div>';

            document.body.insertAdjacentHTML('beforeend', html);
        }

        function closeDetail() {
            var el = document.getElementById("detailOverlay");
            if (el) el.remove();
        }

        // [新增] 页面离开时同步云端
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden' && USER_ID) {
                syncToCloud();
            }
        });
