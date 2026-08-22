(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('图片去背景扩展必须以非沙箱模式运行');
  }

  const BlockType = Scratch.BlockType;
  const ArgumentType = Scratch.ArgumentType;
  const Cast = Scratch.Cast;

  const EXT_ID = 'bgRemoverPanel';

  const runtime = Scratch.vm.runtime;
  const vm = Scratch.vm;


  const state = {
    root: null,
    busy: false,
    resultURL: '',
    sourceURL: '',
    fileName: 'image',
    modelProgress: 0,
    statusText: '就绪',
    lastError: '',
    libLoaded: false,
    libLoading: false,
    removeBackground: null,
    mode: 'external'
  };

  const ui = {
    status: null,
    bar: null,
    download: null,
    toCostume: null,
    input: null,
    before: null,
    after: null,
    modeSelect: null
  };


  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error('图片加载失败'));
      };
      img.src = src;
    });
  }

  function blobToDataURL(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(new Error('Blob 转 DataURL 失败'));
      };
      reader.readAsDataURL(blob);
    });
  }

  function dataURLToBytes(dataURL) {
    const parts = dataURL.split(',');
    const bstr = atob(parts[1]);
    const n = bstr.length;
    const u8 = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      u8[i] = bstr.charCodeAt(i);
    }
    return u8;
  }


  const LIB_CDN = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';

  function loadLib() {
    if (state.libLoaded && state.removeBackground) {
      return Promise.resolve(state.removeBackground);
    }
    if (state.libLoading) {
      return new Promise(function (resolve, reject) {
        const check = setInterval(function () {
          if (state.libLoaded) {
            clearInterval(check);
            resolve(state.removeBackground);
          }
          if (state.lastError && !state.libLoading) {
            clearInterval(check);
            reject(new Error(state.lastError));
          }
        }, 200);
      });
    }

    state.libLoading = true;
    setStatus('正在加载去背景模型运行库…');

    return import(/* webpackIgnore: true */ LIB_CDN)
      .then(function (mod) {
        let fn = mod.default || mod.removeBackground || mod.imglyRemoveBackground || mod;
        if (typeof fn !== 'function') {
          const keys = Object.keys(mod);
          for (let i = 0; i < keys.length; i++) {
            if (typeof mod[keys[i]] === 'function') {
              fn = mod[keys[i]];
              break;
            }
          }
        }
        if (typeof fn !== 'function') {
          throw new Error('无法从库中提取 removeBackground 函数');
        }
        state.removeBackground = fn;
        state.libLoaded = true;
        state.libLoading = false;
        setStatus('模型运行库已就绪');
        return fn;
      })
      .catch(function (err) {
        state.libLoading = false;
        state.lastError = err && err.message ? err.message : String(err);
        setStatus('模型运行库加载失败：' + state.lastError);
        throw err;
      });
  }


  function runModel(file) {
    return loadLib().then(function (removeBackground) {
      setStatus('模型运行中，请耐心等待…');
      const config = {
        model: 'isnet_fp16',
        output: {
          format: 'image/png',
          quality: 0.9,
          type: 'foreground'
        },
        progress: function (key, current, total) {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            state.modelProgress = pct;
            setStatus('外部模型处理中 (' + key + ')：' + pct + '%');
          }
        }
      };
      return removeBackground(file, config);
    });
  }

  function fallbackRemove(img) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;

    function getPixel(x, y) {
      const idx = (y * w + x) * 4;
      return [data[idx], data[idx + 1], data[idx + 2]];
    }

    const corners = [
      getPixel(0, 0),
      getPixel(w - 1, 0),
      getPixel(0, h - 1),
      getPixel(w - 1, h - 1)
    ];

    let bgR = 0, bgG = 0, bgB = 0;
    for (let c = 0; c < 4; c++) {
      bgR += corners[c][0];
      bgG += corners[c][1];
      bgB += corners[c][2];
    }
    bgR = Math.round(bgR / 4);
    bgG = Math.round(bgG / 4);
    bgB = Math.round(bgB / 4);

    const tolerance = 45;

    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - bgR;
      const dg = data[i + 1] - bgG;
      const db = data[i + 2] - bgB;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      if (dist < tolerance) {
        data[i + 3] = 0;
      } else if (dist < tolerance + 20) {
        const alpha = Math.round(((dist - tolerance) / 20) * 255);
        data[i + 3] = Math.min(data[i + 3], alpha);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  }

  function getEditingTarget() {
    return vm.editingTarget || (runtime.getTargetForStage && runtime.getTargetForStage()) || null;
  }

  function uniqueCostumeName(target, base) {
    const names = (target.getCostumes() || []).map(function (c) { return c.name; });
    if (names.indexOf(base) === -1) return base;
    let i = 2;
    while (names.indexOf(base + i) !== -1) i++;
    return base + i;
  }

  function getStorage() {
    return (runtime && runtime.storage) || vm.storage || null;
  }

  function attachCostume(target, md5ext, costume) {
    if (typeof vm.addCostume === 'function') {
      return Promise.resolve(vm.addCostume(md5ext, costume, target.id));
    }
    if (typeof target.addCostume !== 'function') {
      return Promise.reject(new Error('当前 VM 不支持添加造型'));
    }
    return prepareCostumeForRender(costume).then(function () {
      const index = target.getCostumes().length;
      target.addCostume(costume, index);
      if (target.setCostume) target.setCostume(index);
      return costume;
    });
  }

  function prepareCostumeForRender(costume) {
    const renderer = runtime && runtime.renderer;
    if (!renderer) return Promise.resolve(costume);
    return loadImage(state.resultURL).then(function (img) {
      costume.size = [img.naturalWidth, img.naturalHeight];
      const rotationCenter = [
        costume.rotationCenterX * costume.bitmapResolution,
        costume.rotationCenterY * costume.bitmapResolution
      ];
      costume.skinId = renderer.createBitmapSkin(img, costume.bitmapResolution, rotationCenter);
      return costume;
    });
  }

  function saveResultToTarget(target, name) {
    const storage = getStorage();
    if (!storage) {
      return Promise.reject(new Error('当前环境无法访问项目资源库'));
    }
    if (!state.resultURL) return Promise.reject(new Error('还没有去背景结果'));
    if (!target) return Promise.reject(new Error('找不到目标角色'));

    let asset;
    try {
      asset = storage.createAsset(
        storage.AssetType.ImageBitmap,
        storage.DataFormat.PNG,
        dataURLToBytes(state.resultURL),
        null,
        true
      );
    } catch (e) {
      return Promise.reject(new Error('创建图片资源失败：' + (e && e.message ? e.message : e)));
    }

    const md5ext = asset.assetId + '.' + storage.DataFormat.PNG;
    return loadImage(state.resultURL).then(function (img) {
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
      return attachCostume(target, md5ext, costume).then(function () {
        if (typeof vm.emitTargetsUpdate === 'function') vm.emitTargetsUpdate();
        if (typeof runtime.requestTargetsUpdate === 'function') {
          runtime.requestTargetsUpdate(target);
        }
        if (typeof runtime.requestRedraw === 'function') {
          runtime.requestRedraw();
        }
        return costume.name;
      });
    });
  }

  /* ============== UI 状态 ============== */

  function setStatus(text) {
    state.statusText = text;
    if (ui.status) ui.status.textContent = text;
    if (ui.bar) ui.bar.style.width = state.modelProgress + '%';
  }

  /* ============== 面板 UI ============== */

  const CHECKER =
    'linear-gradient(45deg,#e6e6e6 25%,transparent 25%,transparent 75%,#e6e6e6 75%),' +
    'linear-gradient(45deg,#e6e6e6 25%,transparent 25%,transparent 75%,#e6e6e6 75%)';

  function resetResultDisplay() {
    state.resultURL = '';
    if (ui.after) {
      ui.after.img.style.display = 'none';
      ui.after.img.src = '';
    }
    if (ui.download) {
      ui.download.disabled = true;
      ui.download.style.opacity = '.5';
    }
    if (ui.toCostume) {
      ui.toCostume.disabled = true;
      ui.toCostume.style.opacity = '.5';
    }
    state.modelProgress = 0;
    if (ui.bar) ui.bar.style.width = '0%';
  }

  function updateModeSelector(mode) {
    if (ui.modeSelect) {
      ui.modeSelect.value = mode;
    }
    state.mode = mode;
    resetResultDisplay();
    updatePreloadButton();
    setStatus('已切换至' + (mode === 'external' ? '外部模型' : '内置算法') + '模式');
  }

  function updatePreloadButton() {
    const preloadBtn = state.root && state.root.querySelector('[data-action="preload"]');
    if (preloadBtn) {
      if (state.mode === 'internal') {
        preloadBtn.disabled = true;
        preloadBtn.style.opacity = '.5';
        preloadBtn.title = '内置算法无需预加载';
      } else {
        preloadBtn.disabled = false;
        preloadBtn.style.opacity = '1';
        preloadBtn.title = '';
      }
    }
  }

  function buildPanel() {
    const root = document.createElement('div');
    root.setAttribute('data-extension', EXT_ID);
    root.style.cssText =
      'position:fixed;top:60px;left:60px;z-index:2147483000;width:520px;background:#fff;' +
      'border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.28);font:14px/1.5 system-ui,sans-serif;color:#1f2937;overflow:hidden';

    /* --- 标题栏 --- */
    const header = document.createElement('div');
    header.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;' +
      'background:#2563eb;color:#fff;cursor:move;user-select:none';
    const title = document.createElement('strong');
    title.textContent = '图片去背景（本地模型）';
    header.appendChild(title);
    const close = document.createElement('button');
    close.textContent = '×';
    close.setAttribute('aria-label', '关闭面板');
    close.style.cssText =
      'border:0;background:transparent;color:#fff;font-size:20px;line-height:1;cursor:pointer';
    close.onclick = closePanel;
    header.appendChild(close);

    /* --- 主体 --- */
    const body = document.createElement('div');
    body.style.cssText = 'padding:14px;display:flex;flex-direction:column;gap:12px';

    /* 模式选择 */
    const modeRow = document.createElement('div');
    modeRow.style.cssText = 'display:flex;align-items:center;gap:10px;font-size:13px;';
    const modeLabel = document.createElement('span');
    modeLabel.textContent = '去背景模式：';
    modeLabel.style.fontWeight = '500';
    const modeSelect = document.createElement('select');
    modeSelect.style.cssText = 'padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;background:#fff;';
    const optExternal = document.createElement('option');
    optExternal.value = 'external';
    optExternal.textContent = '外部模型 (@imgly)';
    const optInternal = document.createElement('option');
    optInternal.value = 'internal';
    optInternal.textContent = '内置算法 (色度阈值)';
    modeSelect.appendChild(optExternal);
    modeSelect.appendChild(optInternal);
    modeSelect.value = state.mode;
    modeSelect.onchange = function () {
      const newMode = modeSelect.value;
      if (newMode !== state.mode) {
        updateModeSelector(newMode);
      }
    };
    modeRow.appendChild(modeLabel);
    modeRow.appendChild(modeSelect);
    ui.modeSelect = modeSelect;

    /* 文件拖放区 */
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
    input.onchange = function () {
      if (input.files && input.files[0]) handleFile(input.files[0]);
    };
    drop.ondragover = function (e) {
      e.preventDefault();
      drop.style.background = '#eff6ff';
    };
    drop.ondragleave = function () {
      drop.style.background = '#f8fafc';
    };
    drop.ondrop = function (e) {
      e.preventDefault();
      drop.style.background = '#f8fafc';
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    };

    /* 预览区 */
    const preview = document.createElement('div');
    preview.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px';
    ui.before = makeThumb('原图');
    ui.after = makeThumb('去背景');
    preview.appendChild(ui.before.box);
    preview.appendChild(ui.after.box);

    /* 状态文字 */
    const status = document.createElement('div');
    status.style.cssText = 'font-size:12px;color:#475569;min-height:18px';
    status.textContent = state.statusText;

    /* 进度条 */
    const track = document.createElement('div');
    track.style.cssText = 'height:6px;border-radius:99px;background:#e5e7eb;overflow:hidden';
    const bar = document.createElement('div');
    bar.style.cssText = 'height:100%;width:0%;background:#2563eb;transition:width .2s';
    track.appendChild(bar);

    /* 操作按钮 */
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap';

    const preload = mkButton('预加载模型', '#e5e7eb', '#111827');
    preload.setAttribute('data-action', 'preload');
    preload.onclick = function () {
      if (state.mode === 'internal') {
        setStatus('内置算法无需预加载');
        return;
      }
      loadLib().catch(function () {
        setStatus('模型运行库加载失败：' + state.lastError);
      });
    };

    const toCostume = mkButton('存为当前角色造型', '#16a34a', '#fff');
    toCostume.disabled = true;
    toCostume.style.opacity = '.5';
    toCostume.onclick = function () {
      saveResultToTarget(getEditingTarget(), '')
        .then(function (n) { setStatus('已添加造型：' + n); })
        .catch(function (e) { setStatus('保存造型失败：' + (e && e.message ? e.message : e)); });
    };

    const download = mkButton('下载透明 PNG', '#2563eb', '#fff');
    download.disabled = true;
    download.style.opacity = '.5';
    download.onclick = downloadResult;

    actions.appendChild(preload);
    actions.appendChild(toCostume);
    actions.appendChild(download);

    body.appendChild(modeRow);
    body.appendChild(drop);
    body.appendChild(preview);
    body.appendChild(status);
    body.appendChild(track);
    body.appendChild(actions);
    root.appendChild(header);
    root.appendChild(body);

    ui.status = status;
    ui.bar = bar;
    ui.download = download;
    ui.toCostume = toCostume;
    ui.input = input;

    updatePreloadButton();
    makeDraggable(root, header);
    document.body.appendChild(root);
    state.root = root;
    return root;
  }

  function makeThumb(titleText) {
    const box = document.createElement('div');
    box.style.cssText = 'border:1px solid #e5e7eb;border-radius:10px;overflow:hidden';
    const cap = document.createElement('div');
    cap.textContent = titleText;
    cap.style.cssText = 'padding:4px 8px;font-size:12px;color:#64748b;background:#f8fafc';
    const holder = document.createElement('div');
    holder.style.cssText =
      'height:150px;display:flex;align-items:center;justify-content:center;background-image:' +
      CHECKER +
      ';background-size:16px 16px;background-position:0 0,8px 8px';
    const img = document.createElement('img');
    img.alt = titleText;
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
      bg + ';color:' + color;
    return b;
  }

  function makeDraggable(root, handle) {
    let sx = 0, sy = 0, ox = 0, oy = 0;
    const move = function (e) {
      root.style.left = ox + (e.clientX - sx) + 'px';
      root.style.top = oy + (e.clientY - sy) + 'px';
    };
    const up = function () {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    handle.addEventListener('mousedown', function (e) {
      if (e.target && e.target.tagName === 'BUTTON') return;
      sx = e.clientX;
      sy = e.clientY;
      ox = root.offsetLeft;
      oy = root.offsetTop;
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', up);
    });
  }

  /* ============== 结果展示 & 文件处理 ============== */

  function showResult(url) {
    state.resultURL = url;
    if (ui.after) {
      ui.after.img.src = url;
      ui.after.img.style.display = 'block';
    }
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
    resetResultDisplay();
    state.modelProgress = 0;
    state.fileName = (file.name || 'image').replace(/\.[^.]+$/, '');

    if (state.sourceURL && state.sourceURL.indexOf('blob:') === 0) {
      URL.revokeObjectURL(state.sourceURL);
    }
    const srcURL = URL.createObjectURL(file);
    state.sourceURL = srcURL;
    if (ui.before) {
      ui.before.img.src = srcURL;
      ui.before.img.style.display = 'block';
    }

    if (state.mode === 'external') {
      setStatus('正在使用外部模型…');
      runModel(file)
        .then(blobToDataURL)
        .then(function (url) {
          state.modelProgress = 100;
          showResult(url);
          setStatus('外部模型去背景完成，可以下载或存为造型');
        })
        .catch(function () {
          setStatus('外部模型失败，自动切换至内置算法…');
          state.mode = 'internal';
          if (ui.modeSelect) ui.modeSelect.value = 'internal';
          updatePreloadButton();
          return loadImage(srcURL)
            .then(function (img) {
              const url = fallbackRemove(img);
              state.modelProgress = 100;
              showResult(url);
              setStatus('内置算法完成（因外部模型不可用）');
            })
            .catch(function (fallbackErr) {
              setStatus('内置算法也失败：' + (fallbackErr && fallbackErr.message ? fallbackErr.message : fallbackErr));
            });
        })
        .then(function () {
          state.busy = false;
          if (ui.bar) ui.bar.style.width = state.modelProgress + '%';
          if (ui.input) ui.input.value = '';
        });
    } else {
      setStatus('正在使用内置算法…');
      loadImage(srcURL)
        .then(function (img) {
          const url = fallbackRemove(img);
          state.modelProgress = 100;
          showResult(url);
          setStatus('内置算法去背景完成，可以下载或存为造型');
        })
        .catch(function (err) {
          setStatus('内置算法处理失败：' + (err && err.message ? err.message : err));
        })
        .then(function () {
          state.busy = false;
          if (ui.bar) ui.bar.style.width = state.modelProgress + '%';
          if (ui.input) ui.input.value = '';
        });
    }
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

  /* ============== 面板开关 ============== */

  function openPanel() {
    if (state.root && state.root.isConnected) {
      state.root.style.display = 'block';
      return;
    }
    buildPanel();
    setStatus(state.statusText);
  }

  function closePanel() {
    if (state.root) state.root.style.display = 'none';
  }

  function disposePanel() {
    if (state.root && state.root.parentNode) state.root.parentNode.removeChild(state.root);
    state.root = null;
    ui.status = null;
    ui.bar = null;
    ui.download = null;
    ui.toCostume = null;
    ui.input = null;
    ui.modeSelect = null;
    ui.before = null;
    ui.after = null;
    if (state.sourceURL && state.sourceURL.indexOf('blob:') === 0) {
      URL.revokeObjectURL(state.sourceURL);
      state.sourceURL = '';
    }
  }

  /* ============== TurboWarp 扩展类 ============== */

  class BackgroundRemoverPanel {
    getInfo() {
      return {
        id: EXT_ID,
        name: '图片去背景',
        color1: '#2563eb',
        color2: '#1d4ed8',
        color3: '#1e40af',
        blocks: [
          {
            opcode: 'open',
            blockType: BlockType.COMMAND,
            text: '打开去背景面板'
          },
          {
            opcode: 'close',
            blockType: BlockType.COMMAND,
            text: '关闭去背景面板'
          },
          {
            opcode: 'setMode',
            blockType: BlockType.COMMAND,
            text: '设置模式为 [MODE]',
            arguments: {
              MODE: {
                type: ArgumentType.STRING,
                menu: 'modeMenu',
                defaultValue: 'external'
              }
            }
          },
          {
            opcode: 'preload',
            blockType: BlockType.COMMAND,
            text: '预加载外部模型'
          },
          {
            opcode: 'download',
            blockType: BlockType.COMMAND,
            text: '下载去背景结果'
          },
          {
            opcode: 'toCostume',
            blockType: BlockType.COMMAND,
            text: '把去背景结果存为造型 [NAME]',
            arguments: {
              NAME: {
                type: ArgumentType.STRING,
                defaultValue: '去背景结果'
              }
            }
          },
          '---',
          {
            opcode: 'progress',
            blockType: BlockType.REPORTER,
            text: '模型处理进度'
          },
          {
            opcode: 'statusText',
            blockType: BlockType.REPORTER,
            text: '当前状态'
          },
          {
            opcode: 'result',
            blockType: BlockType.REPORTER,
            text: '结果图片 data URI'
          },
          {
            opcode: 'currentMode',
            blockType: BlockType.REPORTER,
            text: '当前模式'
          },
          {
            opcode: 'isBusy',
            blockType: BlockType.BOOLEAN,
            text: '正在处理中?'
          },
          {
            opcode: 'done',
            blockType: BlockType.BOOLEAN,
            text: '已有去背景结果?'
          }
        ],
        menus: {
          modeMenu: {
            acceptReporters: true,
            items: [
              { text: '外部模型', value: 'external' },
              { text: '内置算法', value: 'internal' }
            ]
          }
        }
      };
    }

    open() {
      openPanel();
    }

    close() {
      closePanel();
    }

    setMode(args) {
      const mode = Cast.toString(args.MODE);
      if (mode === 'external' || mode === 'internal') {
        updateModeSelector(mode);
      }
    }

    preload() {
      if (state.mode === 'internal') {
        setStatus('内置算法无需预加载');
        return;
      }
      return loadLib().then(
        function () { },
        function () {
          setStatus('模型运行库加载失败：' + state.lastError);
        }
      );
    }

    download() {
      downloadResult();
    }

    toCostume(args, util) {
      const target = util.target || getEditingTarget();
      const name = Cast.toString(args.NAME).trim();
      return saveResultToTarget(target, name).then(
        function (costumeName) {
          setStatus('已添加造型：' + costumeName);
        },
        function (err) {
          setStatus('保存造型失败：' + (err && err.message ? err.message : err));
        }
      );
    }

    progress() {
      return state.modelProgress;
    }

    statusText() {
      return state.statusText;
    }

    result() {
      return state.resultURL;
    }

    currentMode() {
      return state.mode;
    }

    isBusy() {
      return state.busy;
    }

    done() {
      return !!state.resultURL;
    }

    dispose() {
      disposePanel();
    }
  }

  Scratch.extensions.register(new BackgroundRemoverPanel());

})(Scratch);
