(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('“图片去背景”扩展需要在非沙盒模式下加载');
  }

  const EXT_ID = 'bgRemoverPanel';
  const CDN = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.8/dist/';
  const vm = Scratch.vm;  

  const state = {
    root: null,
    lib: null,
    libPromise: null,
    modelStatus: 'idle', // idle | loading | ready | fallback
    modelProgress: 0,
    busy: false,
    statusText: '等待上传图片',
    sourceURL: '',
    resultURL: '',
    fileName: 'image',
    lastError: ''
  };

  const ui = {};


  function loadLib() {
    if (state.lib) return Promise.resolve(state.lib);
    if (state.libPromise) return state.libPromise;
    state.modelStatus = 'loading';
    setStatus('正在加载本地 AI 模型运行库…');
    state.libPromise = import(/* webpackIgnore: true */ CDN + 'browser.mjs')
      .then((mod) => {
        state.lib = mod;
        state.modelStatus = 'ready';
        setStatus('本地模型运行库已就绪');
        return mod;
      })
      .catch((err) => {
        state.libPromise = null;
        state.modelStatus = 'fallback';
        state.lastError = String(err && err.message ? err.message : err);
        throw err;
      });
    return state.libPromise;
  }

  function runModel(file) {
    return loadLib().then((lib) =>
      lib.removeBackground(file, {
        publicPath: CDN,
        model: 'isnet_fp16',
        output: { format: 'image/png', quality: 1 },
        progress: (key, current, total) => {
          if (total > 0) {
            state.modelProgress = Math.round((current / total) * 100);
          }
          if (String(key).indexOf('fetch') === 0) {
            setStatus('正在下载本地模型文件 ' + state.modelProgress + '%');
          } else {
            setStatus('AI 正在识别主体 ' + state.modelProgress + '%');
          }
        }
      })
    );
  }


  function fallbackRemove(img) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h);
    const px = data.data;
    const visited = new Uint8Array(w * h);
    const tolerance = 42 * 42 * 3;
    const stack = [];
    const seeds = [0, w - 1, (h - 1) * w, h * w - 1];
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i] * 4;
      stack.push({ idx: seeds[i], r: px[s], g: px[s + 1], b: px[s + 2] });
    }
    while (stack.length) {
      const node = stack.pop();
      const idx = node.idx;
      if (visited[idx]) continue;
      visited[idx] = 1;
      const o = idx * 4;
      const dr = px[o] - node.r;
      const dg = px[o + 1] - node.g;
      const db = px[o + 2] - node.b;
      if (dr * dr + dg * dg + db * db > tolerance) continue;
      px[o + 3] = 0;
      const x = idx % w;
      const y = (idx - x) / w;
      if (x > 0) stack.push({ idx: idx - 1, r: node.r, g: node.g, b: node.b });
      if (x < w - 1) stack.push({ idx: idx + 1, r: node.r, g: node.g, b: node.b });
      if (y > 0) stack.push({ idx: idx - w, r: node.r, g: node.g, b: node.b });
      if (y < h - 1) stack.push({ idx: idx + w, r: node.r, g: node.g, b: node.b });
    }
    ctx.putImageData(data, 0, 0);
    return canvas.toDataURL('image/png');
  }


  function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('读取结果失败'));
      reader.readAsDataURL(blob);
    });
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片解码失败'));
      img.src = url;
    });
  }

  function dataURLToBytes(dataURL) {
    const base64 = String(dataURL).split(',')[1] || '';
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  function uniqueCostumeName(target, base) {
    const names = target.getCostumes().map((c) => c.name);
    if (names.indexOf(base) === -1) return base;
    let i = 2;
    while (names.indexOf(base + i) !== -1) i++;
    return base + i;
  }

  function saveResultToTarget(target, name) {
    if (!state.resultURL) return Promise.reject(new Error('还没有去背景结果'));
    if (!target) return Promise.reject(new Error('找不到目标角色'));
    const storage = vm.runtime.storage;
    const asset = storage.createAsset(
      storage.AssetType.ImageBitmap,
      storage.DataFormat.PNG,
      dataURLToBytes(state.resultURL),
      null,
      true // 自动计算 md5 assetId
    );
    const md5ext = asset.assetId + '.' + storage.DataFormat.PNG;
    return loadImage(state.resultURL).then((img) => {
      const costume = {
        name: uniqueCostumeName(target, name || state.fileName + '-no-bg'),
        dataFormat: storage.DataFormat.PNG,
        asset: asset,
        md5: md5ext,
        assetId: asset.assetId,
        bitmapResolution: 1,
        rotationCenterX: img.naturalWidth / 2,
        rotationCenterY: img.naturalHeight / 2
      };
      return Promise.resolve(vm.addCostume(md5ext, costume, target.id)).then(() => costume.name);
    });
  }

  function setStatus(text) {
    state.statusText = text;
    if (ui.status) ui.status.textContent = text;
    if (ui.bar) ui.bar.style.width = state.modelProgress + '%';
  }


  const CHECKER =
    'linear-gradient(45deg,#e6e6e6 25%,transparent 25%,transparent 75%,#e6e6e6 75%),' +
    'linear-gradient(45deg,#e6e6e6 25%,transparent 25%,transparent 75%,#e6e6e6 75%)';

  function buildPanel() {
    const root = document.createElement('div');
    root.style.cssText =
      'position:fixed;top:60px;left:60px;z-index:2147483000;width:520px;background:#fff;' +
      'border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.28);font:14px/1.5 system-ui,sans-serif;color:#1f2937;overflow:hidden';

    const header = document.createElement('div');
    header.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;' +
      'background:#2563eb;color:#fff;cursor:move;user-select:none';
    header.innerHTML = '<strong>图片去背景（本地模型）</strong>';
    const close = document.createElement('button');
    close.textContent = '×';
    close.setAttribute('aria-label', '关闭面板');
    close.style.cssText =
      'border:0;background:transparent;color:#fff;font-size:20px;line-height:1;cursor:pointer';
    close.onclick = closePanel;
    header.appendChild(close);

    const body = document.createElement('div');
    body.style.cssText = 'padding:14px;display:flex;flex-direction:column;gap:12px';

    const drop = document.createElement('label');
    drop.style.cssText =
      'display:block;padding:18px;text-align:center;border:2px dashed #93c5fd;border-radius:10px;' +
      'background:#f8fafc;cursor:pointer;color:#475569';
    drop.textContent = '点击选择图片，或把图片拖到这里（JPG / PNG / WebP）';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.style.display = 'none';
    drop.appendChild(input);
    input.onchange = () => {
      if (input.files && input.files[0]) handleFile(input.files[0]);
    };
    drop.ondragover = (e) => {
      e.preventDefault();
      drop.style.background = '#eff6ff';
    };
    drop.ondragleave = () => {
      drop.style.background = '#f8fafc';
    };
    drop.ondrop = (e) => {
      e.preventDefault();
      drop.style.background = '#f8fafc';
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    };

    const preview = document.createElement('div');
    preview.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px';
    ui.before = makeThumb('原图');
    ui.after = makeThumb('去背景');
    preview.appendChild(ui.before.box);
    preview.appendChild(ui.after.box);

    const status = document.createElement('div');
    status.style.cssText = 'font-size:12px;color:#475569;min-height:18px';
    status.textContent = state.statusText;

    const track = document.createElement('div');
    track.style.cssText = 'height:6px;border-radius:99px;background:#e5e7eb;overflow:hidden';
    const bar = document.createElement('div');
    bar.style.cssText = 'height:100%;width:0%;background:#2563eb;transition:width .2s';
    track.appendChild(bar);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap';
    const preload = mkButton('预加载模型', '#e5e7eb', '#111827');
    preload.onclick = () => {
      loadLib().catch(() => setStatus('模型运行库加载失败，将使用本地兜底抠图：' + state.lastError));
    };
    const toCostume = mkButton('存为当前角色造型', '#16a34a', '#fff');
    toCostume.disabled = true;
    toCostume.style.opacity = '.5';
    toCostume.onclick = () => {
      saveResultToTarget(vm.editingTarget, '')
        .then((n) => setStatus('已添加造型：' + n))
        .catch((e) => setStatus('保存造型失败：' + (e && e.message ? e.message : e)));
    };
    const download = mkButton('下载透明 PNG', '#2563eb', '#fff');
    download.disabled = true;
    download.style.opacity = '.5';
    download.onclick = downloadResult;
    actions.appendChild(preload);
    actions.appendChild(toCostume);
    actions.appendChild(download);

    body.appendChild(drop);
    body.appendChild(preview);
    body.appendChild(status);
    body.appendChild(track);
    body.appendChild(actions);
    root.appendChild(header);
    root.appendChild(body);

    // 保存UI引用
    ui.status = status;
    ui.bar = bar;
    ui.download = download;
    ui.toCostume = toCostume;   // 新增
    ui.input = input;

    makeDraggable(root, header);
    document.body.appendChild(root);
    state.root = root;
    return root;
  }

  function makeThumb(title) {
    const box = document.createElement('div');
    box.style.cssText = 'border:1px solid #e5e7eb;border-radius:10px;overflow:hidden';
    const cap = document.createElement('div');
    cap.textContent = title;
    cap.style.cssText = 'padding:4px 8px;font-size:12px;color:#64748b;background:#f8fafc';
    const holder = document.createElement('div');
    holder.style.cssText =
      'height:150px;display:flex;align-items:center;justify-content:center;background-image:' +
      CHECKER +
      ';background-size:16px 16px;background-position:0 0,8px 8px';
    const img = document.createElement('img');
    img.alt = title;
    img.style.cssText = 'max-width:100%;max-height:150px;display:none';
    holder.appendChild(img);
    box.appendChild(cap);
    box.appendChild(holder);
    return { box: box, img: img };
  }

  function mkButton(text, bg, color) {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText =
      'flex:1;padding:9px 12px;border:0;border-radius:8px;cursor:pointer;font-weight:600;background:' +
      bg +
      ';color:' +
      color;
    return b;
  }

  function makeDraggable(root, handle) {
    let sx = 0;
    let sy = 0;
    let ox = 0;
    let oy = 0;
    const move = (e) => {
      root.style.left = ox + (e.clientX - sx) + 'px';
      root.style.top = oy + (e.clientY - sy) + 'px';
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    handle.addEventListener('mousedown', (e) => {
      if (e.target && e.target.tagName === 'BUTTON') return;
      sx = e.clientX;
      sy = e.clientY;
      ox = root.offsetLeft;
      oy = root.offsetTop;
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
  }

  function showResult(url) {
    state.resultURL = url;
    if (ui.after) {
      ui.after.img.src = url;
      ui.after.img.style.display = 'block';
    }
    // 启用下载和存为造型按钮
    if (ui.download) {
      ui.download.disabled = false;
      ui.download.style.opacity = '1';
    }
    if (ui.toCostume) {
      ui.toCostume.disabled = false;
      ui.toCostume.style.opacity = '1';
    }
  }

  function handleFile(file) {
    if (state.busy) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setStatus('仅支持 JPG、PNG、WebP 图片');
      return;
    }
    state.busy = true;
    state.resultURL = '';
    state.modelProgress = 0;
    state.fileName = (file.name || 'image').replace(/\.[^.]+$/, '');
    if (ui.download) {
      ui.download.disabled = true;
      ui.download.style.opacity = '.5';
    }
    if (ui.toCostume) {
      ui.toCostume.disabled = true;
      ui.toCostume.style.opacity = '.5';
    }
    if (ui.after) ui.after.img.style.display = 'none';

    const srcURL = URL.createObjectURL(file);
    state.sourceURL = srcURL;
    if (ui.before) {
      ui.before.img.src = srcURL;
      ui.before.img.style.display = 'block';
    }
    setStatus('正在准备本地模型…');

    runModel(file)
      .then(blobToDataURL)
      .then((url) => {
        state.modelProgress = 100;
        showResult(url);
        setStatus('去背景完成，可以下载或存为造型');
      })
      .catch(() => {
        setStatus('本地模型不可用，改用内置兜底抠图…');
        return loadImage(srcURL).then((img) => {
          const url = fallbackRemove(img);
          state.modelProgress = 100;
          showResult(url);
          setStatus('已用内置兜底算法去背景（边缘精度较低）');
        });
      })
      .catch((err) => {
        setStatus('处理失败：' + (err && err.message ? err.message : err));
      })
      .then(() => {
        state.busy = false;
        if (ui.bar) ui.bar.style.width = state.modelProgress + '%';
        if (ui.input) ui.input.value = '';
      });
  }

  function downloadResult() {
    if (!state.resultURL) return;
    const a = document.createElement('a');
    a.href = state.resultURL;
    a.download = state.fileName + '-no-bg.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function openPanel() {
    if (state.root) {
      state.root.style.display = 'block';
      return;
    }
    buildPanel();
    setStatus(state.statusText);
  }

  function closePanel() {
    if (state.root) state.root.style.display = 'none';
  }


  class BackgroundRemoverPanel {
    getInfo() {
      return {
        id: EXT_ID,
        name: '图片去背景',
        color1: '#2563eb',
        color2: '#1d4ed8',
        blocks: [
          { opcode: 'open', blockType: Scratch.BlockType.COMMAND, text: '打开去背景面板' },
          { opcode: 'close', blockType: Scratch.BlockType.COMMAND, text: '关闭去背景面板' },
          { opcode: 'preload', blockType: Scratch.BlockType.COMMAND, text: '预加载本地模型' },
          { opcode: 'download', blockType: Scratch.BlockType.COMMAND, text: '下载去背景结果' },
          // ----- 新增积木：存为造型 -----
          {
            opcode: 'toCostume',
            blockType: Scratch.BlockType.COMMAND,
            text: '把去背景结果存为造型 [NAME]',
            arguments: {
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: '去背景结果' }
            }
          },
          '---',
          { opcode: 'progress', blockType: Scratch.BlockType.REPORTER, text: '模型/处理进度' },
          { opcode: 'status', blockType: Scratch.BlockType.REPORTER, text: '当前状态' },
          { opcode: 'result', blockType: Scratch.BlockType.REPORTER, text: '结果图片 data URI' },
          { opcode: 'done', blockType: Scratch.BlockType.BOOLEAN, text: '已有去背景结果?' }
        ]
      };
    }

    open() {
      openPanel();
    }

    close() {
      closePanel();
    }

    preload() {
      return loadLib().then(
        () => {},
        () => {}
      );
    }

    download() {
      downloadResult();
    }

    toCostume(args, util) {
      const target = (util && util.target) || vm.editingTarget;
      return saveResultToTarget(target, Scratch.Cast.toString(args.NAME).trim()).then(
        (name) => {
          setStatus('已添加造型：' + name);
        },
        (err) => {
          setStatus('保存造型失败：' + (err && err.message ? err.message : err));
        }
      );
    }

    progress() {
      return state.modelProgress;
    }

    status() {
      return state.statusText;
    }

    result() {
      return state.resultURL;
    }

    done() {
      return !!state.resultURL;
    }
  }

  Scratch.extensions.register(new BackgroundRemoverPanel());
})(Scratch);
