// Name: GitHub 面板
// ID: githubpanel
// Description: 利用githubAPI互交
// By: yuan <https://www.ccw.site/student/687f6ba9fc898317568cdc8d>
// License: MIT


// ==================== 模块定义 ====================

// 工具模块
class Utils {
  static btnStyle() {
    return {
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '6px',
      color: '#fff',
      padding: '6px 10px',
      cursor: 'pointer',
      fontSize: '12px'
    };
  }
  static itemStyle() {
    return {
      padding: '10px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      marginBottom: '8px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '6px',
      position: 'relative'
    };
  }
  static input(placeholder) {
    const i = document.createElement('input');
    i.placeholder = placeholder;
    Object.assign(i.style, {
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid #555',
      color: '#fff',
      padding: '6px',
      borderRadius: '4px'
    });
    return i;
  }
  static select(options, label) {
    const d = document.createElement('div');
    d.style.display = 'flex';
    d.style.flexDirection = 'column';
    const l = document.createElement('label');
    l.textContent = label;
    l.style.fontSize = '10px';
    l.style.opacity = '0.7';
    const s = document.createElement('select');
    Object.assign(s.style, {
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid #555',
      color: '#fff',
      borderRadius: '4px',
      padding: '4px'
    });
    options.forEach(o => {
      const op = document.createElement('option');
      op.value = o.value || o;
      op.textContent = o.text || o;
      s.appendChild(op);
    });
    d.appendChild(l);
    d.appendChild(s);
    return {
      el: d,
      sel: s
    };
  }
  static applySelectLabels(sel, map) {
    Array.from(sel.options).forEach(o => {
      if (map[o.value]) o.textContent = map[o.value];
    });
  }
  static copyToClipboard(text) {
    return navigator.clipboard.writeText(text);
  }
  static download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  static parseMarkdown(text, owner, repo, branch) {
    if (!text) return '';
    if (owner && repo) {
      const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}`;
      text = text.replace(/!\[([^\]]*)\]\((?!http|#)([^)]+)\)/g, (match, alt, path) => {
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `![${alt}](${rawBase}/${cleanPath})`;
      });
    }
    const codeBlocks = [];
    text = text.replace(/```([\s\S]*?)```/g, (match, code) => {
      codeBlocks.push(code);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });
    const tableRegex = /\|(.+)\|\n\|([-:| ]+)\|(\n(?:\|.*\|\n?)*)/g;
    text = text.replace(tableRegex, (match, header, separator, body) => {
      const headers = header.split('|').map(h => h.trim()).filter(h => h);
      const rows = body.trim().split('\n').map(row => {
        return row.split('|').map(c => c.trim()).filter(c => c);
      });
      let html = '<table style="border-collapse:collapse;width:100%;margin:10px 0;border:1px solid #555;">';
      html += '<thead><tr style="background:rgba(255,255,255,0.1)">';
      headers.forEach(h => html += `<th style="border:1px solid #555;padding:6px;">${h}</th>`);
      html += `</td></thead><tbody>`;
      rows.forEach(row => {
        html += '<tr>';
        row.forEach((cell, i) => {
          if (i < headers.length) html += `<td style="border:1px solid #555;padding:6px;">${cell}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table>';
      return html;
    });
    text = text.replace(/^# (.*$)/gim, '<h3>$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h4>$1</h4>');
    text = text.replace(/^### (.*$)/gim, '<h5>$1</h5>');
    text = text.replace(/\*\*(.*)\*\*/gim, '<b>$1</b>');
    text = text.replace(/\*(.*)\*/gim, '<i>$1</i>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" style="color:#8af">$1</a>');
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" style="max-width:100%;border-radius:4px;margin:5px 0;">');
    text = text.replace(/^\s*-\s+(.*)/gim, '<li>$1</li>');
    text = text.replace(/^>\s+(.*)/gim, '<blockquote style="border-left:3px solid #555;padding-left:10px;opacity:0.8">$1</blockquote>');
    text = text.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
      return `<pre style="background:#333;padding:5px;border-radius:4px;overflow-x:auto"><code>${codeBlocks[index]}</code></pre>`;
    });
    text = text.replace(/\n/g, '<br>');
    return text;
  }
}

// 错误处理模块
class ErrorHandler {
  static handle(error, context = '') {
    const message = error.message || String(error);
    console.error(`[GitHubPanel] ${context}:`, error);
    LoadingManager.setError(`${context}: ${message}`);
    return message;
  }
  static assertToken(token) {
    if (!token) throw new Error('GitHub Token 未设置');
  }
  static assertRepo(owner, repo) {
    if (!owner || !repo) throw new Error('请先进入一个仓库');
  }
  static assert(condition, msg) {
    if (!condition) throw new Error(msg);
  }
}

// 加载状态管理模块
class LoadingManager {
  static statusLabel = null;
  static currentMessage = '就绪';
  static isError = false;

  static init(label) {
    this.statusLabel = label;
  }

  static setMessage(msg) {
    this.currentMessage = msg;
    this.isError = false;
    this.render();
  }

  static setError(msg) {
    this.currentMessage = msg;
    this.isError = true;
    this.render();
  }

  static render() {
    if (!this.statusLabel) return;
    this.statusLabel.textContent = this.currentMessage;
    this.statusLabel.style.color = this.isError ? '#ff8888' : '#fff';
  }
}

// 缓存模块
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = 15000;
    this.repoTextCache = new Map();
    this.repoCacheSelection = new Set();
    this.repoCacheMeta = {
      owner: '',
      repo: '',
      t: 0,
      files: 0,
      bytes: 0,
      truncated: false
    };
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.t > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      t: Date.now(),
      data
    });
  }

  clearRepoCache() {
    this.repoTextCache.clear();
    this.repoCacheSelection.clear();
    this.repoCacheMeta = {
      owner: '',
      repo: '',
      t: 0,
      files: 0,
      bytes: 0,
      truncated: false
    };
  }

  buildContext(maxChars = 120000) {
    if (!this.repoCacheMeta.owner) return '';
    let out = '';
    const entries = Array.from(this.repoTextCache.entries())
      .filter(([path, v]) => v && v.type === 'file' && typeof v.text === 'string' && this.repoCacheSelection.has(path))
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (entries.length === 0) return '';
    for (const [path, v] of entries) {
      const block = `\n\n== FILE: ${path} ==\n${v.text}\n`;
      if (out.length + block.length > maxChars) {
        out += `\n\n[CONTEXT TRUNCATED: reached ${maxChars} chars]\n`;
        break;
      }
      out += block;
    }
    return out.trim();
  }
}

// API模块
class APIManager {
  constructor(token) {
    this.token = token;
  }

  get headers() {
    return this.token ? {
      'Authorization': `token ${this.token}`
    } : {};
  }

  async fetchJson(url) {
    const cached = CacheManager.instance?.get(url);
    if (cached) return cached;

    try {
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github+json',
          ...this.headers
        }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (CacheManager.instance) CacheManager.instance.set(url, data);
      return data;
    } catch (error) {
      throw new Error(`API请求失败: ${error.message}`);
    }
  }

  async fetchBlob(owner, repo, sha) {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.raw',
        ...this.headers
      }
    });
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
    return await res.blob();
  }

  async putFile(owner, repo, path, content, message, branch, sha = null) {
    ErrorHandler.assertToken(this.token);
    const body = {
      message: message,
      content: content,
      branch: branch
    };
    if (sha) body.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Put failed');
    return await res.json();
  }

  async deleteFile(owner, repo, path, sha, branch, message) {
    ErrorHandler.assertToken(this.token);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify({
        message,
        sha,
        branch
      })
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Delete failed');
  }

  async triggerWorkflow(owner, repo, workflowId, branch) {
    ErrorHandler.assertToken(this.token);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify({
        ref: branch
      })
    });
    if (!res.ok) throw new Error(`触发失败: ${res.status}`);
  }

  async mergeBranch(owner, repo, base, head, message) {
    ErrorHandler.assertToken(this.token);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/merges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify({
        base,
        head,
        commit_message: message
      })
    });
    return res;
  }

  async forkRepo(owner, repo) {
    ErrorHandler.assertToken(this.token);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/forks`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        ...this.headers
      }
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Fork failed');
    return await res.json();
  }

  async createPullRequest(owner, repo, title, head, base, bodyText) {
    ErrorHandler.assertToken(this.token);
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers
      },
      body: JSON.stringify({
        title,
        head,
        base,
        body: bodyText
      })
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Create PR failed');
    return await res.json();
  }
}

// AI模块
class AIManager {
  constructor(config) {
    this.config = config;
    this.abortController = null;
    this.streamBuffer = '';
    this.isStreaming = false;
    this.streamError = null;
  }

  get provider() {
    return this.config.aiProvider;
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isStreaming = false;
  }

  async stream(messages, onChunk) {
    this.abort();
    this.abortController = new AbortController();
    this.streamBuffer = '';
    this.isStreaming = true;
    this.streamError = null;

    try {
      const {
        url,
        headers,
        body
      } = this._prepareRequest(messages);
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API 错误 (${response.status}): ${errorText.slice(0, 100)}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, {
          stream: true
        });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                this.streamBuffer += content;
                onChunk(content);
              }
            } catch (e) {
              console.warn('解析流式数据失败:', e);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.streamError = null;
        throw error;
      } else {
        this.streamError = error.message;
        throw error;
      }
    } finally {
      this.isStreaming = false;
      this.abortController = null;
    }
  }

  _prepareRequest(messages) {
    if (this.provider === 'github') {
      ErrorHandler.assertToken(this.config.token);
      return {
        url: 'https://models.inference.ai.azure.com/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.token}`
        },
        body: {
          model: this.config.githubModel.replace('custom:', ''),
          messages: messages,
          stream: true
        }
      };
    } else if (this.provider === 'custom') {
      if (!this.config.customAI.url || !this.config.customAI.key) {
        throw new Error('自定义 AI URL 或 Key 未设置');
      }
      return {
        url: this.config.customAI.url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.customAI.key}`
        },
        body: {
          model: this.config.customAI.model,
          messages: messages,
          stream: true
        }
      };
    }
    throw new Error('未知的AI提供商');
  }
}

// 虚拟滚动模块 (仅用于固定高度列表，如文件树、日志)
class VirtualScroller {
  constructor(container, itemHeight = 60, buffer = 5) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.buffer = buffer;
    this.items = [];
    this.visibleItems = [];
    this.startIndex = 0;
    this.endIndex = 0;
    this.scrollTop = 0;
    this.height = 0;

    this.viewport = document.createElement('div');
    this.viewport.style.overflowY = 'auto';
    this.viewport.style.height = '100%';
    this.viewport.style.position = 'relative';

    this.content = document.createElement('div');
    this.content.style.position = 'relative';
    this.content.style.width = '100%';

    this.viewport.appendChild(this.content);
    this.container.appendChild(this.viewport);

    this.viewport.addEventListener('scroll', () => this._onScroll());
  }

  setItems(items, renderFn) {
    this.items = items;
    this.renderFn = renderFn;
    this._updateDimensions();
    this._render();
  }

  _updateDimensions() {
    this.height = this.items.length * this.itemHeight;
    this.content.style.height = `${this.height}px`;
  }

  _onScroll() {
    this.scrollTop = this.viewport.scrollTop;
    this._render();
  }

  _render() {
    const viewportHeight = this.viewport.clientHeight;
    const scrollTop = this.scrollTop;

    const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.buffer);
    const end = Math.min(this.items.length, Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.buffer);

    if (start === this.startIndex && end === this.endIndex) return;

    this.startIndex = start;
    this.endIndex = end;

    this.content.innerHTML = '';
    const fragment = document.createElement('div');
    fragment.style.position = 'absolute';
    fragment.style.top = `${start * this.itemHeight}px`;
    fragment.style.left = '0';
    fragment.style.right = '0';

    for (let i = start; i < end; i++) {
      const item = this.items[i];
      const el = this.renderFn(item, i);
      el.style.height = `${this.itemHeight}px`;
      el.style.boxSizing = 'border-box';
      fragment.appendChild(el);
    }

    this.content.appendChild(fragment);
  }

  scrollToIndex(index) {
    this.viewport.scrollTop = index * this.itemHeight;
  }

  destroy() {
    this.viewport.removeEventListener('scroll', this._onScroll);
    this.container.innerHTML = '';
  }
}

// UI组件模块
class UIComponents {
  static createPanel() {
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed',
      left: '16px',
      top: '16px',
      width: '720px',
      height: '740px',
      zIndex: 99999,
      background: 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '12px',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'none',
      boxSizing: 'border-box',
      padding: '10px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
    });
    return panel;
  }

  static createHeader(titleText) {
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'move',
      userSelect: 'none',
      marginBottom: '8px'
    });

    const title = document.createElement('div');
    title.textContent = titleText;
    Object.assign(title.style, {
      fontSize: '14px',
      fontWeight: '700',
      paddingLeft: '4px'
    });

    const winCtrls = document.createElement('div');
    Object.assign(winCtrls.style, {
      display: 'flex',
      gap: '6px'
    });

    header.appendChild(title);
    header.appendChild(winCtrls);
    return {
      header,
      winCtrls
    };
  }

  static createWindowButton(text, style = {}) {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, Utils.btnStyle(), style);
    return btn;
  }

  static createTabs() {
    const tabs = document.createElement('div');
    Object.assign(tabs.style, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: '10px'
    });
    return tabs;
  }

  static createTabButton(text, active = false) {
    const btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, Utils.btnStyle());
    if (active) btn.style.background = 'rgba(255,255,255,0.25)';
    return btn;
  }

  static createMainArea() {
    const main = document.createElement('div');
    Object.assign(main.style, {
      flex: '1',
      overflowY: 'auto',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px',
      background: 'rgba(0,0,0,0.2)',
      padding: '0'
    });
    return main;
  }

  static createStatusLabel() {
    const status = document.createElement('div');
    Object.assign(status.style, {
      fontSize: '12px',
      opacity: '0.9',
      margin: '8px 0',
      minHeight: '1.2em'
    });
    status.textContent = '就绪';
    return status;
  }

  static injectMarketplaceCSS() {
    if (document.getElementById('pmk2-styles')) return;
    const style = document.createElement('style');
    style.id = 'pmk2-styles';
    style.textContent = `
/* ===== Marketplace Floating Window ===== */
.pmk2-overlay{
  position:fixed; inset:0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  z-index: 100500;
  display:none;
  align-items:center;
  justify-content:center;
}
.pmk2-win{
  width: 860px;
  max-width: calc(100vw - 32px);
  height: 640px;
  max-height: calc(100vh - 32px);
  background: rgba(18,18,18,0.92);
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 14px;
  box-shadow: 0 14px 60px rgba(0,0,0,0.65);
  display:flex;
  flex-direction:column;
  overflow:hidden;
  color:#fff;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
.pmk2-titlebar{
  display:flex;
  align-items:center;
  gap:10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.10);
  background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
  user-select:none;
  cursor: move;
}
.pmk2-title{
  font-weight:800;
  letter-spacing: 0.2px;
}
.pmk2-subtitle{
  font-size: 12px;
  opacity: 0.7;
}
.pmk2-spacer{ flex:1; }

.pmk2-btn{
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color:#fff;
  padding: 7px 10px;
  font-size: 12px;
  cursor:pointer;
}
.pmk2-btn:hover{ background: rgba(255,255,255,0.12); }
.pmk2-btn:disabled{ opacity:0.6; cursor:not-allowed; }
.pmk2-btn-primary{
  background: rgba(40,167,69,0.85);
  border-color: rgba(40,167,69,0.9);
}
.pmk2-btn-primary:hover{ background: rgba(40,167,69,0.95); }
.pmk2-btn-blue{
  background: rgba(60,160,255,0.22);
  border-color: rgba(60,160,255,0.28);
}
.pmk2-btn-blue:hover{ background: rgba(60,160,255,0.30); }
.pmk2-btn-danger{
  background: rgba(255,80,80,0.20);
  border-color: rgba(255,80,80,0.25);
}
.pmk2-btn-danger:hover{ background: rgba(255,80,80,0.28); }

.pmk2-body{
  display:flex;
  flex:1;
  min-height:0;
}
.pmk2-left{
  width: 280px;
  border-right: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.03);
  padding: 12px;
  display:flex;
  flex-direction:column;
  gap: 10px;
}
.pmk2-right{
  flex:1;
  min-width:0;
  padding: 12px;
  display:flex;
  flex-direction:column;
  gap: 10px;
}
.pmk2-field label{
  display:block;
  font-size: 11px;
  opacity: 0.75;
  margin-bottom: 6px;
}
.pmk2-input{
  width:100%;
  box-sizing:border-box;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.30);
  color:#fff;
  padding: 8px 10px;
  font-size: 12px;
  outline: none;
}
.pmk2-input:focus{
  border-color: rgba(60,160,255,0.45);
  box-shadow: 0 0 0 3px rgba(60,160,255,0.12);
}
.pmk2-hint{
  font-size: 11px;
  opacity: 0.68;
  line-height: 1.35;
}
.pmk2-status{
  font-size: 12px;
  opacity: 0.9;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.22);
}
.pmk2-list{
  flex:1;
  min-height:0;
  overflow:auto;
  padding-right: 4px;
}
.pmk2-item{
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 10px;
  margin-bottom: 10px;
}
.pmk2-itemtop{
  display:flex;
  gap: 10px;
  align-items:flex-start;
}
.pmk2-itemtext{
  flex:1;
  min-width: 0;
}
.pmk2-itemname{
  font-weight: 800;
  word-break: break-word;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pmk2-itemmeta{
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
  word-break: break-word;
  white-space: normal;
}
.pmk2-itembtns{
  margin-left:8px;
  display:flex;
  flex-direction:column;
  gap: 6px;
  flex-shrink: 0;
}
.pmk2-empty{
  opacity:0.7;
  font-size:12px;
  padding: 12px;
  border: 1px dashed rgba(255,255,255,0.18);
  border-radius: 12px;
}
.pmk2-kbd{
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(0,0,0,0.25);
  opacity: 0.85;
}
.pmk2-tag{
  display: inline-block;
  background: rgba(60,160,255,0.2);
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
  margin-right: 6px;
  margin-top: 6px;
  border: 1px solid rgba(60,160,255,0.3);
}
.pmk2-description{
  font-size: 12px;
  opacity: 0.85;
  margin-top: 6px;
  line-height: 1.4;
}
`;
    document.head.appendChild(style);
  }
}

// 插件管理模块
class PluginManager {
  constructor(extension) {
    this.extension = extension;
    this.plugins = new Map();
    this.hooks = new Map();
    this._loadFromStorage();
  }

  get context() {
    return {
      core: this.extension.core,
      ui: this.extension.ui,
      api: this.extension.core.apiManager,
      utils: Utils,
      components: UIComponents,
      extension: this.extension,
      manager: this
    };
  }

  _loadFromStorage() {
    try {
      const saved = localStorage.getItem('github_panel_storage');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.plugins) {
          data.plugins.forEach(p => {
            if (p.enabled) this.loadPlugin(p.code, p.id, false);
          });
        }
        if (data.token) {
          this.extension.core.token = data.token;
          this.extension.core.updateAIConfig();
        }
      }
    } catch (e) {
      console.error('Failed to load from storage', e);
    }
  }

  _saveToStorage() {
    const list = [];
    this.plugins.forEach((p, id) => {
      list.push({
        id,
        code: p.code,
        enabled: true
      });
    });
    const data = {
      token: this.extension.core.token,
      plugins: list
    };
    localStorage.setItem('github_panel_storage', JSON.stringify(data));
  }

  async loadPlugin(code, id = null, save = true) {
    if (save) {
      const warnMsg = "【安全警告】\n将加载外部插件！\n插件 API 系统已 100% 暴露内部核心权限 (Token, 网络请求, 弹窗控制等)。\n继续加载未知插件可能导致数据损坏或隐私泄露。\n出现问题概不负责！\n\n确定要继续加载吗？";
      if (!confirm(warnMsg)) return;
    }

    try {
      const pluginFactory = new Function('context', `
       const { core, ui, api, utils, components, extension, manager } = context;
       const plugin = {
         id: "${id || 'temp-' + Date.now()}",
         name: "Unknown Plugin",
         version: "0.0.1",
         description: "",
         tags: [],
         init: () => {},
         onHook: () => {},
         style: ""
       };
       ${code}
       return plugin;
     `);

      const plugin = pluginFactory(this.context);
      if (!plugin.id) throw new Error('Plugin must have an ID');

      if (plugin.style) {
        const style = document.createElement('style');
        style.id = `plugin-style-${plugin.id}`;
        style.textContent = plugin.style;
        document.head.appendChild(style);
        plugin._styleEl = style;
      }

      if (plugin.init) plugin.init(this.context);

      plugin.code = code;
      this.plugins.set(plugin.id, plugin);
      if (save) this._saveToStorage();

      console.log(`Plugin loaded: ${plugin.name} (${plugin.id})`);
      return plugin;
    } catch (e) {
      ErrorHandler.handle(e, '加载插件');
      throw e;
    }
  }

  unloadPlugin(id) {
    const p = this.plugins.get(id);
    if (!p) return;
    if (p._styleEl) p._styleEl.remove();
    this.plugins.delete(id);
    this._saveToStorage();
    console.log(`Plugin unloaded: ${id}`);
  }

  trigger(hookName, data) {
    this.plugins.forEach(p => {
      if (p.onHook) {
        try {
          p.onHook(hookName, data);
        } catch (e) {
          console.error(`Plugin ${p.id} hook error:`, e);
        }
      }
    });
  }

  async importFromGitHub(url) {
    let targetUrl = url;
    if (!url.includes('raw.githubusercontent.com')) {
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/(?:blob|tree)\/([^\/]+)\/(.+)/);
      if (match) {
        const [_, owner, repo, branch, path] = match;
        if (path.endsWith('.js')) {
          targetUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
        } else {
          targetUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path.replace(/\/$/, '')}/plugin.js`;
        }
      }
    }

    LoadingManager.setMessage(`Fetching plugin from ${targetUrl}...`);
    const res = await fetch(targetUrl);
    if (!res.ok) throw new Error(`Failed to fetch plugin: ${res.status}`);
    const code = await res.text();
    await this.loadPlugin(code);
    LoadingManager.setMessage('Plugin imported successfully.');
  }
}

// 核心逻辑模块
class GitHubPanelCore {
  constructor() {
    this.token = '';
    this.aiProvider = 'github';
    this.customAI = {
      url: 'https://api.openai.com/v1/chat/completions',
      key: '',
      model: 'gpt-3.5-turbo'
    };
    this.githubModel = 'gpt-4o';

    this.currentOwner = '';
    this.currentRepo = '';
    this.currentPath = '';
    this.currentBranch = '';
    this.defaultBranch = 'main';
    this.viewMode = 'list';
    this.isEditMode = false;
    this.currentFileSha = null;

    this.panelMode = 'normal';
    this.mode = 'search';
    this.searchDir = 'repo';

    this.repoSearchPage = 1;
    this.userSearchPage = 1;
    this.orgSearchPage = 1;

    this._objectUrlToRevoke = null;
    this._repoCacheAbort = false;

    this.lastSelection = {
      start: 0,
      end: 0
    };
    this.isMarkdownPreview = true;

    // Marketplace state
    this.marketplaceState = {
      owner: "13244431027",
      repo: "3",
      branch: "main",
      dir: "me/github/插件",
      items: [],
      lastLoadedAt: 0,
      searchKeyword: ""
    };

    this.cacheManager = new CacheManager();
    CacheManager.instance = this.cacheManager;

    this.apiManager = new APIManager(this.token);
    this.aiManager = new AIManager(this.getAIConfig());
  }

  getAIConfig() {
    return {
      token: this.token,
      aiProvider: this.aiProvider,
      githubModel: this.githubModel,
      customAI: this.customAI
    };
  }

  updateAIConfig() {
    this.apiManager.token = this.token;
    this.aiManager.config = this.getAIConfig();
  }

  setToken(token) {
    this.token = token;
    this.updateAIConfig();
    this.pluginManager._saveToStorage();
  }

  setAIProvider(provider) {
    this.aiProvider = provider;
    this.updateAIConfig();
  }

  _revokeObjectUrl() {
    if (this._objectUrlToRevoke) {
      URL.revokeObjectURL(this._objectUrlToRevoke);
      this._objectUrlToRevoke = null;
    }
  }
}

// ==================== 主扩展类 ====================

class GitHubPanelExtension {
  constructor() {
    this.core = new GitHubPanelCore();
    this.ui = {
      marketplace: null
    };
    this.virtualScrollers = new Map();
    this.pluginManager = new PluginManager(this);
    this.core.pluginManager = this.pluginManager;
    // 自动加载补丁插件（非阻塞）
    this._autoLoadPatchPlugin().catch(e => console.error('自动加载补丁插件失败:', e));
  }

  getInfo() {
    return {
      id: 'githubpanel',
      name: 'GitHub 面板',
      blocks: [{
        opcode: 'showPanel',
        blockType: Scratch.BlockType.COMMAND,
        text: '显示面板'
      }, {
        opcode: 'hidePanel',
        blockType: Scratch.BlockType.COMMAND,
        text: '隐藏面板'
      }, {
        opcode: 'setToken',
        blockType: Scratch.BlockType.COMMAND,
        text: 'GitHub 令牌为 [TOKEN]',
        arguments: {
          TOKEN: {
            type: Scratch.ArgumentType.STRING,
            defaultValue: ''
          }
        }
      }, {
        opcode: 'setAIProvider',
        blockType: Scratch.BlockType.COMMAND,
        text: '设置 AI 提供商为 [PROVIDER]',
        arguments: {
          PROVIDER: {
            type: Scratch.ArgumentType.STRING,
            menu: 'aiProviders',
            defaultValue: 'github'
          }
        }
      }],
      menus: {
        aiProviders: {
          acceptReporters: true,
          items: [{
            text: 'GitHub',
            value: 'github'
          }, {
            text: '自定义',
            value: 'custom'
          }]
        }
      }
    };
  }

  showPanel() {
    if (!this.ui.panel) this._createUI();
    this.ui.panel.style.display = 'block';
    this.core.panelMode = 'normal';
    this._applyPanelMode();
    this._switchMode(this.core.mode);
    this.pluginManager.trigger('ui:show');
  }

  hidePanel() {
    this.core._revokeObjectUrl();
    this.core.aiManager.abort();
    this.core._repoCacheAbort = true;
    if (this.ui.panel) this.ui.panel.style.display = 'none';
    this._closeMarketplace();
    this.virtualScrollers.forEach(vs => vs.destroy());
    this.virtualScrollers.clear();
    this.pluginManager.trigger('ui:hide');
  }

  setToken(args) {
    this.core.setToken(String(args.TOKEN || '').trim());
    LoadingManager.setMessage(this.core.token ? 'GitHub Token 已设置' : '未设置 Token');
  }

  setAIProvider(args) {
    this.core.setAIProvider(args.PROVIDER);
  }

  // ==================== 补丁插件自动加载 ====================
  async _autoLoadPatchPlugin() {
    // 防止重复加载
    if (this._patchLoaded) return;
    this._patchLoaded = true;

    const PATCH_URL = 'https://raw.githubusercontent.com/13244431027/3/refs/heads/main/me/github/%E6%8F%92%E4%BB%B6/V4%E8%A1%A5%E4%B8%81.js';

    try {
      // 1. 提示用户是否加载补丁插件
      const userConfirmed = confirm(
        '检测到可用补丁插件 (V4补丁)\n\n' +
        '该插件用于修复已知问题或增强功能。\n' +
        '加载插件存在安全风险，请确保来源可信。\n\n' +
        '是否确定加载？'
      );
      if (!userConfirmed) return;

      // 2. 获取插件代码
      LoadingManager.setMessage('正在获取补丁插件...');
      const response = await fetch(PATCH_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const code = await response.text();

      // 3. 提取插件 ID（用于卸载旧版本）
      let pluginId = null;
      const idMatch = code.match(/plugin\.id\s*=\s*["']([^"']+)["']/);
      if (idMatch) pluginId = idMatch[1];
      else console.warn('无法从补丁代码中提取 plugin.id，将跳过卸载步骤');

      // 4. 如果已存在同 ID 插件，先卸载
      if (pluginId && this.pluginManager.plugins.has(pluginId)) {
        console.log(`卸载旧版补丁插件: ${pluginId}`);
        this.pluginManager.unloadPlugin(pluginId);
        // 等待一小段时间确保卸载完成（样式移除等）
        await new Promise(r => setTimeout(r, 100));
      }

      // 5. 加载新插件（复用插件管理器的加载逻辑，会弹出安全警告）
      LoadingManager.setMessage('正在加载补丁插件...');
      await this.pluginManager.loadPlugin(code, null, true);
      LoadingManager.setMessage('补丁插件加载成功');
      console.log('补丁插件已自动加载');
    } catch (error) {
      console.error('自动加载补丁插件失败:', error);
      LoadingManager.setError(`补丁插件加载失败: ${error.message}`);
    }
  }

  // ==================== UI创建 ====================

  _createUI() {
    UIComponents.injectMarketplaceCSS();

    this.ui.panel = UIComponents.createPanel();

    const {
      header,
      winCtrls
    } = UIComponents.createHeader('GitHub 面板 Pro+');
    this.ui.header = header;

    const minBtn = UIComponents.createWindowButton('_', {
      width: '28px',
      padding: '4px 0'
    });
    const fullBtn = UIComponents.createWindowButton('□', {
      width: '28px',
      padding: '4px 0'
    });
    const closeBtn = UIComponents.createWindowButton('×', {
      width: '28px',
      padding: '4px 0',
      background: 'rgba(255, 80, 80, 0.4)'
    });

    minBtn.onclick = (e) => {
      e.stopPropagation();
      this._toggleMinimize();
    };
    fullBtn.onclick = (e) => {
      e.stopPropagation();
      this._toggleFullscreen();
    };
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      this.hidePanel();
    };

    winCtrls.appendChild(minBtn);
    winCtrls.appendChild(fullBtn);
    winCtrls.appendChild(closeBtn);

    this.ui.btnMinimize = minBtn;
    this.ui.btnFullscreen = fullBtn;
    this.ui.btnClose = closeBtn;

    let drag = {
      on: false,
      x: 0,
      y: 0,
      left: 16,
      top: 16
    };
    header.addEventListener('mousedown', (e) => {
      if (this.core.panelMode === 'fullscreen') return;
      const t = e.target.tagName.toLowerCase();
      if (['button', 'input', 'select', 'textarea', 'a'].includes(t)) return;
      drag.on = true;
      const r = this.ui.panel.getBoundingClientRect();
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.left = r.left;
      drag.top = r.top;
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag.on || !this.ui.panel) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      this.ui.panel.style.left = (drag.left + dx) + 'px';
      this.ui.panel.style.top = (drag.top + dy) + 'px';
    });
    window.addEventListener('mouseup', () => drag.on = false);

    this.ui.tabs = UIComponents.createTabs();
    this.ui.tabSearchBtn = UIComponents.createTabButton('搜索', true);
    this.ui.tabBrowseBtn = UIComponents.createTabButton('浏览');
    this.ui.tabTrendingBtn = UIComponents.createTabButton('推荐');
    this.ui.tabMyBtn = UIComponents.createTabButton('我的');
    this.ui.tabAIBtn = UIComponents.createTabButton('AI');
    this.ui.tabPluginsBtn = UIComponents.createTabButton('🧩 插件');

    const marketplaceBtn = UIComponents.createWindowButton("插件集市", {
      background: "rgba(160,120,255,0.22)",
      border: "1px solid rgba(160,120,255,0.28)",
      borderRadius: "10px"
    });
    marketplaceBtn.onclick = () => this._openMarketplace();

    const dirSel = Utils.select(['repo', 'user', 'org'], '搜索方向');
    Object.assign(dirSel.el.style, {
      marginLeft: 'auto',
      minWidth: '180px'
    });
    dirSel.sel.onchange = () => this._switchSearchDir(dirSel.sel.value);

    this.ui.tabs.appendChild(this.ui.tabSearchBtn);
    this.ui.tabs.appendChild(this.ui.tabBrowseBtn);
    this.ui.tabs.appendChild(this.ui.tabTrendingBtn);
    this.ui.tabs.appendChild(this.ui.tabMyBtn);
    this.ui.tabs.appendChild(this.ui.tabAIBtn);
    this.ui.tabs.appendChild(this.ui.tabPluginsBtn);
    this.ui.tabs.appendChild(marketplaceBtn);
    this.ui.tabs.appendChild(dirSel.el);

    this.ui.searchDirSelectWrap = dirSel.el;
    this.ui.searchDirSelect = dirSel.sel;

    this.ui.searchArea = this._createSearchArea();
    this.ui.browseArea = this._createBrowseArea();
    this.ui.aiArea = this._createAIArea();
    this.ui.trendingArea = this._createTrendingArea();
    this.ui.myArea = this._createMyArea();
    this.ui.pluginsArea = this._createPluginsArea();

    this.ui.statusLabel = UIComponents.createStatusLabel();
    LoadingManager.init(this.ui.statusLabel);

    this.ui.mainArea = UIComponents.createMainArea();

    const contentWrap = document.createElement('div');
    Object.assign(contentWrap.style, {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%'
    });

    const bodyWrap = document.createElement('div');
    Object.assign(bodyWrap.style, {
      display: 'flex',
      flexDirection: 'column',
      flex: '1',
      overflow: 'hidden'
    });

    bodyWrap.appendChild(this.ui.tabs);
    bodyWrap.appendChild(this.ui.searchArea);
    bodyWrap.appendChild(this.ui.browseArea);
    bodyWrap.appendChild(this.ui.aiArea);
    bodyWrap.appendChild(this.ui.trendingArea);
    bodyWrap.appendChild(this.ui.myArea);
    bodyWrap.appendChild(this.ui.pluginsArea);
    bodyWrap.appendChild(this.ui.statusLabel);
    bodyWrap.appendChild(this.ui.mainArea);

    contentWrap.appendChild(header);
    contentWrap.appendChild(bodyWrap);
    this.ui.panel.appendChild(contentWrap);

    document.body.appendChild(this.ui.panel);
    this.ui._panelBody = bodyWrap;

    this._createMarketplaceUI();

    this._bindEvents();
    this.pluginManager.trigger('ui:ready', this.ui);
  }

  // ==================== Marketplace Logic Integration (Enhanced) ====================

  _createMarketplaceUI() {
    if (this.ui.marketplace && this.ui.marketplace.overlay) return;

    const overlay = document.createElement("div");
    overlay.className = "pmk2-overlay";

    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) this._closeMarketplace();
    });

    const win = document.createElement("div");
    win.className = "pmk2-win";

    const titlebar = document.createElement("div");
    titlebar.className = "pmk2-titlebar";

    const title = document.createElement("div");
    title.innerHTML = `<div class="pmk2-title">插件集市</div><div class="pmk2-subtitle">从 GitHub 目录加载 .js（自动忽略 README.md）</div>`;

    const spacer = document.createElement("div");
    spacer.className = "pmk2-spacer";

    const btnReload = document.createElement("button");
    btnReload.className = "pmk2-btn pmk2-btn-blue";
    btnReload.textContent = "刷新";

    const btnOpenDir = document.createElement("button");
    btnOpenDir.className = "pmk2-btn";
    btnOpenDir.textContent = "打开目录";

    const btnClose = document.createElement("button");
    btnClose.className = "pmk2-btn pmk2-btn-danger";
    btnClose.textContent = "关闭";

    titlebar.appendChild(title);
    titlebar.appendChild(spacer);
    titlebar.appendChild(btnReload);
    titlebar.appendChild(btnOpenDir);
    titlebar.appendChild(btnClose);

    const body = document.createElement("div");
    body.className = "pmk2-body";

    const left = document.createElement("div");
    left.className = "pmk2-left";

    const right = document.createElement("div");
    right.className = "pmk2-right";

    const mkState = this.core.marketplaceState;
    const fOwner = this._createMarketField("Owner", mkState.owner);
    const fRepo = this._createMarketField("Repo", mkState.repo);
    const fBranch = this._createMarketField("Branch", mkState.branch);
    const fDir = this._createMarketField("目录 Path", mkState.dir);

    // 新增搜索框
    const searchField = document.createElement("div");
    searchField.className = "pmk2-field";
    const searchLabel = document.createElement("label");
    searchLabel.textContent = "🔍 搜索插件";
    const searchInput = document.createElement("input");
    searchInput.className = "pmk2-input";
    searchInput.placeholder = "按名称、简介或标签搜索...";
    searchInput.value = mkState.searchKeyword || "";
    searchInput.addEventListener("input", (e) => {
      this.core.marketplaceState.searchKeyword = e.target.value;
      this._renderMarketList();
    });
    searchField.appendChild(searchLabel);
    searchField.appendChild(searchInput);

    const hint = document.createElement("div");
    hint.className = "pmk2-hint";
    hint.innerHTML = `
    安装时会调用扩展自带的"加载插件"流程（会弹出安全确认）。
  `;

    const status = document.createElement("div");
    status.className = "pmk2-status";
    status.textContent = "未加载";

    const btnSaveCfg = document.createElement("button");
    btnSaveCfg.className = "pmk2-btn";
    btnSaveCfg.textContent = "应用配置";

    const btnLoad = document.createElement("button");
    btnLoad.className = "pmk2-btn pmk2-btn-blue";
    btnLoad.textContent = "加载列表";

    left.appendChild(fOwner.wrap);
    left.appendChild(fRepo.wrap);
    left.appendChild(fBranch.wrap);
    left.appendChild(fDir.wrap);
    left.appendChild(searchField);
    left.appendChild(hint);
    left.appendChild(status);
    left.appendChild(btnSaveCfg);
    left.appendChild(btnLoad);

    const list = document.createElement("div");
    list.className = "pmk2-list";
    right.appendChild(list);

    body.appendChild(left);
    body.appendChild(right);

    win.appendChild(titlebar);
    win.appendChild(body);
    overlay.appendChild(win);
    document.body.appendChild(overlay);

    this.ui.marketplace = {
      overlay,
      win,
      list,
      status,
      inputs: {
        owner: fOwner.input,
        repo: fRepo.input,
        branch: fBranch.input,
        dir: fDir.input,
        search: searchInput
      }
    };

    btnClose.onclick = () => this._closeMarketplace();
    btnReload.onclick = () => this._loadMarket();
    btnOpenDir.onclick = () => {
      const {
        owner,
        repo,
        branch,
        dir
      } = this.core.marketplaceState;
      window.open(`https://github.com/${owner}/${repo}/tree/${branch}/${dir}`, "_blank");
    };

    btnSaveCfg.onclick = () => {
      const inputs = this.ui.marketplace.inputs;
      const state = this.core.marketplaceState;
      state.owner = inputs.owner.value.trim() || state.owner;
      state.repo = inputs.repo.value.trim() || state.repo;
      state.branch = inputs.branch.value.trim() || state.branch;
      state.dir = inputs.dir.value.trim().replace(/^\/+|\/+$/g, "") || state.dir;
      this._setMarketplaceStatus("配置已应用（未加载）");
    };

    btnLoad.onclick = () => {
      btnSaveCfg.click();
      this._loadMarket();
    };

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.ui.marketplace?.overlay?.style.display === "flex") {
        this._closeMarketplace();
      }
    });

    this._makeMarketplaceDraggable(titlebar, win);
  }

  _createMarketField(label, value) {
    const wrap = document.createElement("div");
    wrap.className = "pmk2-field";
    const l = document.createElement("label");
    l.textContent = label;
    const input = document.createElement("input");
    input.className = "pmk2-input";
    input.value = value || "";
    wrap.appendChild(l);
    wrap.appendChild(input);
    return {
      wrap,
      input
    };
  }

  _makeMarketplaceDraggable(handle, win) {
    let on = false,
      sx = 0,
      sy = 0,
      sl = 0,
      st = 0;
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

    const down = (e) => {
      const t = e.target?.tagName?.toLowerCase?.();
      if (t === "button" || t === "input") return;
      on = true;
      const r = win.getBoundingClientRect();
      sx = e.clientX;
      sy = e.clientY;
      sl = r.left;
      st = r.top;
      win.style.position = "fixed";
      win.style.margin = "0";
      win.style.left = `${sl}px`;
      win.style.top = `${st}px`;
      win.style.transform = "none";
    };

    const move = (e) => {
      if (!on) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      const w = win.offsetWidth,
        h = win.offsetHeight;
      const left = clamp(sl + dx, 8, window.innerWidth - w - 8);
      const top = clamp(st + dy, 8, window.innerHeight - h - 8);
      win.style.left = `${left}px`;
      win.style.top = `${top}px`;
    };

    const up = () => {
      on = false;
    };
    handle.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  _openMarketplace() {
    this._createMarketplaceUI();
    this.ui.marketplace.overlay.style.display = "flex";
    if (!this.core.marketplaceState.lastLoadedAt) this._loadMarket();
  }

  _closeMarketplace() {
    if (this.ui.marketplace && this.ui.marketplace.overlay) {
      this.ui.marketplace.overlay.style.display = "none";
    }
  }

  _setMarketplaceStatus(msg) {
    if (this.ui.marketplace && this.ui.marketplace.status) {
      this.ui.marketplace.status.textContent = msg;
    }
  }

  async _loadMarket() {
    const {
      owner,
      repo,
      branch,
      dir
    } = this.core.marketplaceState;
    this._setMarketplaceStatus(`加载中：${owner}/${repo}@${branch}/${dir}`);
    this._renderMarketListLoading();

    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(dir)}?ref=${encodeURIComponent(branch)}`;
      const items = await this.core.apiManager.fetchJson(url);
      if (!Array.isArray(items)) throw new Error("目标不是目录或无法读取");

      const jsFiles = items
        .filter((it) => it && it.type === "file")
        .filter((it) => {
          const n = String(it.name || "").toLowerCase();
          if (n === "readme.md") return false;
          return n.endsWith(".js");
        })
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));

      // 基础 items 列表，稍后增强元数据
      const baseItems = jsFiles.map(file => ({
        ...file,
        metadata: {
          description: "",
          tags: []
        }
      }));

      this.core.marketplaceState.items = baseItems;
      this.core.marketplaceState.lastLoadedAt = Date.now();

      // 先渲染空元数据列表
      this._renderMarketList();

      // 异步加载每个插件的元数据
      await this._enhanceItemsWithMetadata(baseItems, owner, repo, branch);
      
      this._renderMarketList();
      this._setMarketplaceStatus(`已加载：${baseItems.length} 个 .js（已忽略 README.md）`);
    } catch (e) {
      this._renderMarketError(e);
      this._setMarketplaceStatus(`加载失败：${e.message || e}`);
    }
  }

  // 提取插件元数据
  _extractPluginMetadata(code) {
    let description = "";
    let tags = [];
    
    // 提取 plugin.description
    const descMatch = code.match(/plugin\.description\s*=\s*["']([^"']*)["']/);
    if (descMatch) {
      description = descMatch[1];
    }
    
    // 提取 plugin.tags = ["tag1", "tag2", ...]
    const tagsMatch = code.match(/plugin\.tags\s*=\s*\[(.*?)\]/s);
    if (tagsMatch) {
      const tagsStr = tagsMatch[1];
      const tagRegex = /["']([^"']*)["']/g;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(tagsStr)) !== null) {
        tags.push(tagMatch[1]);
      }
    }
    
    return { description, tags };
  }

  async _enhanceItemsWithMetadata(items, owner, repo, branch) {
    const maxConcurrent = 3;
    let index = 0;
    
    const processNext = async () => {
      while (index < items.length) {
        const i = index++;
        const item = items[i];
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`;
        
        try {
          const res = await fetch(rawUrl);
          if (res.ok) {
            const code = await res.text();
            const metadata = this._extractPluginMetadata(code);
            item.metadata = metadata;
          }
        } catch (e) {
          console.warn(`Failed to fetch metadata for ${item.name}:`, e);
        }
        
        // 每获取一个就刷新一次显示，让用户看到进度
        if (i % 3 === 0 || i === items.length - 1) {
          this._renderMarketList();
        }
      }
    };
    
    const workers = [];
    for (let i = 0; i < maxConcurrent; i++) {
      workers.push(processNext());
    }
    await Promise.all(workers);
  }

  _renderMarketListLoading() {
    const list = this.ui.marketplace.list;
    if (!list) return;
    list.innerHTML = `<div class="pmk2-empty">正在加载列表...</div>`;
  }

  _renderMarketError(e) {
    const list = this.ui.marketplace.list;
    if (!list) return;
    list.innerHTML = `
    <div class="pmk2-empty">
      读取失败：${String(e.message || e).replace(/</g, "&lt;")}
      <div style="margin-top:8px;opacity:0.7">
        建议检查：分支是否正确、目录路径是否存在、仓库是否公开、或是否触发 GitHub API 频率限制。
      </div>
    </div>
  `;
  }

  _renderMarketList() {
    const list = this.ui.marketplace.list;
    if (!list) return;

    const {
      owner,
      repo,
      branch
    } = this.core.marketplaceState;
    let items = this.core.marketplaceState.items || [];
    
    // 应用搜索过滤
    const searchKeyword = (this.core.marketplaceState.searchKeyword || "").toLowerCase().trim();
    if (searchKeyword) {
      items = items.filter(item => {
        const name = (item.name || "").toLowerCase();
        const description = (item.metadata?.description || "").toLowerCase();
        const tags = (item.metadata?.tags || []).some(tag => tag.toLowerCase().includes(searchKeyword));
        return name.includes(searchKeyword) || description.includes(searchKeyword) || tags;
      });
    }
    
    list.innerHTML = "";

    if (items.length === 0) {
      const msg = searchKeyword ? `没有找到匹配 "${searchKeyword}" 的插件。` : "目录中没有可用的 .js 插件文件。";
      list.innerHTML = `<div class="pmk2-empty">${msg}</div>`;
      return;
    }

    items.forEach((it) => {
      const item = document.createElement("div");
      item.className = "pmk2-item";

      const top = document.createElement("div");
      top.className = "pmk2-itemtop";

      const textPart = document.createElement("div");
      textPart.className = "pmk2-itemtext";

      const name = document.createElement("div");
      name.className = "pmk2-itemname";
      name.textContent = it.name;

      const meta = document.createElement("div");
      meta.className = "pmk2-itemmeta";
      meta.textContent = it.path;

      textPart.appendChild(name);
      textPart.appendChild(meta);
      
      // 添加简介
      if (it.metadata && it.metadata.description) {
        const descDiv = document.createElement("div");
        descDiv.className = "pmk2-description";
        descDiv.textContent = it.metadata.description;
        textPart.appendChild(descDiv);
      }
      
      // 添加标签
      if (it.metadata && it.metadata.tags && it.metadata.tags.length > 0) {
        const tagsDiv = document.createElement("div");
        tagsDiv.style.marginTop = "6px";
        it.metadata.tags.forEach(tag => {
          const tagSpan = document.createElement("span");
          tagSpan.className = "pmk2-tag";
          tagSpan.textContent = tag;
          tagsDiv.appendChild(tagSpan);
        });
        textPart.appendChild(tagsDiv);
      }

      const btns = document.createElement("div");
      btns.className = "pmk2-itembtns";

      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${it.path}`;
      const webUrl = `https://github.com/${owner}/${repo}/blob/${branch}/${it.path}`;

      const btnInstall = document.createElement("button");
      btnInstall.className = "pmk2-btn pmk2-btn-primary";
      btnInstall.textContent = "安装/加载";
      btnInstall.onclick = async () => {
        btnInstall.disabled = true;
        const old = btnInstall.textContent;
        btnInstall.textContent = "安装中...";

        try {
          await this.pluginManager.importFromGitHub(rawUrl);
          alert(`已安装：${it.name}`);
        } catch (e) {
          alert(`安装失败：${e.message || e}`);
        } finally {
          btnInstall.disabled = false;
          btnInstall.textContent = old;
        }
      };

      const btnView = document.createElement("button");
      btnView.className = "pmk2-btn";
      btnView.textContent = "查看源码";
      btnView.onclick = () => window.open(webUrl, "_blank");

      const btnCopy = document.createElement("button");
      btnCopy.className = "pmk2-btn pmk2-btn-blue";
      btnCopy.textContent = "复制 Raw 链接";
      btnCopy.onclick = () => Utils.copyToClipboard(rawUrl);

      btns.appendChild(btnInstall);
      btns.appendChild(btnView);
      btns.appendChild(btnCopy);

      top.appendChild(textPart);
      top.appendChild(btns);

      item.appendChild(top);
      list.appendChild(item);
    });
  }

  // ==================== 原有 UI 组件构建 ====================

  _createPluginsArea() {
    const area = document.createElement('div');
    area.style.display = 'none';

    const controls = document.createElement('div');
    Object.assign(controls.style, {
      display: 'flex',
      gap: '8px',
      marginBottom: '10px',
      flexWrap: 'wrap'
    });

    const importLocalBtn = UIComponents.createWindowButton('导入本地插件 (.js)');
    importLocalBtn.onclick = () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.js';
      inp.onchange = async () => {
        if (inp.files[0]) {
          const text = await inp.files[0].text();
          try {
            await this.pluginManager.loadPlugin(text);
            alert('插件导入成功');
            this._refreshPluginsList();
          } catch (e) {
            alert('插件导入失败: ' + e.message);
          }
        }
      };
      inp.click();
    };

    const ghInput = Utils.input('GitHub URL (文件或文件夹)');
    ghInput.style.flex = '1';

    const importGhBtn = UIComponents.createWindowButton('从 GitHub 导入');
    importGhBtn.onclick = async () => {
      try {
        await this.pluginManager.importFromGitHub(ghInput.value);
        alert('插件导入成功');
        this._refreshPluginsList();
      } catch (e) {
        alert('导入失败: ' + e.message);
      }
    };

    controls.appendChild(importLocalBtn);
    controls.appendChild(ghInput);
    controls.appendChild(importGhBtn);
    area.appendChild(controls);

    const pasteBox = document.createElement('div');
    Object.assign(pasteBox.style, {
      marginBottom: '10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    });
    const pasteLabel = document.createElement('div');
    pasteLabel.textContent = '或粘贴插件代码:';
    pasteLabel.style.fontSize = '12px';
    pasteLabel.style.opacity = '0.7';
    const pasteTextarea = document.createElement('textarea');
    Object.assign(pasteTextarea.style, {
      width: '100%',
      height: '100px',
      background: 'rgba(0,0,0,0.3)',
      color: '#fff',
      border: '1px solid #555',
      borderRadius: '6px',
      padding: '8px',
      boxSizing: 'border-box',
      fontFamily: 'monospace',
      fontSize: '12px'
    });
    const loadPasteBtn = UIComponents.createWindowButton('加载粘贴的代码', {
      background: '#28a745'
    });
    loadPasteBtn.onclick = async () => {
      const code = pasteTextarea.value.trim();
      if (!code) return alert('请先粘贴插件代码');
      try {
        await this.pluginManager.loadPlugin(code);
        alert('插件加载成功');
        pasteTextarea.value = '';
        this._refreshPluginsList();
      } catch (e) {
        alert('插件加载失败: ' + e.message);
      }
    };
    pasteBox.appendChild(pasteLabel);
    pasteBox.appendChild(pasteTextarea);
    pasteBox.appendChild(loadPasteBtn);
    area.appendChild(pasteBox);

    const list = document.createElement('div');
    Object.assign(list.style, {
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      padding: '10px',
      background: 'rgba(0,0,0,0.2)',
      minHeight: '100px'
    });
    this.ui.pluginsList = list;
    area.appendChild(list);

    return area;
  }

  _refreshPluginsList() {
    if (!this.ui.pluginsList) return;
    this.ui.pluginsList.innerHTML = '';

    if (this.pluginManager.plugins.size === 0) {
      this.ui.pluginsList.innerHTML = '<div style="opacity:0.6;text-align:center">暂无插件</div>';
      return;
    }

    this.pluginManager.plugins.forEach((p, id) => {
      const row = document.createElement('div');
      Object.assign(row.style, Utils.itemStyle());
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';

      const info = document.createElement('div');
      let infoHtml = `<b>${p.name}</b> <span style="font-size:11px;opacity:0.7">v${p.version}</span>`;
      if (p.description) {
        infoHtml += `<br><span style="font-size:11px;opacity:0.6">${p.description}</span>`;
      }
      if (p.tags && p.tags.length) {
        infoHtml += `<br><span style="font-size:10px;opacity:0.5">🏷️ ${p.tags.join(', ')}</span>`;
      }
      infoHtml += `<br><span style="font-size:10px;opacity:0.4">ID: ${id}</span>`;
      info.innerHTML = infoHtml;

      const btnBox = document.createElement('div');
      btnBox.style.display = 'flex';
      btnBox.style.gap = '5px';

      const copyBtn = UIComponents.createWindowButton('复制源码', {
        background: 'rgba(60,160,255,0.2)'
      });
      copyBtn.onclick = () => {
        Utils.copyToClipboard(p.code);
        alert('插件源码已复制！');
      };

      const delBtn = UIComponents.createWindowButton('卸载', {
        background: 'rgba(255,80,80,0.2)'
      });
      delBtn.onclick = () => {
        if (confirm(`确定卸载插件 ${p.name}?`)) {
          this.pluginManager.unloadPlugin(id);
          this._refreshPluginsList();
        }
      };

      btnBox.appendChild(copyBtn);
      btnBox.appendChild(delBtn);

      row.appendChild(info);
      row.appendChild(btnBox);
      this.ui.pluginsList.appendChild(row);
    });
  }

  _createSearchArea() {
    const area = document.createElement('div');

    const repoControls = document.createElement('div');
    const rc1 = document.createElement('div');
    Object.assign(rc1.style, {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px'
    });
    const repoQ = Utils.input('搜索仓库（支持 GitHub 语法）');
    repoQ.style.flex = '1';
    const repoBtn = UIComponents.createWindowButton('搜索');
    repoBtn.onclick = () => {
      this.core.repoSearchPage = 1;
      this.searchRepos();
    };
    rc1.appendChild(repoQ);
    rc1.appendChild(repoBtn);

    const rc2 = document.createElement('div');
    Object.assign(rc2.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '6px',
      marginBottom: '8px'
    });
    const sLang = Utils.select(['all', 'javascript', 'python', 'c', 'c++', 'c#', 'html', 'css', 'php', 'typescript'], '语言');
    const sStars = Utils.select(['all', '<5', '5~100', '100~500', '500>'], '星数');
    const sForks = Utils.select(['all', '<5', '50..100', '200', '>500'], 'forks');
    const sFollowers = Utils.select(['all', '0..100', '200', '<200', '>500', '>1000'], 'followers');
    const sSize = Utils.select(['all', '<5', '5~100', '100~500', '>500'], 'size');
    const sPage = Utils.select(['30', '60', 'all'], '最大数量');
    rc2.appendChild(sLang.el);
    rc2.appendChild(sStars.el);
    rc2.appendChild(sForks.el);
    rc2.appendChild(sFollowers.el);
    rc2.appendChild(sSize.el);
    rc2.appendChild(sPage.el);

    const rc3 = document.createElement('div');
    Object.assign(rc3.style, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      flexWrap: 'wrap'
    });
    const sSort = Utils.select(['best', 'stars_desc', 'stars_asc', 'forks_desc', 'forks_asc', 'updated_desc', 'updated_asc'], '排序');
    const repoPager = document.createElement('div');
    Object.assign(repoPager.style, {
      display: 'flex',
      gap: '6px',
      alignItems: 'center',
      marginLeft: 'auto'
    });
    const rpPrev = UIComponents.createWindowButton('<');
    rpPrev.onclick = () => {
      if (this.core.repoSearchPage > 1) {
        this.core.repoSearchPage--;
        this.searchRepos();
      }
    };
    const rpNext = UIComponents.createWindowButton('>');
    rpNext.onclick = () => {
      this.core.repoSearchPage++;
      this.searchRepos();
    };
    const rpLab = document.createElement('div');
    rpLab.textContent = 'P 1';
    rpLab.style.fontSize = '12px';
    repoPager.appendChild(rpPrev);
    repoPager.appendChild(rpLab);
    repoPager.appendChild(rpNext);
    rc3.appendChild(sSort.el);
    rc3.appendChild(repoPager);

    repoControls.appendChild(rc1);
    repoControls.appendChild(rc2);
    repoControls.appendChild(rc3);

    const userControls = document.createElement('div');
    userControls.style.display = 'none';
    const uc1 = document.createElement('div');
    Object.assign(uc1.style, {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px'
    });
    const userQ = Utils.input('搜索用户');
    userQ.style.flex = '1';
    const userBtn = UIComponents.createWindowButton('搜索');
    userBtn.onclick = () => {
      this.core.userSearchPage = 1;
      this.searchUsers();
    };
    uc1.appendChild(userQ);
    uc1.appendChild(userBtn);

    const uc2 = document.createElement('div');
    Object.assign(uc2.style, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    });
    const uPage = Utils.select(['30', '60', 'all'], '最大数量');
    const uSort = Utils.select(['best', 'followers_desc', 'followers_asc', 'joined_desc', 'joined_asc', 'repos_desc'], '排序');
    const userPager = document.createElement('div');
    Object.assign(userPager.style, {
      display: 'flex',
      gap: '6px',
      alignItems: 'center',
      marginLeft: 'auto'
    });
    const upPrev = UIComponents.createWindowButton('<');
    upPrev.onclick = () => {
      if (this.core.userSearchPage > 1) {
        this.core.userSearchPage--;
        this.searchUsers();
      }
    };
    const upNext = UIComponents.createWindowButton('>');
    upNext.onclick = () => {
      this.core.userSearchPage++;
      this.searchUsers();
    };
    const upLab = document.createElement('div');
    upLab.textContent = 'P 1';
    upLab.style.fontSize = '12px';
    userPager.appendChild(upPrev);
    userPager.appendChild(upLab);
    userPager.appendChild(upNext);
    uc2.appendChild(uPage.el);
    uc2.appendChild(uSort.el);
    uc2.appendChild(userPager);

    userControls.appendChild(uc1);
    userControls.appendChild(uc2);

    const orgControls = document.createElement('div');
    orgControls.style.display = 'none';
    const oc1 = document.createElement('div');
    Object.assign(oc1.style, {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px'
    });
    const orgQ = Utils.input('搜索组织');
    orgQ.style.flex = '1';
    const orgBtn = UIComponents.createWindowButton('搜索');
    orgBtn.onclick = () => {
      this.core.orgSearchPage = 1;
      this.searchOrgs();
    };
    oc1.appendChild(orgQ);
    oc1.appendChild(orgBtn);

    const oc2 = document.createElement('div');
    Object.assign(oc2.style, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    });
    const oPage = Utils.select(['30', '60', 'all'], '最大数量');
    const oSort = Utils.select(['best', 'joined_desc', 'joined_asc'], '排序');
    const orgPager = document.createElement('div');
    Object.assign(orgPager.style, {
      display: 'flex',
      gap: '6px',
      alignItems: 'center',
      marginLeft: 'auto'
    });
    const opPrev = UIComponents.createWindowButton('<');
    opPrev.onclick = () => {
      if (this.core.orgSearchPage > 1) {
        this.core.orgSearchPage--;
        this.searchOrgs();
      }
    };
    const opNext = UIComponents.createWindowButton('>');
    opNext.onclick = () => {
      this.core.orgSearchPage++;
      this.searchOrgs();
    };
    const opLab = document.createElement('div');
    opLab.textContent = 'P 1';
    opLab.style.fontSize = '12px';
    orgPager.appendChild(opPrev);
    orgPager.appendChild(opLab);
    orgPager.appendChild(opNext);
    oc2.appendChild(oPage.el);
    oc2.appendChild(oSort.el);
    oc2.appendChild(orgPager);

    orgControls.appendChild(oc1);
    orgControls.appendChild(oc2);

    area.appendChild(repoControls);
    area.appendChild(userControls);
    area.appendChild(orgControls);

    this.ui.repoSearchInput = repoQ;
    this.ui.repoLangSelect = sLang.sel;
    this.ui.repoStarsSelect = sStars.sel;
    this.ui.repoForksSelect = sForks.sel;
    this.ui.repoFollowersSelect = sFollowers.sel;
    this.ui.repoSizeSelect = sSize.sel;
    this.ui.repoPerPageSelect = sPage.sel;
    this.ui.repoSortSelect = sSort.sel;
    this.ui.repoPrevBtn = rpPrev;
    this.ui.repoNextBtn = rpNext;
    this.ui._repoPageLabel = rpLab;

    this.ui.userSearchInput = userQ;
    this.ui.userPerPageSelect = uPage.sel;
    this.ui.userSortSelect = uSort.sel;
    this.ui.userPrevBtn = upPrev;
    this.ui.userNextBtn = upNext;
    this.ui._userPageLabel = upLab;

    this.ui.orgSearchInput = orgQ;
    this.ui.orgPerPageSelect = oPage.sel;
    this.ui.orgSortSelect = oSort.sel;
    this.ui.orgPrevBtn = opPrev;
    this.ui.orgNextBtn = opNext;
    this.ui._orgPageLabel = opLab;

    this.ui._repoControls = repoControls;
    this.ui._userControls = userControls;
    this.ui._orgControls = orgControls;

    return area;
  }

  _createBrowseArea() {
    const area = document.createElement('div');
    area.style.display = 'none';

    const bc1 = document.createElement('div');
    Object.assign(bc1.style, {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px'
    });
    const inpOwner = Utils.input('Owner');
    inpOwner.style.flex = '1';
    const inpRepo = Utils.input('Repo');
    inpRepo.style.flex = '1';
    const goBtn = UIComponents.createWindowButton('进入');
    goBtn.onclick = () => this._refreshFromInputs();
    bc1.appendChild(inpOwner);
    bc1.appendChild(inpRepo);
    bc1.appendChild(goBtn);

    const bcBranch = document.createElement('div');
    Object.assign(bcBranch.style, {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px',
      alignItems: 'center'
    });
    const branchSel = document.createElement('select');
    Object.assign(branchSel.style, {
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid #555',
      color: '#fff',
      borderRadius: '4px',
      padding: '4px',
      maxWidth: '150px'
    });
    branchSel.innerHTML = '<option value="">Branch...</option>';
    branchSel.onchange = () => {
      this.core.currentBranch = branchSel.value;
      this.loadDir('');
    };
    const addBranchBtn = UIComponents.createWindowButton('+分支');
    addBranchBtn.onclick = () => this._showCreateBranchUI();
    const mergeBtn = UIComponents.createWindowButton('合并分支', {
      background: 'rgba(100,200,100,0.2)'
    });
    mergeBtn.onclick = () => this._showMergeUI();
    const historyBtn = UIComponents.createWindowButton('历史');
    historyBtn.onclick = () => this._showRepoHistory();
    const prBtn = UIComponents.createWindowButton('PRs');
    prBtn.onclick = () => this._showPullRequests();
    const createPrBtn = UIComponents.createWindowButton('发起 PR', {
      background: 'rgba(255,165,0,0.2)'
    });
    createPrBtn.onclick = () => this._showCreatePRUI();

    bcBranch.appendChild(branchSel);
    bcBranch.appendChild(addBranchBtn);
    bcBranch.appendChild(mergeBtn);
    bcBranch.appendChild(historyBtn);
    bcBranch.appendChild(prBtn);
    bcBranch.appendChild(createPrBtn);

    const bc2 = document.createElement('div');
    Object.assign(bc2.style, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      marginBottom: '8px',
      flexWrap: 'wrap'
    });
    const pathDiv = document.createElement('div');
    pathDiv.textContent = '/';
    Object.assign(pathDiv.style, {
      flex: '1',
      minWidth: '150px',
      fontSize: '12px',
      padding: '7px 8px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.15)',
      background: 'rgba(255,255,255,0.08)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    });
    const copyPBtn = UIComponents.createWindowButton('复制路径');
    copyPBtn.onclick = () => Utils.copyToClipboard('/' + this.core.currentPath);
    const backBtn = UIComponents.createWindowButton('返回');
    backBtn.onclick = () => this._goBack();
    const refreshBtn = UIComponents.createWindowButton('刷新');
    refreshBtn.onclick = () => this.loadDir(this.core.currentPath);

    bc2.appendChild(pathDiv);
    bc2.appendChild(copyPBtn);
    bc2.appendChild(backBtn);
    bc2.appendChild(refreshBtn);

    const bc3 = document.createElement('div');
    Object.assign(bc3.style, {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px',
      flexWrap: 'wrap'
    });
    const membersBtn = UIComponents.createWindowButton('成员贡献');
    membersBtn.onclick = () => this._showRepoContributors();
    const activityBtn = UIComponents.createWindowButton('活动');
    activityBtn.onclick = () => this._showRepoActivity();
    const addFolderBtn = UIComponents.createWindowButton('添加文件夹');
    addFolderBtn.onclick = async () => this._showAddFolderUI();
    const delFileBtn = UIComponents.createWindowButton('删除文件', {
      background: 'rgba(255,80,80,0.25)'
    });
    delFileBtn.onclick = async () => this._showDeleteFileUI();

    bc3.appendChild(membersBtn);
    bc3.appendChild(activityBtn);
    bc3.appendChild(addFolderBtn);
    bc3.appendChild(delFileBtn);

    const actionRow = document.createElement('div');
    Object.assign(actionRow.style, {
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap'
    });

    area.appendChild(bc1);
    area.appendChild(bcBranch);
    area.appendChild(bc2);
    area.appendChild(bc3);
    area.appendChild(actionRow);

    this.ui.ownerInput = inpOwner;
    this.ui.repoInput = inpRepo;
    this.ui.pathLabel = pathDiv;
    this.ui.actionRow = actionRow;
    this.ui.branchSelect = branchSel;
    this.ui.btnAddFolder = addFolderBtn;
    this.ui.btnDeleteFile = delFileBtn;

    return area;
  }

  _createAIArea() {
    const area = document.createElement('div');
    area.style.display = 'none';

    const providerRow = document.createElement('div');
    Object.assign(providerRow.style, {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px',
      alignItems: 'center'
    });
    const provSelWrap = Utils.select(['github', 'custom'], 'AI 提供商');
    Utils.applySelectLabels(provSelWrap.sel, {
      github: 'GitHub (默认)',
      custom: '自定义'
    });
    provSelWrap.sel.value = this.core.aiProvider;
    provSelWrap.sel.onchange = () => {
      this.core.setAIProvider(provSelWrap.sel.value);
      this._refreshAIConfigUI();
    };
    Object.assign(provSelWrap.el.style, {
      flex: '1'
    });
    providerRow.appendChild(provSelWrap.el);

    const aiConfigContainer = document.createElement('div');
    Object.assign(aiConfigContainer.style, {
      padding: '8px',
      marginBottom: '8px',
      background: 'rgba(255,255,255,0.05)',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.1)'
    });

    const sys = document.createElement('textarea');
    sys.placeholder = '系统提示（可选）';
    Object.assign(sys.style, {
      width: '100%',
      height: '50px',
      background: 'rgba(0,0,0,0.3)',
      color: '#fff',
      border: '1px solid #555',
      borderRadius: '6px',
      padding: '8px',
      boxSizing: 'border-box',
      marginBottom: '6px'
    });

    const prompt = document.createElement('textarea');
    prompt.placeholder = '输入你的问题... (Ctrl+Enter 发送)';
    Object.assign(prompt.style, {
      width: '100%',
      height: '80px',
      background: 'rgba(0,0,0,0.3)',
      color: '#fff',
      border: '1px solid #555',
      borderRadius: '6px',
      padding: '8px',
      boxSizing: 'border-box',
      marginBottom: '6px'
    });

    const cacheRow = document.createElement('div');
    Object.assign(cacheRow.style, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      marginBottom: '8px',
      flexWrap: 'wrap'
    });
    const cacheBtn = UIComponents.createWindowButton('读取整个仓库到缓存(危险)', {
      background: 'rgba(255,160,60,0.20)'
    });
    cacheBtn.onclick = async () => {
      const ok = confirm('危险测试功能：将递归读取整个仓库内容，可能很慢、很耗额度、可能失败。\n确定继续吗？');
      if (!ok) return;
      await this._cacheWholeRepoForAI();
    };
    const reviewBtn = UIComponents.createWindowButton('审阅', {
      display: 'none'
    });
    reviewBtn.onclick = () => this._showCacheReviewUI();
    const cacheClearBtn = UIComponents.createWindowButton('清空缓存');
    cacheClearBtn.onclick = () => {
      this.core.cacheManager.clearRepoCache();
      this._renderAICacheInfo();
      LoadingManager.setMessage('仓库缓存已清空');
    };
    const cacheInfo = document.createElement('div');
    Object.assign(cacheInfo.style, {
      fontSize: '12px',
      opacity: '0.85'
    });
    cacheInfo.textContent = '缓存：空';
    cacheRow.appendChild(cacheBtn);
    cacheRow.appendChild(reviewBtn);
    cacheRow.appendChild(cacheClearBtn);
    cacheRow.appendChild(cacheInfo);

    const controlsRow = document.createElement('div');
    Object.assign(controlsRow.style, {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px',
      flexWrap: 'wrap'
    });
    const startBtn = UIComponents.createWindowButton('开始(流式)');
    startBtn.onclick = async () => {
      const p = String(prompt.value || '');
      const s = String(sys.value || '');
      const ctx = this.core.cacheManager.buildContext(120000);
      const finalPrompt = ctx ? `${p}\n\n-----\n[仓库缓存上下文 (已筛选)]\n${ctx}` : p;
      if (s.trim()) await this._startAIStreamWithSystem(s, finalPrompt);
      else await this._startAIStream(finalPrompt);
    };
    const stopBtn = UIComponents.createWindowButton('停止');
    stopBtn.onclick = () => this.core.aiManager.abort();
    const clearBtn = UIComponents.createWindowButton('清空输出');
    clearBtn.onclick = () => {
      this.core.aiManager.streamBuffer = '';
      this.core.aiManager.streamError = null;
      this.core.aiManager.isStreaming = false;
      this._renderAIOutput();
    };
    const copyBtn = UIComponents.createWindowButton('复制');
    copyBtn.onclick = () => {
      Utils.copyToClipboard(this.core.aiManager.streamBuffer || '');
    };
    controlsRow.appendChild(startBtn);
    controlsRow.appendChild(stopBtn);
    controlsRow.appendChild(clearBtn);
    controlsRow.appendChild(copyBtn);

    const outWrap = document.createElement('div');
    Object.assign(outWrap.style, {
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '10px',
      background: 'rgba(0,0,0,0.2)',
      padding: '10px',
      maxHeight: '220px',
      overflowY: 'auto'
    });
    const outPre = document.createElement('pre');
    Object.assign(outPre.style, {
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      margin: '0',
      fontSize: '13px',
      color: '#fff'
    });
    outWrap.appendChild(outPre);

    area.appendChild(providerRow);
    area.appendChild(aiConfigContainer);
    area.appendChild(sys);
    area.appendChild(prompt);
    area.appendChild(cacheRow);
    area.appendChild(controlsRow);
    area.appendChild(outWrap);

    this.ui.aiConfigContainer = aiConfigContainer;
    this.ui.aiSystemInput = sys;
    this.ui.aiPromptInput = prompt;
    this.ui.aiStartBtn = startBtn;
    this.ui.aiStopBtn = stopBtn;
    this.ui.aiClearBtn = clearBtn;
    this.ui.aiCopyBtn = copyBtn;
    this.ui.aiOutputPre = outPre;
    this.ui.aiCacheBtn = cacheBtn;
    this.ui.aiCacheReviewBtn = reviewBtn;
    this.ui.aiCacheClearBtn = cacheClearBtn;
    this.ui.aiCacheInfo = cacheInfo;

    return area;
  }

  _createTrendingArea() {
    const area = document.createElement('div');
    area.style.display = 'none';
    const tControls = document.createElement('div');
    Object.assign(tControls.style, {
      display: 'flex',
      gap: '10px',
      marginBottom: '10px'
    });
    const tWeekBtn = UIComponents.createWindowButton('本周热门');
    tWeekBtn.onclick = () => this._loadTrending('week');
    const tMonthBtn = UIComponents.createWindowButton('本月热门');
    tMonthBtn.onclick = () => this._loadTrending('month');
    tControls.appendChild(tWeekBtn);
    tControls.appendChild(tMonthBtn);
    area.appendChild(tControls);
    return area;
  }

  _createMyArea() {
    const area = document.createElement('div');
    area.style.display = 'none';
    const mControls = document.createElement('div');
    Object.assign(mControls.style, {
      display: 'flex',
      gap: '10px',
      marginBottom: '10px'
    });
    const mReposBtn = UIComponents.createWindowButton('我的仓库');
    mReposBtn.onclick = () => this._loadMyRepos();
    mControls.appendChild(mReposBtn);
    area.appendChild(mControls);
    return area;
  }

  _bindEvents() {
    this.ui.repoSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.core.repoSearchPage = 1;
        this.searchRepos();
      }
    });
    this.ui.userSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.core.userSearchPage = 1;
        this.searchUsers();
      }
    });
    this.ui.orgSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.core.orgSearchPage = 1;
        this.searchOrgs();
      }
    });
    this.ui.ownerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._refreshFromInputs();
    });
    this.ui.repoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._refreshFromInputs();
    });
    this.ui.aiPromptInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.ui.aiStartBtn.click();
      }
    });

    this.ui.tabSearchBtn.onclick = () => this._switchMode('search');
    this.ui.tabBrowseBtn.onclick = () => this._switchMode('browse');
    this.ui.tabTrendingBtn.onclick = () => this._switchMode('trending');
    this.ui.tabMyBtn.onclick = () => this._switchMode('my');
    this.ui.tabAIBtn.onclick = () => this._switchMode('ai');
    this.ui.tabPluginsBtn.onclick = () => this._switchMode('plugins');
  }

  // ==================== 模式切换 ====================

  _switchMode(mode) {
    this.core.mode = mode;
    const isSearch = mode === 'search';
    const isBrowse = mode === 'browse';
    const isAI = mode === 'ai';
    const isTrending = mode === 'trending';
    const isMy = mode === 'my';
    const isPlugins = mode === 'plugins';

    this.ui.searchArea.style.display = isSearch ? 'block' : 'none';
    this.ui.browseArea.style.display = isBrowse ? 'block' : 'none';
    this.ui.aiArea.style.display = isAI ? 'block' : 'none';
    this.ui.trendingArea.style.display = isTrending ? 'block' : 'none';
    this.ui.myArea.style.display = isMy ? 'block' : 'none';
    this.ui.pluginsArea.style.display = isPlugins ? 'block' : 'none';

    this.ui.searchDirSelectWrap.style.display = isSearch ? 'flex' : 'none';

    this.ui.tabSearchBtn.style.background = isSearch ? 'rgba(255,255,255,0.25)' : '';
    this.ui.tabBrowseBtn.style.background = isBrowse ? 'rgba(255,255,255,0.25)' : '';
    this.ui.tabTrendingBtn.style.background = isTrending ? 'rgba(255,255,255,0.25)' : '';
    this.ui.tabMyBtn.style.background = isMy ? 'rgba(255,255,255,0.25)' : '';
    this.ui.tabAIBtn.style.background = isAI ? 'rgba(255,255,255,0.25)' : '';
    this.ui.tabPluginsBtn.style.background = isPlugins ? 'rgba(255,255,255,0.25)' : '';

    this.ui.mainArea.innerHTML = '';
    if (!isSearch && isBrowse) this._renderActionRow();

    if (isSearch) LoadingManager.setMessage('请选择方向并搜索');
    else if (isBrowse) LoadingManager.setMessage('输入 Owner/Repo 浏览仓库');
    else if (isTrending) {
      LoadingManager.setMessage('查看 GitHub 热门项目');
      this._loadTrending('week');
    } else if (isMy) {
      LoadingManager.setMessage('我的 GitHub');
      this._loadMyRepos();
    } else if (isAI) {
      LoadingManager.setMessage('AI Ready');
      this._renderAIOutput();
      this._renderAICacheInfo();
    } else if (isPlugins) {
      LoadingManager.setMessage('插件管理');
      this._refreshPluginsList();
    }

    this.pluginManager.trigger('mode:switch', mode);
  }

  _switchSearchDir(dir) {
    this.core.searchDir = dir;
    this.ui.searchDirSelect.value = dir;
    this.ui._repoControls.style.display = dir === 'repo' ? 'block' : 'none';
    this.ui._userControls.style.display = dir === 'user' ? 'block' : 'none';
    this.ui._orgControls.style.display = dir === 'org' ? 'block' : 'none';
    this.ui.mainArea.innerHTML = '';
    LoadingManager.setMessage(`准备搜索 ${dir}`);
    this.pluginManager.trigger('search:dir', dir);
  }

  // ==================== 搜索功能 ====================

  _createRepoItem(item) {
    const row = document.createElement('div');
    Object.assign(row.style, Utils.itemStyle());

    const top = document.createElement('div');
    top.innerHTML = `<b>${item.full_name}</b> <span style="font-size:0.9em;opacity:0.8">★${item.stargazers_count}</span>`;

    const desc = document.createElement('div');
    desc.textContent = item.description || '';
    Object.assign(desc.style, {
      fontSize: '12px',
      opacity: '0.85',
      margin: '4px 0',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word'
    });

    const acts = document.createElement('div');
    acts.style.display = 'flex';
    acts.style.gap = '8px';
    acts.style.marginTop = '5px';
    acts.style.flexWrap = 'wrap';

    const enterBtn = UIComponents.createWindowButton('进入');
    enterBtn.onclick = () => {
      this.ui.ownerInput.value = item.owner.login;
      this.ui.repoInput.value = item.name;
      this._switchMode('browse');
      this._refreshFromInputs();
    };

    const webBtn = UIComponents.createWindowButton('网页');
    webBtn.onclick = () => window.open(item.html_url);

    acts.appendChild(enterBtn);
    acts.appendChild(webBtn);

    row.appendChild(top);
    row.appendChild(desc);
    row.appendChild(acts);
    return row;
  }

  async searchRepos() {
    LoadingManager.setMessage('Searching Repos...');
    try {
      const qBase = this.ui.repoSearchInput.value.trim();
      ErrorHandler.assert(qBase, '请输入关键词');

      const parts = [qBase];
      const lang = this.ui.repoLangSelect.value;
      if (lang !== 'all') parts.push(`language:${lang}`);

      const range = (k, v) => {
        if (!v || v === 'all') return;
        if (v.includes('..')) parts.push(`${k}:${v}`);
        else if (v.includes('~')) parts.push(`${k}:${v.replace('~', '..')}`);
        else if (v.startsWith('<') || v.startsWith('>')) parts.push(`${k}:${v}`);
        else if (v.endsWith('>')) parts.push(`${k}:>${v.slice(0, -1)}`);
        else parts.push(`${k}:${v}`);
      };

      range('stars', this.ui.repoStarsSelect.value);
      range('forks', this.ui.repoForksSelect.value);
      range('followers', this.ui.repoFollowersSelect.value);
      range('size', this.ui.repoSizeSelect.value);

      const q = parts.join(' ');
      const page = this.core.repoSearchPage;
      const pp = this.ui.repoPerPageSelect.value === 'all' ? 100 : this.ui.repoPerPageSelect.value;
      const [sort, order] = this.ui.repoSortSelect.value === 'best' ? ['', ''] : this.ui.repoSortSelect.value.split('_');

      this.ui._repoPageLabel.textContent = `P ${page}`;
      this.ui.mainArea.innerHTML = '';

      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&page=${page}&per_page=${pp}` + (sort ? `&sort=${sort}&order=${order}` : '');
      const data = await this.core.apiManager.fetchJson(url);

      LoadingManager.setMessage(`Found ${data.total_count} repos. Page ${page}`);

      const listContainer = document.createElement('div');
      listContainer.style.padding = '5px';

      data.items.forEach(item => {
        const row = this._createRepoItem(item);
        listContainer.appendChild(row);
      });

      this.ui.mainArea.appendChild(listContainer);
      this.pluginManager.trigger('search:repos', data);
    } catch (e) {
      ErrorHandler.handle(e, '搜索仓库');
    }
  }

  async searchUsers() {
    LoadingManager.setMessage('Searching Users...');
    try {
      const baseQ = this.ui.userSearchInput.value.trim();
      ErrorHandler.assert(baseQ, '请输入关键词');

      const q = baseQ;
      const page = this.core.userSearchPage;
      const pp = this.ui.userPerPageSelect.value === 'all' ? 100 : this.ui.userPerPageSelect.value;
      const [sort, order] = this.ui.userSortSelect.value === 'best' ? ['', ''] : this.ui.userSortSelect.value.split('_');

      this.ui._userPageLabel.textContent = `P ${page}`;
      this.ui.mainArea.innerHTML = '';

      const url = `https://api.github.com/search/users?q=${encodeURIComponent(q)}&page=${page}&per_page=${pp}` + (sort ? `&sort=${sort}&order=${order}` : '');
      const data = await this.core.apiManager.fetchJson(url);

      LoadingManager.setMessage(`Found ${data.total_count}. Page ${page}`);

      const scroller = new VirtualScroller(this.ui.mainArea, 70);
      this.virtualScrollers.set('searchUsers', scroller);

      scroller.setItems(data.items, (item) => {
        const row = document.createElement('div');
        Object.assign(row.style, Utils.itemStyle());
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px';

        const img = document.createElement('img');
        img.src = item.avatar_url;
        Object.assign(img.style, {
          width: '40px',
          height: '40px',
          borderRadius: '50%'
        });

        const info = document.createElement('div');
        info.style.flex = '1';
        info.innerHTML = `<b>${item.login}</b><br><span style="font-size:11px;opacity:0.7">${item.html_url}</span>`;

        const btn = UIComponents.createWindowButton('详情');
        btn.onclick = () => this._showUserDetails(item.login);

        row.appendChild(img);
        row.appendChild(info);
        row.appendChild(btn);
        return row;
      });

    } catch (e) {
      ErrorHandler.handle(e, '搜索用户');
    }
  }

  async searchOrgs() {
    LoadingManager.setMessage('Searching Orgs...');
    try {
      const baseQ = this.ui.orgSearchInput.value.trim();
      ErrorHandler.assert(baseQ, '请输入关键词');

      const q = `${baseQ} type:org`;
      const page = this.core.orgSearchPage;
      const pp = this.ui.orgPerPageSelect.value === 'all' ? 100 : this.ui.orgPerPageSelect.value;
      const [sort, order] = this.ui.orgSortSelect.value === 'best' ? ['', ''] : this.ui.orgSortSelect.value.split('_');

      this.ui._orgPageLabel.textContent = `P ${page}`;
      this.ui.mainArea.innerHTML = '';

      const url = `https://api.github.com/search/users?q=${encodeURIComponent(q)}&page=${page}&per_page=${pp}` + (sort ? `&sort=${sort}&order=${order}` : '');
      const data = await this.core.apiManager.fetchJson(url);

      LoadingManager.setMessage(`Found ${data.total_count}. Page ${page}`);

      const scroller = new VirtualScroller(this.ui.mainArea, 70);
      this.virtualScrollers.set('searchOrgs', scroller);

      scroller.setItems(data.items, (item) => {
        const row = document.createElement('div');
        Object.assign(row.style, Utils.itemStyle());
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px';

        const img = document.createElement('img');
        img.src = item.avatar_url;
        Object.assign(img.style, {
          width: '40px',
          height: '40px',
          borderRadius: '12px'
        });

        const info = document.createElement('div');
        info.style.flex = '1';
        info.innerHTML = `<b>${item.login}</b><br><span style="font-size:11px;opacity:0.7">${item.html_url}</span>`;

        const btn = UIComponents.createWindowButton('详情');
        btn.onclick = () => this._showOrgDetails(item.login);

        row.appendChild(img);
        row.appendChild(info);
        row.appendChild(btn);
        return row;
      });

    } catch (e) {
      ErrorHandler.handle(e, '搜索组织');
    }
  }

  // ==================== 浏览功能 ====================

  async loadDir(path) {
    LoadingManager.setMessage(`Loading directory (${this.core.currentBranch})...`);
    try {
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);

      this.core._revokeObjectUrl();
      this.ui.pathLabel.textContent = '/' + path;
      this.ui.mainArea.innerHTML = '';

      const refParam = this.core.currentBranch ? `?ref=${this.core.currentBranch}` : '';
      const items = await this.core.apiManager.fetchJson(
        `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/contents/${path}${refParam}`
      );

      if (!Array.isArray(items)) throw new Error('Not a directory');

      items.sort((a, b) => (a.type === b.type ? 0 : a.type === 'dir' ? -1 : 1));

      const scroller = new VirtualScroller(this.ui.mainArea, 50);
      this.virtualScrollers.set('browse', scroller);

      scroller.setItems(items, (item) => {
        const row = document.createElement('div');
        Object.assign(row.style, Utils.itemStyle());
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';

        const name = document.createElement('div');
        name.textContent = (item.type === 'dir' ? '📁 ' : '📄 ') + item.name;
        Object.assign(name.style, {
          fontWeight: '500',
          cursor: 'pointer',
          wordBreak: 'break-all',
          flex: '1'
        });
        name.onclick = () => {
          if (item.type === 'dir') {
            this.core.currentPath = item.path;
            this.loadDir(item.path);
          } else {
            this.openFile(item);
          }
        };

        const acts = document.createElement('div');
        acts.style.display = 'flex';
        acts.style.gap = '6px';

        const cpBtn = UIComponents.createWindowButton('复制路径');
        cpBtn.onclick = () => Utils.copyToClipboard(item.path);

        const openBtn = UIComponents.createWindowButton(item.type === 'dir' ? '进入' : '打开');
        openBtn.onclick = name.onclick;

        acts.appendChild(cpBtn);
        acts.appendChild(openBtn);
        row.appendChild(name);
        row.appendChild(acts);
        return row;
      });

      LoadingManager.setMessage(`Loaded ${items.length} items.`);

      const readmeItem = items.find(i => i.name.toLowerCase() === 'readme.md');
      if (readmeItem) {
        this._loadFolderReadme(readmeItem.url);
      }

      this.pluginManager.trigger('dir:load', {
        path,
        items
      });
    } catch (e) {
      ErrorHandler.handle(e, '加载目录');
    }
  }

  async openFile(file) {
    LoadingManager.setMessage(`Reading ${file.name}...`);
    try {
      this.core.viewMode = 'file';
      this.core.isEditMode = false;
      this.core.currentFileSha = file.sha;
      this.ui.mainArea.innerHTML = '';

      let lastCommitInfo = '';
      try {
        const commits = await this.core.apiManager.fetchJson(
          `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/commits?path=${file.path}&per_page=1`
        );
        if (commits.length > 0) {
          const c = commits[0].commit;
          lastCommitInfo = `Last modified by ${c.author.name} on ${c.author.date.split('T')[0]}`;
        }
      } catch {}

      const mainContainer = document.createElement('div');
      mainContainer.style.display = 'flex';
      mainContainer.style.flexDirection = 'column';
      mainContainer.style.height = '100%';

      if (lastCommitInfo) {
        const anno = document.createElement('div');
        Object.assign(anno.style, {
          fontSize: '11px',
          background: 'rgba(255,255,255,0.1)',
          padding: '4px 8px',
          color: '#aaa'
        });
        anno.textContent = lastCommitInfo;
        mainContainer.appendChild(anno);
      }

      const bar = document.createElement('div');
      Object.assign(bar.style, {
        display: 'flex',
        gap: '8px',
        padding: '8px',
        borderBottom: '1px solid #444',
        flexWrap: 'wrap'
      });

      const back = UIComponents.createWindowButton('返回');
      back.onclick = () => this._goBack();

      const cpPath = UIComponents.createWindowButton('复制路径');
      cpPath.onclick = () => Utils.copyToClipboard(file.path);

      const cpCode = UIComponents.createWindowButton('复制代码');
      cpCode.disabled = true;

      const dl = UIComponents.createWindowButton('下载');
      dl.onclick = async () => {
        const b = await this.core.apiManager.fetchBlob(this.core.currentOwner, this.core.currentRepo, file.sha, file.name);
        Utils.download(b, file.name);
      };

      const del = UIComponents.createWindowButton('删除此文件', {
        background: 'rgba(255,80,80,0.25)'
      });
      del.onclick = async () => this._deleteFileWithDoubleConfirm(file.path);

      const toAI = UIComponents.createWindowButton('发送到AI');
      toAI.disabled = true;

      const editBtn = UIComponents.createWindowButton('修改模式', {
        background: 'rgba(255, 165, 0, 0.3)'
      });
      editBtn.style.display = this.core.token ? 'inline-block' : 'none';
      editBtn.onclick = () => this._toggleEditMode(file.path);

      const saveBtn = UIComponents.createWindowButton('保存修改 (上传)', {
        background: '#28a745',
        display: 'none'
      });
      saveBtn.onclick = () => this._saveFileChanges(file.path);

      const mdToggleBtn = UIComponents.createWindowButton('源码/预览');
      mdToggleBtn.style.display = 'none';

      const heatBtn = UIComponents.createWindowButton('贡献热力图', {
        background: 'rgba(200,100,255,0.2)'
      });
      heatBtn.onclick = () => this._generateFileHeatmap(file.path);

      bar.appendChild(back);
      bar.appendChild(cpPath);
      bar.appendChild(cpCode);
      bar.appendChild(dl);
      bar.appendChild(del);
      bar.appendChild(toAI);
      bar.appendChild(mdToggleBtn);
      bar.appendChild(heatBtn);
      bar.appendChild(editBtn);
      bar.appendChild(saveBtn);
      mainContainer.appendChild(bar);

      const contentBox = document.createElement('div');
      Object.assign(contentBox.style, {
        padding: '10px',
        flex: '1',
        display: 'flex',
        gap: '10px',
        overflow: 'hidden',
        position: 'relative'
      });

      const preWrap = document.createElement('div');
      Object.assign(preWrap.style, {
        flex: '1',
        overflowY: 'auto',
        minWidth: '0'
      });
      const pre = document.createElement('pre');
      Object.assign(pre.style, {
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        fontSize: '13px',
        margin: 0
      });
      preWrap.appendChild(pre);
      contentBox.appendChild(preWrap);

      const textarea = document.createElement('textarea');
      Object.assign(textarea.style, {
        flex: '1',
        width: '100%',
        height: '100%',
        display: 'none',
        background: '#1e1e1e',
        color: '#d4d4d4',
        border: 'none',
        fontFamily: 'monospace',
        fontSize: '13px',
        resize: 'none',
        padding: '5px'
      });
      contentBox.appendChild(textarea);
      this.ui.editorTextarea = textarea;

      mainContainer.appendChild(contentBox);
      this.ui.mainArea.appendChild(mainContainer);

      this.ui.fileViewRefs = {
        preWrap,
        textarea,
        saveBtn,
        editBtn,
        pre
      };

      const ext = file.name.split('.').pop().toLowerCase();
      if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) {
        const b = await this.core.apiManager.fetchBlob(this.core.currentOwner, this.core.currentRepo, file.sha, file.name);
        const url = URL.createObjectURL(b);
        this.core._objectUrlToRevoke = url;
        preWrap.innerHTML = `<img src="${url}" style="max-width:100%">`;
        editBtn.style.display = 'none';
        LoadingManager.setMessage(`Loaded image: ${file.size} bytes`);
        return;
      }

      const d = await this.core.apiManager.fetchJson(file.url);
      const text = decodeURIComponent(escape(atob(d.content.replace(/\n/g, ''))));

      if (ext === 'md' || file.name.toLowerCase() === 'readme') {
        mdToggleBtn.style.display = 'inline-block';
        this.core.isMarkdownPreview = true;
        pre.innerHTML = Utils.parseMarkdown(text, this.core.currentOwner, this.core.currentRepo, this.core.currentBranch);
        pre.style.whiteSpace = 'normal';
        mdToggleBtn.onclick = () => {
          this.core.isMarkdownPreview = !this.core.isMarkdownPreview;
          if (this.core.isMarkdownPreview) {
            pre.innerHTML = Utils.parseMarkdown(text, this.core.currentOwner, this.core.currentRepo, this.core.currentBranch);
            pre.style.whiteSpace = 'normal';
          } else {
            pre.textContent = text;
            pre.style.whiteSpace = 'pre-wrap';
          }
        };
      } else {
        pre.textContent = text;
      }

      textarea.value = text;
      cpCode.disabled = false;
      cpCode.onclick = () => {
        Utils.copyToClipboard(text);
        LoadingManager.setMessage('代码已复制');
      };

      toAI.disabled = false;
      toAI.onclick = () => {
        this._switchMode('ai');
        if (this.ui.aiPromptInput) {
          this.ui.aiPromptInput.value = `请分析下面代码并给出改进建议：\n\n${text}`;
        }
        this._renderAIOutput();
        this._renderAICacheInfo();
      };

      LoadingManager.setMessage(`Read ${file.size} bytes.`);
      this.pluginManager.trigger('file:open', {
        file,
        text
      });
    } catch (e) {
      ErrorHandler.handle(e, '打开文件');
    }
  }

  // ==================== 合并分支 ====================

  async _showMergeUI() {
    try {
      ErrorHandler.assertToken(this.core.token);
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);

      const base = prompt('Base Branch (合并到哪里):', this.core.currentBranch || 'main');
      const head = prompt('Head Branch (要合并的分支):');
      if (!base || !head) return;

      LoadingManager.setMessage('Merging branches...');
      const res = await this.core.apiManager.mergeBranch(
        this.core.currentOwner,
        this.core.currentRepo,
        base,
        head,
        `Merge ${head} into ${base} via Panel`
      );

      if (res.status === 201 || res.status === 200) {
        alert('合并成功！');
        this.loadDir('');
      } else if (res.status === 204) {
        alert('无需合并 (Already merged)');
      } else if (res.status === 409) {
        alert('合并冲突！请手动解决。');
      } else {
        const data = await res.json();
        throw new Error(data.message);
      }
    } catch (e) {
      ErrorHandler.handle(e, '合并分支');
    }
  }

  // ==================== 发起 PR ====================

  async _showCreatePRUI() {
    try {
      ErrorHandler.assertToken(this.core.token);
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);

      const base = prompt('Base Branch (接收合并的分支, 例如 main):', this.core.defaultBranch || 'main');
      if (!base) return;

      const head = prompt('Head Branch (提供修改的分支, 格式 branch 或 owner:branch):', this.core.currentBranch);
      if (!head) return;

      const title = prompt('输入 PR 标题:');
      if (!title) return;

      const body = prompt('输入 PR 描述 (可选):', 'Created via GitHub Panel Pro+');

      LoadingManager.setMessage('Creating Pull Request...');
      const res = await this.core.apiManager.createPullRequest(
        this.core.currentOwner,
        this.core.currentRepo,
        title,
        head,
        base,
        body || ''
      );

      alert(`PR 创建成功！编号: #${res.number}`);
      this._showPullRequests();
    } catch (e) {
      ErrorHandler.handle(e, '发起 PR');
    }
  }

  // ==================== Fork 仓库 ====================

  async _handleForkRepo() {
    try {
      ErrorHandler.assertToken(this.core.token);
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);

      if (!confirm(`确定要 Fork ${this.core.currentOwner}/${this.core.currentRepo} 到您的账号下吗？`)) return;

      LoadingManager.setMessage('Forking repository...');
      const res = await this.core.apiManager.forkRepo(this.core.currentOwner, this.core.currentRepo);

      alert('Fork 指令已发送！GitHub 后台处理需要一点时间。点击确定后将尝试进入新仓库。');

      this.ui.ownerInput.value = res.owner.login;
      this.ui.repoInput.value = res.name;
      setTimeout(() => this._refreshFromInputs(), 2000);
    } catch (e) {
      ErrorHandler.handle(e, 'Fork仓库');
    }
  }

  // ==================== 热力图 ====================

  async _generateFileHeatmap(path) {
    LoadingManager.setMessage('Generating heatmap...');
    try {
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);

      const commits = await this.core.apiManager.fetchJson(
        `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/commits?path=${path}&per_page=50`
      );

      const authors = {};
      const dates = {};

      commits.forEach(c => {
        const a = c.commit.author.name;
        const d = c.commit.author.date.split('T')[0];
        authors[a] = (authors[a] || 0) + 1;
        dates[d] = (dates[d] || 0) + 1;
      });

      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.8)',
        zIndex: 100001,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      });

      const card = document.createElement('div');
      Object.assign(card.style, {
        width: '500px',
        maxHeight: '80%',
        background: '#222',
        padding: '20px',
        borderRadius: '10px',
        overflowY: 'auto',
        color: '#fff'
      });

      card.innerHTML = `<h3>文件贡献热力图: ${path.split('/').pop()}</h3>`;

      const sortedAuthors = Object.entries(authors).sort((a, b) => b[1] - a[1]);
      const authDiv = document.createElement('div');
      authDiv.innerHTML = '<b>Top Contributors:</b><br>';
      sortedAuthors.slice(0, 5).forEach(([name, count]) => {
        const barW = Math.min(100, (count / sortedAuthors[0][1]) * 100);
        authDiv.innerHTML += `<div style="display:flex;align-items:center;margin:4px 0">
         <div style="width:100px;overflow:hidden">${name}</div>
         <div style="flex:1;background:#444;height:10px;border-radius:5px">
           <div style="width:${barW}%;background:#28a745;height:100%"></div>
         </div>
         <div style="width:30px;text-align:right">${count}</div>
       </div>`;
      });
      card.appendChild(authDiv);

      const dateDiv = document.createElement('div');
      dateDiv.style.marginTop = '15px';
      dateDiv.innerHTML = '<b>Recent Activity (Commits):</b><br>';
      Object.keys(dates).sort().slice(-10).forEach(d => {
        dateDiv.innerHTML += `<span style="display:inline-block;padding:2px 6px;background:#333;margin:2px;border-radius:4px">${d}: ${dates[d]}</span>`;
      });
      card.appendChild(dateDiv);

      const close = UIComponents.createWindowButton('关闭', {
        marginTop: '20px',
        width: '100%'
      });
      close.onclick = () => document.body.removeChild(overlay);
      card.appendChild(close);

      overlay.appendChild(card);
      document.body.appendChild(overlay);
      LoadingManager.setMessage('Heatmap generated.');
    } catch (e) {
      ErrorHandler.handle(e, '生成热力图');
    }
  }

  // ==================== 其他功能 ====================

  async _refreshFromInputs() {
    this.core.currentOwner = this.ui.ownerInput.value;
    this.core.currentRepo = this.ui.repoInput.value;
    this.core.currentPath = '';
    this.core.currentBranch = '';

    try {
      const meta = await this.core.apiManager.fetchJson(
        `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}`
      );
      this.core.defaultBranch = meta.default_branch;
      this.core.currentBranch = this.core.defaultBranch;
      this._loadBranches();
    } catch (e) {
      console.warn('Failed to fetch repo meta', e);
    }

    this.loadDir('');
  }

  async _loadBranches() {
    try {
      const branches = await this.core.apiManager.fetchJson(
        `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/branches`
      );
      this.ui.branchSelect.innerHTML = '';
      branches.forEach(b => {
        const op = document.createElement('option');
        op.value = b.name;
        op.textContent = b.name;
        if (b.name === this.core.currentBranch) op.selected = true;
        this.ui.branchSelect.appendChild(op);
      });
    } catch (e) {
      console.warn('Failed to load branches', e);
    }
  }

  _goBack() {
    if (this.core.viewMode !== 'list') {
      this.core.viewMode = 'list';
      this.core.isEditMode = false;
      return this.loadDir(this.core.currentPath);
    }
    if (!this.core.currentPath) return;
    this.core.currentPath = this.core.currentPath.split('/').slice(0, -1).join('/');
    this.loadDir(this.core.currentPath);
  }

  _toggleMinimize() {
    this.core.panelMode = this.core.panelMode === 'minimized' ? 'normal' : 'minimized';
    this._applyPanelMode();
  }

  _toggleFullscreen() {
    this.core.panelMode = this.core.panelMode === 'fullscreen' ? 'normal' : 'fullscreen';
    this._applyPanelMode();
  }

  _applyPanelMode() {
    if (!this.ui.panel) return;
    const s = this.ui.panel.style;
    if (this.core.panelMode === 'fullscreen') {
      s.left = '0';
      s.top = '0';
      s.width = '100vw';
      s.height = '100vh';
      s.borderRadius = '0';
      this.ui.btnFullscreen.textContent = '❐';
      this.ui._panelBody.style.display = 'flex';
    } else if (this.core.panelMode === 'minimized') {
      s.height = '46px';
      s.width = '240px';
      s.borderRadius = '12px';
      this.ui.btnMinimize.textContent = '□';
      this.ui._panelBody.style.display = 'none';
    } else {
      s.width = '720px';
      s.height = '740px';
      s.borderRadius = '12px';
      this.ui.btnMinimize.textContent = '_';
      this.ui.btnFullscreen.textContent = '□';
      this.ui._panelBody.style.display = 'flex';
    }
  }

  _renderActionRow() {
    if (!this.ui.actionRow) return;
    this.ui.actionRow.innerHTML = '';

    if (!this.core.token) {
      const t = document.createElement('span');
      t.textContent = '设置 Token 以启用写操作';
      t.style.fontSize = '12px';
      this.ui.actionRow.appendChild(t);
      return;
    }

    const btnNew = UIComponents.createWindowButton('新建文件');
    btnNew.onclick = () => this._showCreateUI();

    const btnUp = UIComponents.createWindowButton('上传文件');
    btnUp.onclick = () => this._showUploadUI();

    const btnFork = UIComponents.createWindowButton('Fork 仓库', {
      background: 'rgba(150,100,255,0.2)'
    });
    btnFork.onclick = () => this._handleForkRepo();

    this.ui.actionRow.appendChild(btnNew);
    this.ui.actionRow.appendChild(btnUp);
    this.ui.actionRow.appendChild(btnFork);
  }

  _refreshAIConfigUI() {
    if (!this.ui.aiConfigContainer) return;
    this.ui.aiConfigContainer.innerHTML = '';
    const container = this.ui.aiConfigContainer;
    const rowStyle = {
      display: 'flex',
      gap: '8px',
      marginBottom: '6px',
      alignItems: 'center',
      flexWrap: 'wrap'
    };

    if (this.core.aiProvider === 'github') {
      const r1 = document.createElement('div');
      Object.assign(r1.style, rowStyle);
      const tokenInfo = document.createElement('div');
      tokenInfo.textContent = this.core.token ? 'GitHub Token: 已设置' : 'GitHub Token: 未设置';
      tokenInfo.style.fontSize = '12px';
      tokenInfo.style.color = this.core.token ? '#8f8' : '#f88';
      const modelSel = Utils.select(['gpt-4o', 'gpt-4o-mini', 'codestral-2501', 'custom'], '模型');
      modelSel.sel.value = this.core.githubModel.startsWith('custom:') ? 'custom' : this.core.githubModel;
      const customInp = Utils.input('输入模型名称');
      customInp.style.display = modelSel.sel.value === 'custom' ? 'block' : 'none';
      if (modelSel.sel.value === 'custom') customInp.value = this.core.githubModel.replace('custom:', '');
      modelSel.sel.onchange = () => {
        if (modelSel.sel.value === 'custom') {
          customInp.style.display = 'block';
          this.core.githubModel = 'custom:' + customInp.value;
        } else {
          customInp.style.display = 'none';
          this.core.githubModel = modelSel.sel.value;
        }
      };
      customInp.oninput = () => {
        this.core.githubModel = 'custom:' + customInp.value;
      };
      r1.appendChild(tokenInfo);
      r1.appendChild(modelSel.el);
      r1.appendChild(customInp);
      container.appendChild(r1);
    } else if (this.core.aiProvider === 'custom') {
      const r1 = document.createElement('div');
      Object.assign(r1.style, rowStyle);
      const urlInp = Utils.input('API URL (完整)');
      urlInp.value = this.core.customAI.url;
      urlInp.style.flex = '2';
      urlInp.onchange = () => {
        this.core.customAI.url = urlInp.value;
        this.updateAIConfig();
      };
      const keyInp = Utils.input('API Key');
      keyInp.value = this.core.customAI.key;
      keyInp.type = 'password';
      keyInp.style.flex = '1';
      keyInp.onchange = () => {
        this.core.customAI.key = keyInp.value;
        this.updateAIConfig();
      };
      const modInp = Utils.input('Model Name');
      modInp.value = this.core.customAI.model;
      modInp.style.flex = '1';
      modInp.onchange = () => {
        this.core.customAI.model = modInp.value;
        this.updateAIConfig();
      };
      r1.appendChild(urlInp);
      r1.appendChild(keyInp);
      r1.appendChild(modInp);
      container.appendChild(r1);
    }
  }

  _renderAIOutput() {
    if (!this.ui.aiOutputPre) return;
    const err = this.core.aiManager.streamError ? `\n\n[Error]\n${this.core.aiManager.streamError}\n` : '';
    const tail = this.core.aiManager.isStreaming ? '\n\n(Streaming...)' : '';
    this.ui.aiOutputPre.textContent = (this.core.aiManager.streamBuffer || '') + err + tail;
    if (this.ui.aiOutputPre.parentElement) {
      this.ui.aiOutputPre.parentElement.scrollTop = this.ui.aiOutputPre.parentElement.scrollHeight;
    }
  }

  _renderAICacheInfo() {
    if (!this.ui.aiCacheInfo) return;
    const meta = this.core.cacheManager.repoCacheMeta;
    if (!meta.owner) {
      this.ui.aiCacheInfo.textContent = '缓存：空';
      if (this.ui.aiCacheReviewBtn) this.ui.aiCacheReviewBtn.style.display = 'none';
      return;
    }
    const age = meta.t ? Math.round((Date.now() - meta.t) / 1000) : 0;
    const kb = Math.round(meta.bytes / 1024);
    const selectedCount = this.core.cacheManager.repoCacheSelection.size;
    this.ui.aiCacheInfo.textContent = `缓存：${meta.owner}/${meta.repo} 文件:${meta.files} (选中:${selectedCount}) 文本:${kb}KB age:${age}s` + (meta.truncated ? ' (截断)' : '');
    if (this.ui.aiCacheReviewBtn) {
      this.ui.aiCacheReviewBtn.style.display = this.core.cacheManager.repoTextCache.size > 0 ? 'inline-block' : 'none';
    }
  }

  async _startAIStream(prompt) {
    LoadingManager.setMessage('AI 正在生成...');
    try {
      this.core.aiManager.streamBuffer = '';
      this.core.aiManager.streamError = null;
      this.core.aiManager.isStreaming = true;
      this._renderAIOutput();

      await this.core.aiManager.stream([{
        role: 'user',
        content: String(prompt)
      }], (chunk) => {
        this._renderAIOutput();
      });

      LoadingManager.setMessage('AI 完成');
    } catch (e) {
      if (e.name === 'AbortError') {
        LoadingManager.setMessage('AI 已停止');
      } else {
        ErrorHandler.handle(e, 'AI生成');
      }
    } finally {
      this.core.aiManager.isStreaming = false;
      this._renderAIOutput();
    }
  }

  async _startAIStreamWithSystem(system, prompt) {
    LoadingManager.setMessage('AI 正在生成...');
    try {
      this.core.aiManager.streamBuffer = '';
      this.core.aiManager.streamError = null;
      this.core.aiManager.isStreaming = true;
      this._renderAIOutput();

      await this.core.aiManager.stream([{
        role: 'system',
        content: String(system)
      }, {
        role: 'user',
        content: String(prompt)
      }], (chunk) => {
        this._renderAIOutput();
      });

      LoadingManager.setMessage('AI 完成');
    } catch (e) {
      if (e.name === 'AbortError') {
        LoadingManager.setMessage('AI 已停止');
      } else {
        ErrorHandler.handle(e, 'AI生成');
      }
    } finally {
      this.core.aiManager.isStreaming = false;
      this._renderAIOutput();
    }
  }

  async _cacheWholeRepoForAI() {
    LoadingManager.setMessage('开始递归读取仓库(危险)...');
    try {
      ErrorHandler.assertToken(this.core.token);
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);

      this.core._repoCacheAbort = false;
      this.core.cacheManager.clearRepoCache();

      const MAX_FILES = 500;
      const MAX_TOTAL_CHARS = 200000;
      const MAX_FILE_CHARS = 20000;
      const SKIP_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'mp4', 'mp3', 'wav', 'ogg', 'zip', 'rar', '7z', 'pdf', 'exe', 'dll']);

      const walk = async (path) => {
        if (this.core._repoCacheAbort) throw new Error('已中止');
        if (this.core.cacheManager.repoCacheMeta.files >= MAX_FILES) {
          this.core.cacheManager.repoCacheMeta.truncated = true;
          return;
        }
        if (this.core.cacheManager.repoCacheMeta.bytes >= MAX_TOTAL_CHARS) {
          this.core.cacheManager.repoCacheMeta.truncated = true;
          return;
        }

        const items = await this.core.apiManager.fetchJson(
          `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/contents/${path}?ref=${this.core.currentBranch}`
        );

        if (!Array.isArray(items)) return;

        for (const it of items) {
          if (this.core._repoCacheAbort) throw new Error('已中止');
          if (this.core.cacheManager.repoCacheMeta.files >= MAX_FILES) {
            this.core.cacheManager.repoCacheMeta.truncated = true;
            return;
          }
          if (this.core.cacheManager.repoCacheMeta.bytes >= MAX_TOTAL_CHARS) {
            this.core.cacheManager.repoCacheMeta.truncated = true;
            return;
          }

          if (it.type === 'dir') {
            this.core.cacheManager.repoTextCache.set(it.path, {
              type: 'dir'
            });
            await walk(it.path);
          } else if (it.type === 'file') {
            const ext = (it.name.split('.').pop() || '').toLowerCase();
            if (SKIP_EXT.has(ext)) continue;

            try {
              const d = await this.core.apiManager.fetchJson(it.url);
              if (!d || !d.content) continue;

              let text = '';
              try {
                text = decodeURIComponent(escape(atob(String(d.content).replace(/\n/g, ''))));
              } catch {
                continue;
              }

              if (text.length > MAX_FILE_CHARS) {
                text = text.slice(0, MAX_FILE_CHARS) + '\n\n[TRUNCATED]';
              }

              this.core.cacheManager.repoTextCache.set(it.path, {
                type: 'file',
                text,
                size: it.size || 0
              });
              this.core.cacheManager.repoCacheSelection.add(it.path);
              this.core.cacheManager.repoCacheMeta.files += 1;
              this.core.cacheManager.repoCacheMeta.bytes += text.length;
              this.core.cacheManager.repoCacheMeta.t = Date.now();

              this._renderAICacheInfo();
            } catch (e) {
              console.warn('Failed to cache file', it.path, e);
            }
          }
        }
      };

      await walk('');
      LoadingManager.setMessage('仓库递归读取完成' + (this.core.cacheManager.repoCacheMeta.truncated ? '（已截断）' : ''));
    } catch (e) {
      ErrorHandler.handle(e, '缓存仓库');
    } finally {
      this.core.cacheManager.repoCacheMeta.t = Date.now();
      this._renderAICacheInfo();
    }
  }

  _showCacheReviewUI() {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.8)',
      zIndex: '100000',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    });

    const card = document.createElement('div');
    Object.assign(card.style, {
      width: '500px',
      maxHeight: '80%',
      background: '#222',
      border: '1px solid #555',
      borderRadius: '10px',
      display: 'flex',
      flexDirection: 'column',
      padding: '15px',
      color: '#fff'
    });

    const title = document.createElement('h3');
    title.textContent = `选择发送给AI的文件 (${this.core.cacheManager.repoCacheSelection.size}/${this.core.cacheManager.repoTextCache.size})`;
    title.style.marginTop = '0';

    const listWrap = document.createElement('div');
    Object.assign(listWrap.style, {
      flex: '1',
      overflowY: 'auto',
      border: '1px solid #444',
      margin: '10px 0',
      padding: '5px'
    });

    const files = Array.from(this.core.cacheManager.repoTextCache.entries())
      .filter(e => e[1].type === 'file')
      .sort((a, b) => a[0].localeCompare(b[0]));

    const scroller = new VirtualScroller(listWrap, 30);
    scroller.setItems(files, ([path, info]) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.padding = '2px';

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = this.core.cacheManager.repoCacheSelection.has(path);
      chk.onchange = () => {
        if (chk.checked) this.core.cacheManager.repoCacheSelection.add(path);
        else this.core.cacheManager.repoCacheSelection.delete(path);
        title.textContent = `选择发送给AI的文件 (${this.core.cacheManager.repoCacheSelection.size}/${this.core.cacheManager.repoTextCache.size})`;
      };

      const lbl = document.createElement('span');
      lbl.textContent = `${path} (${Math.round(info.size/1024)}KB)`;
      lbl.style.marginLeft = '8px';
      lbl.style.fontSize = '12px';
      lbl.onclick = () => chk.click();

      row.appendChild(chk);
      row.appendChild(lbl);
      return row;
    });

    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.justifyContent = 'flex-end';
    btns.style.gap = '10px';

    const closeBtn = UIComponents.createWindowButton('完成');
    closeBtn.onclick = () => {
      document.body.removeChild(overlay);
      this._renderAICacheInfo();
    };

    const selectAll = UIComponents.createWindowButton('全选');
    selectAll.onclick = () => {
      files.forEach(([p]) => this.core.cacheManager.repoCacheSelection.add(p));
      document.body.removeChild(overlay);
      this._showCacheReviewUI();
    };

    const selectNone = UIComponents.createWindowButton('全不选');
    selectNone.onclick = () => {
      this.core.cacheManager.repoCacheSelection.clear();
      document.body.removeChild(overlay);
      this._showCacheReviewUI();
    };

    btns.appendChild(selectAll);
    btns.appendChild(selectNone);
    btns.appendChild(closeBtn);

    card.appendChild(title);
    card.appendChild(listWrap);
    card.appendChild(btns);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // ==================== 其他功能 ====================

  _downloadRepoZip() {
    if (!this.core.currentOwner || !this.core.currentRepo) {
      alert('未进入仓库');
      return;
    }
    const url = `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/zipball/${this.core.currentBranch}`;
    window.open(url, '_blank');
  }

  async _showRepoHistory() {
    LoadingManager.setMessage('Loading commits...');
    try {
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);
      this.ui.mainArea.innerHTML = '';

      const commits = await this.core.apiManager.fetchJson(
        `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/commits?sha=${this.core.currentBranch}&per_page=30`
      );

      const scroller = new VirtualScroller(this.ui.mainArea, 60);
      scroller.setItems(commits, (c) => {
        const row = document.createElement('div');
        Object.assign(row.style, Utils.itemStyle());
        const msg = c.commit.message.split('\n')[0];
        row.innerHTML = `<div style="font-weight:bold">${msg}</div>
         <div style="font-size:11px;opacity:0.7">${c.commit.author.name} - ${c.commit.author.date.split('T')[0]} 
         <span style="font-family:monospace;background:#333;padding:2px">${c.sha.substring(0,7)}</span></div>`;
        return row;
      });

      const back = UIComponents.createWindowButton('Back');
      back.onclick = () => this._goBack();
      this.ui.mainArea.insertBefore(back, this.ui.mainArea.firstChild);

      LoadingManager.setMessage('History loaded.');
    } catch (e) {
      ErrorHandler.handle(e, '加载历史');
    }
  }

  async _showPullRequests() {
    LoadingManager.setMessage('Loading PRs...');
    try {
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);
      this.ui.mainArea.innerHTML = '';

      const prs = await this.core.apiManager.fetchJson(
        `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/pulls?state=open`
      );

      if (prs.length === 0) {
        this.ui.mainArea.innerHTML = '<div style="padding:10px">No open PRs.</div>';
      }

      const scroller = new VirtualScroller(this.ui.mainArea, 60);
      scroller.setItems(prs, (pr) => {
        const row = document.createElement('div');
        Object.assign(row.style, Utils.itemStyle());
        row.innerHTML = `<div style="font-weight:bold">#${pr.number} ${pr.title}</div>
         <div style="font-size:11px;opacity:0.7">by ${pr.user.login} - ${pr.created_at.split('T')[0]}</div>`;
        row.onclick = () => window.open(pr.html_url);
        return row;
      });

      const back = UIComponents.createWindowButton('Back');
      back.onclick = () => this._goBack();
      this.ui.mainArea.insertBefore(back, this.ui.mainArea.firstChild);

      LoadingManager.setMessage('PRs loaded.');
    } catch (e) {
      ErrorHandler.handle(e, '加载PRs');
    }
  }

  async _showCreateBranchUI() {
    try {
      ErrorHandler.assertToken(this.core.token);
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);

      const name = prompt('新建分支名称 (基于当前分支):');
      if (!name) return;

      LoadingManager.setMessage('Creating branch...');
      const ref = await this.core.apiManager.fetchJson(
        `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/git/ref/heads/${this.core.currentBranch}`
      );
      const sha = ref.object.sha;

      await fetch(`https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/git/refs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.core.apiManager.headers
        },
        body: JSON.stringify({
          ref: `refs/heads/${name}`,
          sha: sha
        })
      });

      alert('分支创建成功');
      this.core.currentBranch = name;
      this._loadBranches();
      this.loadDir('');
    } catch (e) {
      ErrorHandler.handle(e, '创建分支');
    }
  }

  async _showRepoContributors() {
    LoadingManager.setMessage('Loading contributors...');
    try {
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);
      this.ui.mainArea.innerHTML = '';

      const contributors = await this.core.apiManager.fetchJson(
        `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/contributors`
      );

      const scroller = new VirtualScroller(this.ui.mainArea, 50);
      scroller.setItems(contributors, (c) => {
        const row = document.createElement('div');
        Object.assign(row.style, Utils.itemStyle());
        row.innerHTML = `<b>${c.login}</b>: ${c.contributions}`;
        return row;
      });

      const back = UIComponents.createWindowButton('Back');
      back.onclick = () => this._goBack();
      this.ui.mainArea.insertBefore(back, this.ui.mainArea.firstChild);
    } catch (e) {
      ErrorHandler.handle(e, '加载贡献者');
    }
  }

  async _showRepoActivity() {
    LoadingManager.setMessage('Loading activity...');
    try {
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);
      this.ui.mainArea.innerHTML = '';

      const events = await this.core.apiManager.fetchJson(
        `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/events`
      );

      const scroller = new VirtualScroller(this.ui.mainArea, 50);
      scroller.setItems(events, (e) => {
        const row = document.createElement('div');
        Object.assign(row.style, Utils.itemStyle());
        row.innerHTML = `<div style="font-size:12px;opacity:0.6">${e.created_at}</div>
         <div><b>${e.actor.login}</b> ${e.type}</div>`;
        return row;
      });

      const back = UIComponents.createWindowButton('Back');
      back.onclick = () => this._goBack();
      this.ui.mainArea.insertBefore(back, this.ui.mainArea.firstChild);
    } catch (e) {
      ErrorHandler.handle(e, '加载活动');
    }
  }

  async _showAddFolderUI() {
    try {
      ErrorHandler.assertToken(this.core.token);
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);

      const folder = prompt('输入要创建的文件夹名（相对当前路径）\n将创建: 文件夹/README.md', 'new-folder');
      if (!folder) return;

      const safe = folder.replace(/^\/+|\/+$/g, '');
      if (!safe) return;

      const basePath = this.core.currentPath ? `${this.core.currentPath}/${safe}` : safe;
      const readmePath = `${basePath}/README.md`;
      const content = `# ${safe}\n\nCreated by GitHub Panel.\n`;

      await this.core.apiManager.putFile(
        this.core.currentOwner,
        this.core.currentRepo,
        readmePath,
        btoa(unescape(encodeURIComponent(content))),
        `Create folder ${safe} with README`,
        this.core.currentBranch
      );

      await this.loadDir(this.core.currentPath);
    } catch (e) {
      ErrorHandler.handle(e, '创建文件夹');
    }
  }

  async _showDeleteFileUI() {
    try {
      ErrorHandler.assertToken(this.core.token);
      ErrorHandler.assertRepo(this.core.currentOwner, this.core.currentRepo);

      const p = prompt('输入要删除的文件路径（相对仓库根目录）\n注意：将进行二次确认', this.core.currentPath ? `${this.core.currentPath}/` : '');
      if (!p) return;

      const path = p.replace(/^\/+/, '');
      await this._deleteFileWithDoubleConfirm(path);
    } catch (e) {
      ErrorHandler.handle(e, '删除文件');
    }
  }

  async _deleteFileWithDoubleConfirm(path) {
    try {
      ErrorHandler.assertToken(this.core.token);
      if (!path) return;

      const ok1 = confirm(`确认删除文件？\n${path}`);
      if (!ok1) return;

      const ok2 = confirm(`再次确认（不可撤销）删除：\n${path}\n\n真的要删除吗？`);
      if (!ok2) return;

      LoadingManager.setMessage('Deleting file...');
      await this._deleteFile(path, `Delete ${path}`);
      await this.loadDir(this.core.currentPath);
    } catch (e) {
      ErrorHandler.handle(e, '删除文件');
    }
  }

  async _deleteFile(path, message) {
    try {
      const meta = await this.core.apiManager.fetchJson(
        `https://api.github.com/repos/${this.core.currentOwner}/${this.core.currentRepo}/contents/${path}?ref=${this.core.currentBranch}`
      );
      const sha = meta.sha;
      if (!sha) throw new Error('无法获取文件 SHA');

      await this.core.apiManager.deleteFile(
        this.core.currentOwner,
        this.core.currentRepo,
        path,
        sha,
        this.core.currentBranch,
        message
      );

      LoadingManager.setMessage('删除成功');
    } catch (e) {
      ErrorHandler.handle(e, '删除文件');
    }
  }

  _showCreateUI() {
    this.core.viewMode = 'create';
    this.ui.mainArea.innerHTML = '';

    const div = document.createElement('div');
    div.style.padding = '10px';

    const path = Utils.input('Path (e.g. dir/file.txt)');
    const content = document.createElement('textarea');
    Object.assign(content.style, {
      width: '100%',
      height: '200px',
      background: 'rgba(0,0,0,0.3)',
      color: '#fff',
      border: '1px solid #555'
    });

    const btn = UIComponents.createWindowButton('Commit');
    btn.onclick = async () => {
      try {
        ErrorHandler.assert(path.value, '请输入路径');
        await this.core.apiManager.putFile(
          this.core.currentOwner,
          this.core.currentRepo,
          path.value,
          btoa(unescape(encodeURIComponent(content.value))),
          'Create file',
          this.core.currentBranch
        );
        this._goBack();
      } catch (e) {
        ErrorHandler.handle(e, '创建文件');
      }
    };

    div.appendChild(path);
    div.appendChild(document.createElement('br'));
    div.appendChild(content);
    div.appendChild(document.createElement('br'));
    div.appendChild(btn);
    this.ui.mainArea.appendChild(div);
  }

  _showUploadUI() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;

      try {
        const ab = await f.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
        await this.core.apiManager.putFile(
          this.core.currentOwner,
          this.core.currentRepo,
          this.core.currentPath ? this.core.currentPath + '/' + f.name : f.name,
          b64,
          'Upload',
          this.core.currentBranch,
          null,
          true
        );
        this.loadDir(this.core.currentPath);
      } catch (e) {
        ErrorHandler.handle(e, '上传文件');
      }
    };
    inp.click();
  }

  async _loadMyRepos() {
    LoadingManager.setMessage('Loading my repos...');
    try {
      ErrorHandler.assertToken(this.core.token);
      this.ui.mainArea.innerHTML = '';

      const repos = await this.core.apiManager.fetchJson(
        'https://api.github.com/user/repos?per_page=100&sort=updated&type=all'
      );

      const createContainer = document.createElement('div');
      Object.assign(createContainer.style, {
        padding: '10px',
        marginBottom: '10px',
        borderBottom: '1px solid #444',
        display: 'flex',
        gap: '10px'
      });

      const createBtn = UIComponents.createWindowButton('+ 新建仓库', {
        background: '#28a745'
      });
      createBtn.onclick = () => this._showCreateRepoUI();

      const refreshBtn = UIComponents.createWindowButton('刷新');
      refreshBtn.onclick = () => this._loadMyRepos();

      createContainer.appendChild(createBtn);
      createContainer.appendChild(refreshBtn);
      this.ui.mainArea.appendChild(createContainer);

      const listContainer = document.createElement('div');
      listContainer.style.padding = '5px';

      repos.forEach(r => {
        const row = document.createElement('div');
        Object.assign(row.style, Utils.itemStyle());

        const top = document.createElement('div');
        top.style.display = 'flex';
        top.style.justifyContent = 'space-between';
        top.innerHTML = `<div><b>${r.name}</b> <span style="font-size:0.8em;opacity:0.7">${r.private ? '🔒Private' : 'Public'}</span></div>`;

        const desc = document.createElement('div');
        desc.textContent = r.description || '';
        Object.assign(desc.style, {
          fontSize: '12px',
          opacity: '0.8',
          margin: '4px 0'
        });

        const acts = document.createElement('div');
        acts.style.display = 'flex';
        acts.style.gap = '8px';

        const enterBtn = UIComponents.createWindowButton('进入');
        enterBtn.onclick = () => {
          this.ui.ownerInput.value = r.owner.login;
          this.ui.repoInput.value = r.name;
          this._switchMode('browse');
          this._refreshFromInputs();
        };

        const delBtn = UIComponents.createWindowButton('删除', {
          background: 'rgba(255,80,80,0.2)'
        });
        delBtn.onclick = () => this._deleteRepoSequence(r.full_name);

        acts.appendChild(enterBtn);
        acts.appendChild(delBtn);
        row.appendChild(top);
        row.appendChild(desc);
        row.appendChild(acts);
        listContainer.appendChild(row);
      });

      this.ui.mainArea.appendChild(listContainer);
      LoadingManager.setMessage(`Loaded ${repos.length} repos.`);
    } catch (e) {
      ErrorHandler.handle(e, '加载我的仓库');
    }
  }

  _showCreateRepoUI() {
    this.ui.mainArea.innerHTML = '';

    const c = document.createElement('div');
    c.style.padding = '15px';

    const title = document.createElement('h3');
    title.textContent = '新建仓库';

    const nameInp = Utils.input('仓库名称 (Name)');
    nameInp.style.width = '100%';
    nameInp.style.marginBottom = '10px';

    const descInp = Utils.input('描述 (Description)');
    descInp.style.width = '100%';
    descInp.style.marginBottom = '10px';

    const privLabel = document.createElement('label');
    const privCheck = document.createElement('input');
    privCheck.type = 'checkbox';
    privLabel.appendChild(privCheck);
    privLabel.appendChild(document.createTextNode(' 私有仓库 (Private)'));

    const submitBtn = UIComponents.createWindowButton('创建', {
      marginTop: '15px',
      background: '#28a745'
    });
    submitBtn.onclick = async () => {
      try {
        ErrorHandler.assert(nameInp.value, '请输入名称');
        await this._createRepo({
          name: nameInp.value,
          description: descInp.value,
          private: privCheck.checked,
          auto_init: true
        });
      } catch (e) {
        ErrorHandler.handle(e, '创建仓库');
      }
    };

    const backBtn = UIComponents.createWindowButton('取消');
    backBtn.onclick = () => this._loadMyRepos();

    c.appendChild(title);
    c.appendChild(nameInp);
    c.appendChild(descInp);
    c.appendChild(privLabel);
    c.appendChild(document.createElement('br'));
    c.appendChild(submitBtn);
    c.appendChild(backBtn);
    this.ui.mainArea.appendChild(c);
  }

  async _createRepo(data) {
    LoadingManager.setMessage('Creating repo...');
    try {
      ErrorHandler.assertToken(this.core.token);

      const res = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.core.apiManager.headers
        },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error((await res.json()).message || 'Failed');

      alert('仓库创建成功！');
      this._loadMyRepos();
    } catch (e) {
      ErrorHandler.handle(e, '创建仓库');
    }
  }

  async _deleteRepoSequence(fullName) {
    try {
      ErrorHandler.assertToken(this.core.token);

      if (!confirm(`确定要删除仓库 ${fullName} 吗？`)) return;
      if (!confirm(`警告：此操作不可恢复！\n真的要删除 ${fullName} 吗？`)) return;

      const confirmStr = `删除 ${fullName}`;
      const input = prompt(`最后确认：请输入 "${confirmStr}" 以确认删除。`);
      if (input !== confirmStr) {
        alert('输入不匹配，取消删除。');
        return;
      }

      LoadingManager.setMessage(`Deleting ${fullName}...`);
      const res = await fetch(`https://api.github.com/repos/${fullName}`, {
        method: 'DELETE',
        headers: this.core.apiManager.headers
      });

      if (res.status === 204 || res.ok) {
        alert('删除成功');
        this._loadMyRepos();
      } else {
        throw new Error((await res.json()).message || 'Failed');
      }
    } catch (e) {
      ErrorHandler.handle(e, '删除仓库');
    }
  }

  async _showOrgDetails(login) {
    this._showProfile(login, true);
  }

  async _showUserDetails(login) {
    this._showProfile(login, false);
  }

  async _showProfile(login, isOrg) {
    LoadingManager.setMessage(`Loading ${login}...`);
    try {
      this.ui.mainArea.innerHTML = '';

      const profileRepo = isOrg ? '.github' : login;
      const [meta, readme] = await Promise.all([
        this.core.apiManager.fetchJson(`https://api.github.com/${isOrg ? 'orgs' : 'users'}/${login}`),
        this._fetchReadme(login, profileRepo)
      ]);

      const wrap = document.createElement('div');
      wrap.style.padding = '8px';

      const head = document.createElement('div');
      Object.assign(head.style, {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '12px'
      });

      const img = document.createElement('img');
      img.src = meta.avatar_url;
      Object.assign(img.style, {
        width: '64px',
        height: '64px',
        borderRadius: isOrg ? '12px' : '50%'
      });

      const ht = document.createElement('div');
      ht.innerHTML = `<div style="font-size:18px;font-weight:bold">${meta.name || login}</div>
       <div style="opacity:0.7">@${login}</div>`;

      const backBtn = UIComponents.createWindowButton('返回', {
        marginLeft: 'auto'
      });
      backBtn.onclick = () => {
        this.ui.mainArea.innerHTML = '';
        this._switchSearchDir(isOrg ? 'org' : 'user');
      };

      head.appendChild(img);
      head.appendChild(ht);
      head.appendChild(backBtn);
      wrap.appendChild(head);

      const readBox = document.createElement('div');
      Object.assign(readBox.style, {
        background: 'rgba(255,255,255,0.05)',
        padding: '10px',
        borderRadius: '8px',
        marginBottom: '12px'
      });
      readBox.innerHTML = `<div style="font-weight:bold;margin-bottom:6px">README</div>`;

      const pre = document.createElement('div');
      Object.assign(pre.style, {
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: '13px',
        margin: '0'
      });
      const rawReadme = readme || (isOrg ? 'No organization profile README found (.github)' : 'No profile README found (username/username)');
      pre.innerHTML = Utils.parseMarkdown(rawReadme);
      readBox.appendChild(pre);
      wrap.appendChild(readBox);

      const viewReposBtn = UIComponents.createWindowButton('查看该用户/组织的仓库', {
        width: '100%'
      });
      viewReposBtn.onclick = () => {
        this._switchMode('search');
        this._switchSearchDir('repo');
        this.ui.repoSearchInput.value = `user:${login}`;
        this.searchRepos();
      };
      wrap.appendChild(viewReposBtn);

      this.ui.mainArea.appendChild(wrap);
      LoadingManager.setMessage('Loaded.');
    } catch (e) {
      ErrorHandler.handle(e, '加载用户/组织信息');
    }
  }

  async _fetchReadme(owner, repo) {
    try {
      const u = `https://api.github.com/repos/${owner}/${repo || owner}/readme`;
      const d = await this.core.apiManager.fetchJson(u);
      return decodeURIComponent(escape(atob(d.content.replace(/\n/g, ''))));
    } catch {
      return null;
    }
  }

  async _loadTrending(period) {
    LoadingManager.setMessage(`Loading trending repos for ${period}...`);
    try {
      const d = new Date();
      if (period === 'week') d.setDate(d.getDate() - 7);
      else if (period === 'month') d.setMonth(d.getMonth() - 1);
      const dateStr = d.toISOString().split('T')[0];
      const q = `created:>${dateStr}`;
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`;

      const data = await this.core.apiManager.fetchJson(url);
      LoadingManager.setMessage(`Found ${data.total_count} trending repos since ${dateStr}.`);

      const listContainer = document.createElement('div');
      listContainer.style.padding = '5px';

      data.items.forEach(item => {
        const row = this._createRepoItem(item);
        listContainer.appendChild(row);
      });

      this.ui.mainArea.innerHTML = '';
      this.ui.mainArea.appendChild(listContainer);
    } catch (e) {
      ErrorHandler.handle(e, '加载热门项目');
    }
  }

  async _loadFolderReadme(url) {
    try {
      const d = await this.core.apiManager.fetchJson(url);
      const text = decodeURIComponent(escape(atob(d.content.replace(/\n/g, ''))));

      const readmeBox = document.createElement('div');
      Object.assign(readmeBox.style, {
        marginTop: '15px',
        padding: '10px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)'
      });

      const header = document.createElement('div');
      header.textContent = 'README.md';
      header.style.fontWeight = 'bold';
      header.style.marginBottom = '10px';
      header.style.opacity = '0.7';

      const content = document.createElement('div');
      content.style.fontSize = '13px';
      content.innerHTML = Utils.parseMarkdown(text);

      readmeBox.appendChild(header);
      readmeBox.appendChild(content);
      this.ui.mainArea.appendChild(readmeBox);
    } catch (e) {
      console.warn('Failed to load folder readme', e);
    }
  }

  _toggleEditMode(path) {
    if (!this.ui.fileViewRefs) return;
    this.core.isEditMode = !this.core.isEditMode;
    const {
      preWrap,
      textarea,
      saveBtn,
      editBtn,
      pre
    } = this.ui.fileViewRefs;

    if (this.core.isEditMode) {
      preWrap.style.display = 'none';
      textarea.style.display = 'block';
      saveBtn.style.display = 'inline-block';
      editBtn.textContent = '取消修改';
      editBtn.style.background = '#666';
      LoadingManager.setMessage('进入修改模式。');
    } else {
      preWrap.style.display = 'block';
      textarea.style.display = 'none';
      saveBtn.style.display = 'none';
      editBtn.textContent = '修改模式';
      editBtn.style.background = 'rgba(255, 165, 0, 0.3)';
    }
  }

  async _saveFileChanges(path) {
    if (!this.ui.editorTextarea) return;

    try {
      const content = this.ui.editorTextarea.value;
      const msg = prompt('请输入提交信息 (Commit Message)', 'Update file via GitHub Panel');
      if (!msg) return;

      LoadingManager.setMessage('Uploading changes...');
      const data = await this.core.apiManager.putFile(
        this.core.currentOwner,
        this.core.currentRepo,
        path,
        btoa(unescape(encodeURIComponent(content))),
        msg,
        this.core.currentBranch,
        this.core.currentFileSha
      );

      this.core.currentFileSha = data.content.sha;
      alert('保存成功！');
      LoadingManager.setMessage('Saved.');

      if (this.ui.fileViewRefs.pre) {
        this.ui.fileViewRefs.pre.textContent = content;
      }
      this._toggleEditMode(path);
    } catch (e) {
      ErrorHandler.handle(e, '保存文件');
    }
  }
}

// ==================== 注册扩展 ====================

Scratch.extensions.register(new GitHubPanelExtension());
