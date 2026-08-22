(function () {
    class SPMPackageBrowser {
        getInfo() {
            return {
                id: 'SPMPackageBrowser',
                name: 'SPM',
                color1: '#5B7B97',
                color2: '#8AA1B8',
                blocks: [
                    { opcode: 'openBrowser', blockType: Scratch.BlockType.COMMAND, text: '打开SPM包浏览器' }
                ]
            };
        }

        openBrowser() {
            if (document.getElementById('SPM-browser-window')) {
                document.getElementById('SPM-browser-window').style.display = 'flex';
                return;
            }

            // Material Symbols（替换 Font Awesome）
            if (!document.getElementById('SPM-material-icons')) {
                const mi = document.createElement('link');
                mi.id = 'SPM-material-icons';
                mi.rel = 'stylesheet';
                mi.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-25..200';
                document.head.appendChild(mi);
            }

            // Tailwind 仍然保留（兼容原有样式系统）
            if (!document.getElementById('SPM-tailwind')) {
                const tw = document.createElement('script');
                tw.id = 'SPM-tailwind';
                tw.src = 'https://cdn.tailwindcss.com';
                document.head.appendChild(tw);
            }

            const win = document.createElement('div');
            win.id = 'SPM-browser-window';
            win.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 920px;
                height: 620px;
                background: #F8FAFC;
                border-radius: 28px;
                border: 1px solid #E2E8F0;
                box-shadow: 0 25px 50px -12px rgb(91 123 151 / 0.25);
                z-index: 999999;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                color: #334155;
            `;

            // Material Design 3 风格完整 UI
            win.innerHTML = `
                <!-- AppBar -->
                <div class="spm-appbar px-6 py-4 flex items-center justify-between text-white cursor-move select-none bg-gradient-to-r from-[#5B7B97] to-[#6C8AAB]">
                    <div class="flex items-center gap-x-3">
                        <span class="material-symbols-outlined text-3xl">package_2</span>
                        <div>
                            <div class="text-2xl font-medium tracking-tight">SPM Store</div>
                            <div class="text-xs opacity-90 -mt-0.5">Scratch Package Manager</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-x-2">
                        <button onclick="window.SPMLoadPackages()" 
                                class="flex items-center gap-x-2 bg-white/20 hover:bg-white/30 px-5 h-9 rounded-2xl text-sm font-medium transition-colors">
                            <span class="material-symbols-outlined">refresh</span>
                            <span>刷新</span>
                        </button>
                        <button onclick="this.closest('#SPM-browser-window').style.display='none'; event.stopPropagation()"
                                class="w-9 h-9 flex items-center justify-center hover:bg-white/20 rounded-2xl transition-colors">
                            <span class="material-symbols-outlined text-2xl">close</span>
                        </button>
                    </div>
                </div>

                <!-- Filters -->
                <div class="px-6 pt-5 pb-6 bg-white border-b border-[#E2E8F0]">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-3">
                            <label class="block text-xs font-medium mb-1 text-[#64748B]">所有者</label>
                            <input id="owner-input" value="deep"
                                   class="w-full border border-[#CBD5E1] rounded-2xl px-4 py-3 text-[#334155] bg-white focus:border-[#5B7B97] focus:ring-2 focus:ring-[#5B7B97]/20 focus:outline-none text-base">
                        </div>
                        <div class="col-span-2 relative">
                            <label class="block text-xs font-medium mb-1 text-[#64748B]">类型</label>
                            <select id="type-select"
                                    class="w-full border border-[#CBD5E1] rounded-2xl px-4 py-3 text-[#334155] bg-white focus:border-[#5B7B97] focus:ring-2 focus:ring-[#5B7B97]/20 focus:outline-none appearance-none text-base">
                                <option value="">全部</option>
                                <option value="npm">npm</option>
                                <option value="pypi">PyPI</option>
                                <option value="maven">Maven</option>
                                <option value="cargo">Cargo</option>
                                <option value="go">Go</option>
                                <option value="generic">Generic</option>
                            </select>
                            <span class="material-symbols-outlined absolute right-4 top-9 text-[#94A3B8] pointer-events-none">arrow_drop_down</span>
                        </div>
                        <div class="col-span-3">
                            <label class="block text-xs font-medium mb-1 text-[#64748B]">搜索 / 包ID</label>
                            <input id="search-input" placeholder="关键词或数字ID"
                                   class="w-full border border-[#CBD5E1] rounded-2xl px-4 py-3 text-[#334155] bg-white focus:border-[#5B7B97] focus:ring-2 focus:ring-[#5B7B97]/20 focus:outline-none text-base">
                        </div>
                        <div class="col-span-3 relative">
                            <label class="block text-xs font-medium mb-1 text-[#64748B]">访问令牌（可选）</label>
                            <input id="token-input" type="password" placeholder="gitea_pat_..."
                                   class="w-full border border-[#CBD5E1] rounded-2xl px-4 py-3 pr-12 text-[#334155] bg-white focus:border-[#5B7B97] focus:ring-2 focus:ring-[#5B7B97]/20 focus:outline-none text-base">
                            <button onclick="window.SPMToggleToken()" 
                                    class="absolute right-4 top-9 text-[#94A3B8] hover:text-[#5B7B97]">
                                <span id="token-eye" class="material-symbols-outlined text-2xl">visibility</span>
                            </button>
                        </div>
                        <div class="col-span-1 flex items-end">
                            <button onclick="window.SPMLoadPackages()" 
                                    class="w-full h-12 bg-[#5B7B97] hover:bg-[#4A6885] text-white rounded-3xl font-medium flex items-center justify-center gap-x-2 shadow-md active:scale-95 transition-all">
                                <span class="material-symbols-outlined">search</span>
                                <span>加载</span>
                            </button>
                        </div>
                    </div>

                    <!-- Direct input -->
                    <div class="flex gap-3 mt-6">
                        <input id="direct-input" placeholder="直接输入：npm/react 或 pypi/requests"
                               class="flex-1 border border-[#CBD5E1] rounded-3xl px-4 py-3 text-[#334155] bg-white focus:border-[#5B7B97] focus:ring-2 focus:ring-[#5B7B97]/20 focus:outline-none text-base">
                        <button onclick="window.SPMDirectView()" 
                                class="px-8 bg-[#5B7B97] hover:bg-[#4A6885] text-white rounded-3xl font-medium shadow-md active:scale-95 transition-all">
                            立即查看
                        </button>
                    </div>
                </div>

                <!-- Results -->
                <div class="flex-1 overflow-auto p-6 bg-[#F8FAFC]" id="results-area">
                    <div id="packages-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                </div>

                <!-- Resize handle -->
                <div id="resize-handle" 
                     style="position: absolute; bottom: 0; right: 0; width: 40px; height: 40px; cursor: nwse-resize; z-index: 10; display: flex; align-items: end; justify-content: end; padding: 8px;">
                    <span class="material-symbols-outlined text-[#94A3B8] text-3xl rotate-45">drag_handle</span>
                </div>
            `;

            document.body.appendChild(win);

            // 绑定全局函数
            window.SPMLoadPackages = () => this.loadPackages();
            window.SPMDirectView = () => this.directViewPackage();
            window.SPMToggleToken = () => this.toggleTokenVisibility();
            window.SPMShowVersions = (type, name, repository) => this.showPackageVersions(type, name, repository);
            window.SPMLoadToEditorForVersion = (owner, type, name, version) => this.loadVersionToEditor(owner, type, name, version);

            // Material 拖拽 & 触控支持
            this.makeDraggable(win, win.querySelector('.spm-appbar'));
            this.makeResizable(win);

            setTimeout(() => this.loadPackages(), 150);
        }

        makeDraggable(el, header) {
            let posX = 0, posY = 0, startX = 0, startY = 0;

            const startDrag = (clientX, clientY) => {
                startX = clientX; startY = clientY;
                posX = el.offsetLeft; posY = el.offsetTop;
                el.style.transform = 'none';
                el.style.boxShadow = '0 30px 60px -15px rgb(91 123 151)';
            };

            const moveDrag = (clientX, clientY) => {
                el.style.left = (posX + clientX - startX) + 'px';
                el.style.top = (posY + clientY - startY) + 'px';
            };

            const endDrag = () => {
                el.style.boxShadow = '0 25px 50px -12px rgb(91 123 151 / 0.25)';
            };

            // 鼠标拖拽
            header.addEventListener('mousedown', e => {
                if (e.target.closest('button')) return;
                startDrag(e.clientX, e.clientY);
                const onMove = ev => moveDrag(ev.clientX, ev.clientY);
                const onUp = () => { endDrag(); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });

            // 触控拖拽（手机完美适配）
            header.addEventListener('touchstart', e => {
                if (e.target.closest('button')) return;
                const touch = e.touches[0];
                startDrag(touch.clientX, touch.clientY);
                const onMove = ev => {
                    const t = ev.touches[0];
                    moveDrag(t.clientX, t.clientY);
                };
                const onEnd = () => { endDrag(); document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd); };
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('touchend', onEnd);
            }, { passive: false });
        }

        makeResizable(el) {
            const handle = document.getElementById('resize-handle');
            let startX, startY, startWidth, startHeight;

            const startResize = (clientX, clientY) => {
                startX = clientX; startY = clientY;
                startWidth = parseInt(getComputedStyle(el).width);
                startHeight = parseInt(getComputedStyle(el).height);
            };

            const doResize = (clientX, clientY) => {
                let newW = Math.max(420, startWidth + (clientX - startX));
                let newH = Math.max(380, startHeight + (clientY - startY));
                el.style.width = newW + 'px';
                el.style.height = newH + 'px';
            };

            // 鼠标
            handle.addEventListener('mousedown', e => {
                e.stopImmediatePropagation();
                startResize(e.clientX, e.clientY);
                const onMove = ev => doResize(ev.clientX, ev.clientY);
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });

            // 触控
            handle.addEventListener('touchstart', e => {
                e.stopImmediatePropagation();
                const touch = e.touches[0];
                startResize(touch.clientX, touch.clientY);
                const onMove = ev => {
                    const t = ev.touches[0];
                    doResize(t.clientX, t.clientY);
                };
                const onEnd = () => {
                    document.removeEventListener('touchmove', onMove);
                    document.removeEventListener('touchend', onEnd);
                };
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('touchend', onEnd);
            }, { passive: false });
        }

        toggleTokenVisibility() {
            const inp = document.getElementById('token-input');
            const eye = document.getElementById('token-eye');
            if (inp.type === 'password') {
                inp.type = 'text';
                eye.textContent = 'visibility_off';
            } else {
                inp.type = 'password';
                eye.textContent = 'visibility';
            }
        }

        getToken() { 
            return document.getElementById('token-input').value.trim(); 
        }

        async fetchWithAuth(url) {
            const token = this.getToken();
            const headers = token ? { Authorization: `token ${token}` } : {};
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        }

        async loadPackages() {
            const owner = (document.getElementById('owner-input').value || 'deep').trim();
            const type = document.getElementById('type-select').value;
            const q = document.getElementById('search-input').value.trim();
            const container = document.getElementById('packages-container');

            container.innerHTML = `
                <div class="col-span-full py-16 flex flex-col items-center justify-center text-[#64748B]">
                    <span class="material-symbols-outlined animate-spin text-5xl mb-4">sync</span>
                    <p class="text-lg font-medium">正在加载包列表...</p>
                </div>`;

            let apiUrl = `https://spm-proxy.vercel.app/api/fetch?apiBase=scdev&path=/api/v1/packages/${owner}`;
            if (type || q) {
                const params = new URLSearchParams();
                if (type) params.append('type', type);
                if (q) params.append('q', q);
                params.append('limit', '80');
                apiUrl += '?' + params.toString();
            }

            try {
                const res = await this.fetchWithAuth(apiUrl);
                let pkgs = await res.json();
                if (!Array.isArray(pkgs)) pkgs = [pkgs];
                this.renderPackages(pkgs);
            } catch (e) {
                container.innerHTML = `
                    <div class="col-span-full py-16 flex flex-col items-center justify-center text-red-500">
                        <span class="material-symbols-outlined text-5xl mb-4">error</span>
                        <p class="font-medium text-xl">${e.message}</p>
                        <p class="text-sm mt-1 text-[#64748B]">请检查网络或令牌权限</p>
                    </div>`;
            }
        }

        renderPackages(packages) {
            const container = document.getElementById('packages-container');
            let html = '';

            packages.forEach(pkg => {
                const t = pkg.type || 'generic';
                const repo = pkg.repository ? pkg.repository.full_name : null;
                const repoLink = repo
                    ? `<a href="https://scdev.top/${repo}" target="_blank" class="text-[#5B7B97] hover:underline text-sm font-medium flex items-center gap-x-1">📍 ${repo}</a>`
                    : `<span class="text-[#94A3B8] text-sm italic">未绑定仓库</span>`;

                html += `
                <div onclick="window.SPMShowVersions('${t}', '${pkg.name}', ${repo ? `'${repo}'` : 'null'})" 
                     class="bg-white border border-[#E2E8F0] rounded-3xl p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="text-2xl font-semibold text-[#1E293B]">${pkg.name}</div>
                            <div class="flex items-center gap-3 mt-3">
                                <span class="px-4 py-1 text-xs font-medium bg-[#5B7B97]/10 text-[#5B7B97] rounded-3xl">${t.toUpperCase()}</span>
                                <span class="font-mono text-base text-[#64748B]">${pkg.version || '—'}</span>
                            </div>
                        </div>
                        <span class="material-symbols-outlined text-6xl text-[#5B7B97]/10">inventory_2</span>
                    </div>
                    <div class="mt-8 flex justify-between items-end">
                        ${repoLink}
                        <span class="material-symbols-outlined text-[#5B7B97] text-3xl">chevron_right</span>
                    </div>
                </div>`;
            });

            if (packages.length === 0) {
                html = `
                <div class="col-span-full py-20 flex flex-col items-center justify-center text-[#94A3B8]">
                    <span class="material-symbols-outlined text-6xl mb-6">folder_open</span>
                    <p class="text-2xl font-medium">没有找到包</p>
                    <p class="text-sm mt-2">尝试其他搜索条件</p>
                </div>`;
            }

            container.innerHTML = html;
        }

        async directViewPackage() {
            const val = document.getElementById('direct-input').value.trim();
            if (!val) {
                this.showToast('请输入 类型/包名', 'warning');
                return;
            }
            const [type, name] = val.split('/').map(s => s.trim());
            if (!type || !name) {
                this.showToast('格式错误，应为：类型/包名', 'warning');
                return;
            }
            this.showPackageVersions(type, name, null);
        }

        showToast(message, type = 'info') {
            const toast = document.createElement('div');
            const colors = {
                info: 'bg-[#5B7B97]',
                warning: 'bg-amber-500',
                success: 'bg-emerald-500',
                error: 'bg-red-500'
            };
            toast.style.cssText = `position:fixed;top:24px;right:24px;padding:16px 24px;border-radius:9999px;color:white;font-weight:500;box-shadow:0 10px 15px -3px rgb(0 0 0 / 0.2);transform:translateX(120%);transition:all 0.3s cubic-bezier(0.4,0,0.2,1);z-index:10000000;`;
            toast.className = colors[type];
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.style.transform = 'translateX(0)', 10);
            setTimeout(() => {
                toast.style.transform = 'translateX(120%)';
                setTimeout(() => toast.remove(), 300);
            }, 2800);
        }

        async ensureMarkdownLibraries() {
            if (window.SPMMarkdownReady) return;
            await this.loadScript('https://cdn.jsdelivr.net/npm/marked@17.0.5/lib/marked.umd.min.js');
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js');
           
            const hlStyle = document.createElement('link');
            hlStyle.rel = 'stylesheet';
            hlStyle.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css';
            document.head.appendChild(hlStyle);
            await this.loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.44/dist/katex.min.js');
            await this.loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.44/dist/contrib/auto-render.min.js');
            await this.loadScript('https://cdn.jsdelivr.net/npm/dompurify@3.3.3/dist/purify.min.js');
            if (window.marked) {
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    highlight: function(code, lang) {
                        if (window.hljs && hljs.getLanguage(lang)) {
                            return hljs.highlight(code, { language: lang }).value;
                        }
                        return window.hljs ? hljs.highlightAuto(code).value : code;
                    }
                });
            }
            window.SPMMarkdownReady = true;
        }

        loadScript(src) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        async loadRepoReadme(repoFullName) {
            const section = document.getElementById('SPM-readme-section');
            const contentEl = document.getElementById('SPM-readme-content');
            if (!section || !contentEl) return;
            section.classList.remove('hidden');
            contentEl.innerHTML = `
                <div class="text-center py-8">
                    <span class="material-symbols-outlined animate-spin text-5xl text-[#5B7B97] mb-4">sync</span>
                    <p class="text-[#64748B] font-medium">正在加载描述...</p>
                </div>`;

            await this.ensureMarkdownLibraries();

            try {
                const repoUrl = `https://spm-proxy.vercel.app/api/fetch?apiBase=scdev&path=/api/v1/repos/${repoFullName}`;
                const repoRes = await this.fetchWithAuth(repoUrl);
                const repoInfo = await repoRes.json();
                const defaultBranch = repoInfo.default_branch || 'main';
                const readmeUrl = `https://spm-proxy.vercel.app/api/fetch?apiBase=scdev&path=/${repoFullName}/raw/${defaultBranch}/README.md`;
                const readmeRes = await this.fetchWithAuth(readmeUrl);

                if (readmeRes.ok) {
                    let mdText = await readmeRes.text();
                    let rawHtml = marked.parse(mdText);
                    let cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target'] });
                    contentEl.innerHTML = cleanHtml;

                    if (window.hljs) {
                        document.querySelectorAll('#SPM-readme-content pre code').forEach(block => hljs.highlightElement(block));
                    }
                    if (window.renderMathInElement) {
                        renderMathInElement(contentEl, {
                            delimiters: [
                                {left: "$$", right: "$$", display: true},
                                {left: "$", right: "$", display: false}
                            ],
                            throwOnError: false
                        });
                    }
                } else {
                    contentEl.innerHTML = `
                        <div class="text-center py-8">
                            <span class="material-symbols-outlined text-5xl text-[#94A3B8] mb-4">description</span>
                            <p class="text-[#94A3B8] font-medium">该包暂无自述文件</p>
                        </div>`;
                }
            } catch (err) {
                contentEl.innerHTML = `
                    <div class="text-center py-8">
                        <span class="material-symbols-outlined text-5xl text-red-500 mb-4">error</span>
                        <p class="text-red-600 font-medium">加载描述失败</p>
                        <p class="text-sm text-[#64748B] mt-1">${err.message}</p>
                    </div>`;
            }
        }

        async showPackageVersions(type, name, repoFullName) {
            const owner = (document.getElementById('owner-input').value || 'deep').trim();
            let modal = document.getElementById('SPM-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'SPM-modal';
                modal.style.cssText = `
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.6);
                    z-index: 99999999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 16px;
                `;
                document.body.appendChild(modal);
            }

            modal.innerHTML = `
                <div onclick="event.stopImmediatePropagation()" 
                     class="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#E2E8F0]">
                    <div class="px-8 py-5 border-b flex items-center justify-between bg-gradient-to-r from-[#F8FAFC] to-white">
                        <div class="flex items-center gap-x-4">
                            <span class="material-symbols-outlined text-4xl text-[#5B7B97]">package_2</span>
                            <div>
                                <div class="text-3xl font-medium text-[#1E293B]">${name}</div>
                                <div class="flex items-center gap-x-3 mt-1">
                                    <span class="px-5 py-1 text-sm font-medium bg-[#5B7B97]/10 text-[#5B7B97] rounded-3xl">${type.toUpperCase()}</span>
                                    <span class="text-[#64748B]">所有者：${owner}</span>
                                </div>
                            </div>
                        </div>
                        <button onclick="document.getElementById('SPM-modal').remove()" 
                                class="w-10 h-10 flex items-center justify-center rounded-2xl hover:bg-[#F1F5F9]">
                            <span class="material-symbols-outlined text-3xl">close</span>
                        </button>
                    </div>
                   
                    <div class="flex-1 p-8 overflow-auto space-y-10" id="modal-body">
                        <div id="SPM-readme-section" class="hidden">
                            <h3 class="flex items-center gap-x-3 text-xl font-medium mb-4">
                                <span class="material-symbols-outlined">menu_book</span>
                                项目描述
                            </h3>
                            <div id="SPM-readme-content" class="prose max-w-none bg-white border border-[#E2E8F0] rounded-3xl p-8 max-h-[420px] overflow-auto"></div>
                        </div>
                        <div>
                            <h3 class="flex items-center gap-x-3 text-xl font-medium mb-6">
                                <span class="material-symbols-outlined">tag</span>
                                所有可用版本
                            </h3>
                            <div id="versions-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                        </div>
                    </div>
                </div>
            `;

            modal.addEventListener('click', e => {
                if (e.target.id === 'SPM-modal') modal.remove();
            });

            if (repoFullName) {
                this.loadRepoReadme(repoFullName);
            }

            try {
                const url = `https://spm-proxy.vercel.app/api/fetch?apiBase=scdev&path=/api/v1/packages/${owner}/${type}/${name}`;
                const res = await this.fetchWithAuth(url);
                const versions = await res.json();

                let versionsHTML = '';
                if (versions && versions.length > 0) {
                    versionsHTML = versions.map(v => `
                        <div class="bg-white border border-[#E2E8F0] rounded-3xl p-6 hover:border-[#5B7B97] hover:shadow-xl transition-all">
                            <div class="font-mono text-4xl font-semibold text-[#1E293B]">${v.version}</div>
                            <div class="text-xs text-[#94A3B8] mt-6 mb-1">创建于</div>
                            <div class="font-medium">${new Date(v.created_at).toLocaleString('zh-CN')}</div>
                            <button onclick="window.SPMLoadToEditorForVersion('${owner}','${type}','${name}','${v.version}'); event.stopImmediatePropagation()"
                                    class="mt-8 w-full h-12 bg-[#5B7B97] hover:bg-[#4A6885] text-white rounded-3xl font-medium flex items-center justify-center gap-x-2 shadow-md active:scale-95 transition-all">
                                <span class="material-symbols-outlined">download</span>
                                加载此版本到编辑器
                            </button>
                        </div>
                    `).join('');
                } else {
                    versionsHTML = `
                        <div class="col-span-full py-12 text-center">
                            <span class="material-symbols-outlined text-6xl text-[#94A3B8] mb-4">inventory_2</span>
                            <p class="text-xl font-medium text-[#94A3B8]">暂无可用版本</p>
                        </div>`;
                }
                document.getElementById('versions-container').innerHTML = versionsHTML;
            } catch (e) {
                document.getElementById('modal-body').innerHTML += `
                    <div class="rounded-3xl border border-red-200 bg-red-50 p-6">
                        <div class="flex items-center gap-3">
                            <span class="material-symbols-outlined text-red-500 text-3xl">error</span>
                            <div>
                                <div class="font-medium text-red-700">加载版本失败</div>
                                <div class="text-sm text-red-600">${e.message}</div>
                            </div>
                        </div>
                    </div>`;
            }
        }

        async loadVersionToEditor(owner, type, name, version) {
            try {
                const filesUrl = `https://spm-proxy.vercel.app/api/fetch?apiBase=scdev&path=/api/v1/packages/${owner}/${type}/${name}/${version}/files`;
                const res = await this.fetchWithAuth(filesUrl);
                const files = await res.json();
                const jsFile = files.find(f => f.name.toLowerCase().endsWith('.js'));
                if (!jsFile) {
                    this.showToast('此版本没有 .js 扩展文件', 'warning');
                    return;
                }

                const rawDownloadUrl = `https://scdev.top/api/packages/${owner}/${type}/${name}/${version}/${encodeURIComponent(jsFile.name)}`;
                const proxyUrl = `https://spm-proxy.vercel.app/api/fetch?url=${encodeURIComponent(rawDownloadUrl)}`;
                
                await Scratch.vm.extensionManager.loadExtensionURL(proxyUrl);
                this.showToast(`✅ ${jsFile.name} 已成功加载到编辑器！`, 'success');

                const modal = document.getElementById('SPM-modal');
                if (modal) modal.remove();
            } catch (e) {
                console.error('加载扩展失败:', e);
                this.showToast(`❌ 加载失败: ${e.message}`, 'error');
            }
        }
    }

    if (Scratch.extensions.unsandboxed) {
        Scratch.extensions.register(new SPMPackageBrowser());
        console.log('📦 SPM 包浏览器（Material UI + 手机触控适配）已加载！');
    } else {
        console.error('必须以 unsandboxed 方式加载此扩展！');
    }
})();