(function (Scratch) {
  "use strict";

  if (!Scratch.extensions.unsandboxed) {
    throw new Error("Excalidraw Paint Editor must run unsandboxed.");
  }

  const vm = Scratch.vm;
  const runtime = vm.runtime;

  const EXCALIDRAW_VERSION = "0.17.6";
  const CDN = "https://unpkg.com";
  const ASSET_PATH = CDN + "/@excalidraw/excalidraw@" + EXCALIDRAW_VERSION + "/dist/";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";

  const LANG_MAP = {
    en: "en",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW",
    ja: "ja-JP",
    "ja-hira": "ja-JP",
    ko: "ko-KR",
    fr: "fr-FR",
    de: "de-DE",
    es: "es-ES",
    "es-419": "es-ES",
    ru: "ru-RU",
    pt: "pt-PT",
    "pt-br": "pt-BR",
    it: "it-IT",
    nl: "nl-NL",
    pl: "pl-PL",
    tr: "tr-TR",
    uk: "uk-UA",
    vi: "vi-VN",
    id: "id-ID",
    th: "th-TH",
    hi: "hi-IN",
    ar: "ar-SA",
    he: "he-IL",
    cs: "cs-CZ",
    da: "da-DK",
    fi: "fi-FI",
    nb: "nb-NO",
    nn: "nb-NO",
    sv: "sv-SE",
    el: "el-GR",
    hu: "hu-HU",
    ro: "ro-RO",
    bg: "bg-BG",
    ca: "ca-ES",
    fa: "fa-IR",
    my: "my-MM",
    kab: "kab-KAB"
  };

  function editorLocale() {
    let locale = "";
    try {
      if (typeof vm.getLocale === "function") locale = vm.getLocale() || "";
    } catch (e) {
      locale = "";
    }
    if (!locale) locale = (typeof navigator !== "undefined" && navigator.language) || "en";
    return String(locale).toLowerCase();
  }

  function toLangCode(locale) {
    const key = String(locale).toLowerCase();
    if (LANG_MAP[key]) return LANG_MAP[key];
    const base = key.split(/[-_]/)[0];
    return LANG_MAP[base] || "en";
  }

  const PAGE_LINES = [
    "<!DOCTYPE html>",
    "<html><head><meta charset='utf-8'>",
    "<style>",
    "html,body,#root{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}",
    "#boot{font:14px sans-serif;color:#555;padding:12px;}",
    "</style>",
    "<link rel='stylesheet' href='" + ASSET_PATH + "excalidraw.production.min.css'>",
    "</head><body>",
    "<div id='root'><div id='boot'>Loading Excalidraw...</div></div>",
    "<script>window.EXCALIDRAW_ASSET_PATH='" + ASSET_PATH + "';window.process={env:{NODE_ENV:'production'}};</" + "script>",
    "<script src='" + CDN + "/react@18.2.0/umd/react.production.min.js'></" + "script>",
    "<script src='" + CDN + "/react-dom@18.2.0/umd/react-dom.production.min.js'></" + "script>",
    "<script src='" + ASSET_PATH + "excalidraw.production.min.js'></" + "script>",
    "<script>",
    "(function(){",
    "  var api=null, ready=false, dirty=false, root=null;",
    "  var lang=(location.hash||'').replace(/^#lang=/,'')||'en';",
    "  function post(msg){ parent.postMessage(Object.assign({__excalidraw:true},msg),'*'); }",
    "  function render(){",
    "    var L=window.ExcalidrawLib, R=window.React;",
    "    root.render(R.createElement(L.Excalidraw,{",
    "      langCode:lang,",
    "      excalidrawAPI:function(a){api=a;if(!ready){ready=true;post({type:'ready'});}},",
    "      onChange:function(){ if(!dirty){dirty=true;post({type:'changed'});} }",
    "    }));",
    "  }",
    "  function boot(){",
    "    if(!window.ExcalidrawLib||!window.React||!window.ReactDOM){",
    "      post({type:'error',message:'Excalidraw CDN bundle failed to load'});",
    "      document.getElementById('boot').textContent='Failed to load Excalidraw.';",
    "      return;",
    "    }",
    "    root=ReactDOM.createRoot(document.getElementById('root'));",
    "    render();",
    "  }",
    "  function sceneJSON(){",
    "    if(!api) return '';",
    "    return window.ExcalidrawLib.serializeAsJSON(api.getSceneElements(),api.getAppState(),api.getFiles(),'local');",
    "  }",
    "  function blobToDataURL(blob){",
    "    return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result);};r.onerror=rej;r.readAsDataURL(blob);});",
    "  }",
    "  function exportPNG(opts){",
    "    var L=window.ExcalidrawLib;",
    "    return L.exportToBlob({",
    "      elements:api.getSceneElements(),",
    "      files:api.getFiles(),",
    "      appState:Object.assign({},api.getAppState(),{exportBackground:!!opts.background}),",
    "      mimeType:'image/png',",
    "      exportPadding:10,",
    "      getDimensions:function(w,h){var s=opts.scale||2;return{width:w*s,height:h*s,scale:s};}",
    "    }).then(blobToDataURL);",
    "  }",
    "  function exportSVG(opts){",
    "    var L=window.ExcalidrawLib;",
    "    return L.exportToSvg({",
    "      elements:api.getSceneElements(),",
    "      files:api.getFiles(),",
    "      appState:Object.assign({},api.getAppState(),{exportBackground:!!opts.background}),",
    "      exportPadding:10",
    "    }).then(function(svg){ return new XMLSerializer().serializeToString(svg); });",
    "  }",
    "  function measure(dataURL){",
    "    return new Promise(function(res){",
    "      var img=new Image();",
    "      img.onload=function(){res({w:img.naturalWidth||img.width||300,h:img.naturalHeight||img.height||300});};",
    "      img.onerror=function(){res({w:300,h:300});};",
    "      img.src=dataURL;",
    "    });",
    "  }",
    "  function addImage(d){",
    "    var L=window.ExcalidrawLib;",
    "    return measure(d.dataURL).then(function(dim){",
    "      var w0=d.width||dim.w, h0=d.height||dim.h;",
    "      var maxSide=Math.max(w0,h0);",
    "      var k=maxSide>600?600/maxSide:1;",
    "      var w=Math.round(w0*k), h=Math.round(h0*k);",
    "      var fileId=('scratch'+Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,40);",
    "      api.addFiles([{id:fileId,mimeType:d.mimeType||'image/png',dataURL:d.dataURL,created:Date.now()}]);",
    "      var view=api.getAppState();",
    "      var cx=(-view.scrollX)+(view.width||600)/2/(view.zoom&&view.zoom.value||1);",
    "      var cy=(-view.scrollY)+(view.height||400)/2/(view.zoom&&view.zoom.value||1);",
    "      var skeleton={type:'image',fileId:fileId,x:cx-w/2,y:cy-h/2,width:w,height:h};",
    "      var made=L.convertToExcalidrawElements?L.convertToExcalidrawElements([skeleton]):[skeleton];",
    "      api.updateScene({elements:api.getSceneElements().concat(made)});",
    "      api.scrollToContent(made,{fitToContent:true});",
    "      return '';",
    "    });",
    "  }",
    "  window.addEventListener('message',function(e){",
    "    var d=e.data;",
    "    if(!d||!d.__excalidrawCmd) return;",
    "    var id=d.id, p;",
    "    try{",
    "      switch(d.cmd){",
    "        case 'ping': p=Promise.resolve(ready); break;",
    "        case 'setLang': if(d.lang&&d.lang!==lang){lang=d.lang;if(root) render();} p=Promise.resolve(lang); break;",
    "        case 'getLang': p=Promise.resolve(lang); break;",
    "        case 'getScene': p=Promise.resolve(sceneJSON()); dirty=false; break;",
    "        case 'setScene': {",
    "          var parsed=JSON.parse(d.json||'{}');",
    "          api.updateScene({elements:parsed.elements||[],appState:parsed.appState||{}});",
    "          if(parsed.files) api.addFiles(Object.keys(parsed.files).map(function(k){return parsed.files[k];}));",
    "          p=Promise.resolve('');",
    "          break;",
    "        }",
    "        case 'clear': api.resetScene(); p=Promise.resolve(''); break;",
    "        case 'zoomFit': api.scrollToContent(api.getSceneElements(),{fitToContent:true}); p=Promise.resolve(''); break;",
    "        case 'elementCount': p=Promise.resolve(api.getSceneElements().length); break;",
    "        case 'addImage': p=addImage(d); break;",
    "        case 'exportPNG': p=exportPNG(d); break;",
    "        case 'exportSVG': p=exportSVG(d); break;",
    "        default: p=Promise.resolve('');",
    "      }",
    "    }catch(err){ p=Promise.reject(err); }",
    "    p.then(function(v){post({type:'result',id:id,value:v});},",
    "           function(err){post({type:'result',id:id,value:'',error:String(err&&err.message||err)});});",
    "  });",
    "  if(document.readyState==='complete') boot(); else window.addEventListener('load',boot);",
    "})();",
    "</" + "script></body></html>"
  ];

  class EditorOverlay {
    constructor() {
      this.iframe = null;
      this.wrapper = null;
      this.header = null;
      this.handle = null;
      this.blobUrl = null;
      this.ready = false;
      this.pending = new Map();
      this.nextId = 1;
      this.mode = "embed";
      this.embedRect = { x: 0, y: 0, width: 440, height: 320 };
      this.floatRect = { x: 0, y: 0, width: 560, height: 420, placed: false };
      this.langMode = "auto";
      this.langCode = toLangCode(editorLocale());
      this.onMessage = this.onMessage.bind(this);
      this.layout = this.layout.bind(this);
    }

    get isOpen() {
      return !!this.iframe;
    }

    open(mode) {
      if (this.iframe) {
        if (mode && mode !== this.mode) this.setMode(mode);
        return;
      }
      if (mode) this.mode = mode;
      this.langCode = this.resolveLang();

      const html = PAGE_LINES.join("\n");
      this.blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));

      this.wrapper = document.createElement("div");
      this.wrapper.style.overflow = "hidden";
      this.wrapper.style.background = "#fff";
      this.wrapper.style.boxSizing = "border-box";

      this.header = document.createElement("div");
      this.header.style.height = "26px";
      this.header.style.lineHeight = "26px";
      this.header.style.padding = "0 8px";
      this.header.style.font = "12px/26px sans-serif";
      this.header.style.color = "#fff";
      this.header.style.background = "#6965db";
      this.header.style.cursor = "move";
      this.header.style.userSelect = "none";
      this.header.style.display = "none";
      this.header.textContent = "Excalidraw";

      const closeBtn = document.createElement("span");
      closeBtn.textContent = "✕";
      closeBtn.style.cssText = "float:right;cursor:pointer;padding:0 2px;";
      closeBtn.addEventListener("click", () => this.close());
      this.header.appendChild(closeBtn);

      this.iframe = document.createElement("iframe");
      this.iframe.style.width = "100%";
      this.iframe.style.border = "0";
      this.iframe.style.display = "block";
      this.iframe.setAttribute("allowtransparency", "true");
      this.iframe.src = this.blobUrl + "#lang=" + encodeURIComponent(this.langCode);

      this.handle = document.createElement("div");
      this.handle.style.cssText =
        "position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:nwse-resize;" +
        "background:linear-gradient(135deg,transparent 45%,#6965db 100%);display:none;";

      this.wrapper.appendChild(this.header);
      this.wrapper.appendChild(this.iframe);
      this.wrapper.appendChild(this.handle);

      this.bindDrag(this.header, "move");
      this.bindDrag(this.handle, "resize");

      this.attach();

      window.addEventListener("message", this.onMessage);
      window.addEventListener("resize", this.layout);
      this.langTimer = setInterval(() => this.syncLang(), 1000);
      this.layout();
    }

    attach() {
      const canvas = runtime.renderer && runtime.renderer.canvas;
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (this.mode === "float") {
        this.wrapper.style.position = "fixed";
        this.wrapper.style.zIndex = "9999";
        this.wrapper.style.borderRadius = "8px";
        this.wrapper.style.boxShadow = "0 6px 28px rgba(0,0,0,.35)";
        this.header.style.display = "";
        this.handle.style.display = "";
        document.body.appendChild(this.wrapper);
      } else {
        const parent = canvas && canvas.parentElement;
        if (!parent) return;
        this.wrapper.style.position = "absolute";
        this.wrapper.style.zIndex = "500";
        this.wrapper.style.borderRadius = "6px";
        this.wrapper.style.boxShadow = "0 2px 12px rgba(0,0,0,.35)";
        this.header.style.display = "none";
        this.handle.style.display = "none";
        parent.appendChild(this.wrapper);
        if (typeof ResizeObserver !== "undefined" && canvas) {
          this.observer = new ResizeObserver(this.layout);
          this.observer.observe(canvas);
        }
      }
    }

    setMode(mode) {
      const next = mode === "float" ? "float" : "embed";
      if (next === this.mode) return;
      this.mode = next;
      if (this.wrapper) {
        this.wrapper.remove();
        this.attach();
        this.layout();
      }
    }

    close() {
      if (!this.iframe) return;
      window.removeEventListener("message", this.onMessage);
      window.removeEventListener("resize", this.layout);
      if (this.langTimer) clearInterval(this.langTimer);
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      this.wrapper.remove();
      if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
      this.iframe = null;
      this.wrapper = null;
      this.header = null;
      this.handle = null;
      this.blobUrl = null;
      this.langTimer = null;
      this.ready = false;
      this.pending.forEach((entry) => entry.resolve(""));
      this.pending.clear();
    }

    setRect(rect) {
      const target = this.mode === "float" ? this.floatRect : this.embedRect;
      Object.assign(target, rect);
      if (this.mode === "float") this.floatRect.placed = true;
      this.layout();
    }

    setVisible(visible) {
      if (this.wrapper) this.wrapper.style.display = visible ? "" : "none";
    }

    layout() {
      if (!this.wrapper) return;
      if (this.mode === "float") {
        const r = this.floatRect;
        if (!r.placed) {
          r.x = Math.max(8, (window.innerWidth - r.width) / 2);
          r.y = Math.max(8, (window.innerHeight - r.height) / 2);
          r.placed = true;
        }
        this.wrapper.style.left = r.x + "px";
        this.wrapper.style.top = r.y + "px";
        this.wrapper.style.width = r.width + "px";
        this.wrapper.style.height = r.height + "px";
        this.iframe.style.height = Math.max(0, r.height - 26) + "px";
        return;
      }
      const canvas = runtime.renderer && runtime.renderer.canvas;
      if (!canvas) return;
      const stageW = runtime.stageWidth || 480;
      const stageH = runtime.stageHeight || 360;
      const scaleX = canvas.clientWidth / stageW;
      const scaleY = canvas.clientHeight / stageH;
      const r = this.embedRect;
      this.wrapper.style.left = (r.x + stageW / 2 - r.width / 2) * scaleX + "px";
      this.wrapper.style.top = (stageH / 2 - r.y - r.height / 2) * scaleY + "px";
      this.wrapper.style.width = r.width * scaleX + "px";
      this.wrapper.style.height = r.height * scaleY + "px";
      this.iframe.style.height = "100%";
    }

    bindDrag(element, kind) {
      element.addEventListener("pointerdown", (event) => {
        if (this.mode !== "float") return;
        event.preventDefault();
        element.setPointerCapture(event.pointerId);
        this.iframe.style.pointerEvents = "none";
        const start = { px: event.clientX, py: event.clientY };
        const base = Object.assign({}, this.floatRect);
        const move = (moveEvent) => {
          const dx = moveEvent.clientX - start.px;
          const dy = moveEvent.clientY - start.py;
          if (kind === "move") {
            this.floatRect.x = base.x + dx;
            this.floatRect.y = base.y + dy;
          } else {
            this.floatRect.width = Math.max(220, base.width + dx);
            this.floatRect.height = Math.max(160, base.height + dy);
          }
          this.layout();
        };
        const up = () => {
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerup", up);
          element.removeEventListener("pointercancel", up);
          if (this.iframe) this.iframe.style.pointerEvents = "";
        };
        element.addEventListener("pointermove", move);
        element.addEventListener("pointerup", up);
        element.addEventListener("pointercancel", up);
      });
    }

    resolveLang() {
      return this.langMode === "auto" ? toLangCode(editorLocale()) : this.langMode;
    }

    setLangMode(mode) {
      this.langMode = mode;
      this.syncLang(true);
    }

    syncLang(force) {
      const next = this.resolveLang();
      if (!force && next === this.langCode) return;
      this.langCode = next;
      if (this.iframe) this.send("setLang", { lang: next });
    }

    onMessage(event) {
      const data = event.data;
      if (!data || !data.__excalidraw) return;
      if (this.iframe && event.source !== this.iframe.contentWindow) return;
      if (data.type === "ready") {
        this.ready = true;
        this.syncLang(true);
        return;
      }
      if (data.type === "changed") {
        runtime.startHats("excalidraw_whenChanged");
        return;
      }
      if (data.type === "error") {
        console.warn("[Excalidraw]", data.message);
        return;
      }
      if (data.type === "result") {
        const entry = this.pending.get(data.id);
        if (entry) {
          this.pending.delete(data.id);
          if (data.error) console.warn("[Excalidraw]", data.error);
          entry.resolve(data.value);
        }
      }
    }

    send(cmd, extra) {
      if (!this.iframe) return Promise.resolve("");
      const id = this.nextId++;
      const message = Object.assign({ __excalidrawCmd: true, cmd, id }, extra || {});
      return new Promise((resolve) => {
        this.pending.set(id, { resolve });
        const post = () => this.iframe.contentWindow.postMessage(message, "*");
        if (this.ready) {
          post();
        } else {
          const start = Date.now();
          const wait = () => {
            if (!this.iframe) return resolve("");
            if (this.ready) return post();
            if (Date.now() - start > 20000) return resolve("");
            setTimeout(wait, 100);
          };
          wait();
        }
        setTimeout(() => {
          if (this.pending.delete(id)) resolve("");
        }, 30000);
      });
    }
  }

  const overlay = new EditorOverlay();
  runtime.on("PROJECT_STOP_ALL", () => overlay.close());
  if (typeof vm.on === "function") {
    vm.on("LOCALE_CHANGED", () => overlay.syncLang());
  }

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = "sync";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = src;
    });
  }

  function dataURIToText(uri) {
    const comma = String(uri).indexOf(",");
    if (comma < 0) return "";
    const meta = uri.slice(0, comma);
    const body = uri.slice(comma + 1);
    if (/;base64/i.test(meta)) {
      try {
        const raw = atob(body);
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        return new TextDecoder().decode(bytes);
      } catch (e) {
        return "";
      }
    }
    try {
      return decodeURIComponent(body);
    } catch (e) {
      return body;
    }
  }

  function svgSize(svgText) {
    let width = 0;
    let height = 0;
    try {
      const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
      const root = doc.documentElement;
      width = parseFloat(root.getAttribute("width")) || 0;
      height = parseFloat(root.getAttribute("height")) || 0;
      if (!width || !height) {
        const box = (root.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
        if (box.length === 4) {
          width = width || box[2];
          height = height || box[3];
        }
      }
    } catch (e) {
      // fall through to defaults
    }
    return { width: width || 300, height: height || 300 };
  }

  const isSvgDataURI = (uri) => /^data:image\/svg\+xml[;,]/i.test(String(uri));

  // Rasterize any image data URI (including SVG) to a self-contained PNG data URI.
  async function rasterizeToPNG(dataURL, options) {
    const opts = options || {};
    const scale = Math.max(0.1, opts.scale || 1);
    const maxSide = opts.maxSide || 4096;

    let hintW = opts.width || 0;
    let hintH = opts.height || 0;
    if ((!hintW || !hintH) && isSvgDataURI(dataURL)) {
      const size = svgSize(dataURIToText(dataURL));
      hintW = hintW || size.width;
      hintH = hintH || size.height;
    }

    const img = await loadImageElement(dataURL);
    let w = img.naturalWidth || img.width || hintW || 300;
    let h = img.naturalHeight || img.height || hintH || 300;
    // Firefox reports 0 for SVG without intrinsic size.
    if (!img.naturalWidth && hintW) w = hintW;
    if (!img.naturalHeight && hintH) h = hintH;

    let outW = Math.max(1, Math.round(w * scale));
    let outH = Math.max(1, Math.round(h * scale));
    const biggest = Math.max(outW, outH);
    if (biggest > maxSide) {
      const k = maxSide / biggest;
      outW = Math.max(1, Math.round(outW * k));
      outH = Math.max(1, Math.round(outH * k));
    }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, outW, outH);
    return { dataURL: canvas.toDataURL("image/png"), width: w, height: h };
  }

  async function flattenExportedSVG(svgText) {
    const text = String(svgText || "");
    if (!/<svg[\s>]/i.test(text)) return text;

    let doc;
    try {
      doc = new DOMParser().parseFromString(text, "image/svg+xml");
    } catch (e) {
      return text;
    }
    const root = doc.documentElement;
    if (!root || root.nodeName.toLowerCase() === "parsererror") return text;

    root.setAttribute("xmlns", SVG_NS);
    root.setAttribute("xmlns:xlink", XLINK_NS);

    const readHref = (el) =>
      el.getAttribute("href") || el.getAttributeNS(XLINK_NS, "href") || el.getAttribute("xlink:href") || "";

    const cache = new Map();
    const toPNG = async (href, w, h) => {
      const key = href + "|" + Math.round(w || 0) + "x" + Math.round(h || 0);
      if (cache.has(key)) return cache.get(key);
      const promise = rasterizeToPNG(href, {
        width: w,
        height: h,
        // Rasterize a bit above layout size so the costume stays crisp.
        scale: 2,
        maxSide: 4096
      })
        .then((r) => r.dataURL)
        .catch(() => href);
      cache.set(key, promise);
      return promise;
    };

    const symbols = new Map();
    Array.from(doc.getElementsByTagName("symbol")).forEach((sym) => {
      if (sym.getAttribute("id")) symbols.set(sym.getAttribute("id"), sym);
    });

    const COPY_ATTRS = [
      "x",
      "y",
      "width",
      "height",
      "transform",
      "opacity",
      "fill-opacity",
      "clip-path",
      "mask",
      "filter",
      "style",
      "class"
    ];

    const uses = Array.from(doc.getElementsByTagName("use"));
    for (const use of uses) {
      const ref = readHref(use).trim();
      if (!ref.startsWith("#")) continue;
      const id = ref.slice(1);
      const symbol = symbols.get(id) || doc.getElementById(id);
      if (!symbol) continue;

      const source = symbol.getElementsByTagName("image")[0];
      if (!source) continue;

      let href = readHref(source);
      if (!href) continue;

      let boxW = parseFloat(use.getAttribute("width")) || 0;
      let boxH = parseFloat(use.getAttribute("height")) || 0;
      if (!boxW || !boxH) {
        const sw = parseFloat(source.getAttribute("width")) || 0;
        const sh = parseFloat(source.getAttribute("height")) || 0;
        boxW = boxW || sw || 0;
        boxH = boxH || sh || 0;
      }

      if (isSvgDataURI(href)) {
        href = await toPNG(href, boxW, boxH);
      }

      const image = doc.createElementNS(SVG_NS, "image");
      COPY_ATTRS.forEach((name) => {
        const value = use.getAttribute(name);
        if (value !== null && value !== "") image.setAttribute(name, value);
      });
      if (boxW) image.setAttribute("width", String(boxW));
      if (boxH) image.setAttribute("height", String(boxH));
      // <symbol> without viewBox stretches its child to 100%/100%, so match that.
      image.setAttribute("preserveAspectRatio", "none");
      image.setAttribute("href", href);
      image.setAttributeNS(XLINK_NS, "xlink:href", href);

      if (use.parentNode) use.parentNode.replaceChild(image, use);
    }

    // Any image left in place: dual-write href and flatten nested SVG payloads.
    const images = Array.from(doc.getElementsByTagName("image"));
    for (const image of images) {
      let href = readHref(image);
      if (!href) continue;
      if (isSvgDataURI(href)) {
        href = await toPNG(
          href,
          parseFloat(image.getAttribute("width")) || 0,
          parseFloat(image.getAttribute("height")) || 0
        );
      }
      image.setAttribute("href", href);
      image.setAttributeNS(XLINK_NS, "xlink:href", href);
    }

    // Drop the now-unused symbols, and any <defs> that became empty.
    symbols.forEach((sym) => {
      if (sym.parentNode) sym.parentNode.removeChild(sym);
    });
    Array.from(doc.getElementsByTagName("defs")).forEach((defs) => {
      if (!defs.children.length && defs.parentNode) defs.parentNode.removeChild(defs);
    });

    return new XMLSerializer().serializeToString(doc);
  }

  async function addBitmapCostume(dataURL, name, target) {
    if (!/^data:image\/png/.test(String(dataURL))) return;
    const response = await fetch(dataURL);
    const buffer = new Uint8Array(await response.arrayBuffer());
    const storage = runtime.storage;
    const asset = storage.createAsset(
      storage.AssetType.ImageBitmap,
      storage.DataFormat.PNG,
      buffer,
      null,
      true
    );
    const bitmap = await createImageBitmap(new Blob([buffer], { type: "image/png" }));
    await vm.addCostume(
      asset.assetId + "." + asset.dataFormat,
      {
        name: String(name || "drawing"),
        dataFormat: asset.dataFormat,
        asset,
        md5ext: asset.assetId + "." + asset.dataFormat,
        rotationCenterX: bitmap.width / 2,
        rotationCenterY: bitmap.height / 2,
        bitmapResolution: 2
      },
      target.id
    );
  }

  async function addVectorCostume(svgText, name, target) {
    const text = String(svgText || "");
    if (!/<svg[\s>]/i.test(text)) return;
    const storage = runtime.storage;
    const asset = storage.createAsset(
      storage.AssetType.ImageVector,
      storage.DataFormat.SVG,
      new TextEncoder().encode(text),
      null,
      true
    );
    const size = svgSize(text);
    await vm.addCostume(
      asset.assetId + "." + asset.dataFormat,
      {
        name: String(name || "drawing"),
        dataFormat: asset.dataFormat,
        asset,
        md5ext: asset.assetId + "." + asset.dataFormat,
        rotationCenterX: size.width / 2,
        rotationCenterY: size.height / 2
      },
      target.id
    );
  }

  function costumeDataURL(costume) {
    const asset = costume && costume.asset;
    if (!asset || typeof asset.encodeDataURI !== "function") return null;
    const isSVG = String(costume.dataFormat).toLowerCase() === "svg";
    return {
      dataURL: asset.encodeDataURI(),
      mimeType: isSVG ? "image/svg+xml" : "image/" + costume.dataFormat,
      isSVG
    };
  }

  // Excalidraw stores images as files; keeping SVG there would come back out as
  // SVG-in-SVG on export, so convert to PNG at import time.
  async function toBoardImage(image) {
    if (!image || !image.dataURL) return null;
    if (!isSvgDataURI(image.dataURL)) {
      return { dataURL: image.dataURL, mimeType: image.mimeType || "image/png" };
    }
    try {
      const raster = await rasterizeToPNG(image.dataURL, { scale: 2, maxSide: 2048 });
      return {
        dataURL: raster.dataURL,
        mimeType: "image/png",
        width: raster.width,
        height: raster.height
      };
    } catch (e) {
      console.warn("[Excalidraw] SVG rasterize failed", e);
      return null;
    }
  }

  function resolveTarget(name, util) {
    const text = Scratch.Cast.toString(name);
    if (text === "_myself_" || text === "自己") return util.target;
    return runtime.getSpriteTargetByName(text) || util.target;
  }

  function resolveCostume(target, selector) {
    const costumes = target.getCostumes();
    const text = Scratch.Cast.toString(selector);
    const byName = costumes.find((c) => c.name === text);
    if (byName) return byName;
    const index = Math.round(Scratch.Cast.toNumber(selector));
    if (index >= 1 && index <= costumes.length) return costumes[index - 1];
    return null;
  }

  class ExcalidrawEditor {
    getInfo() {
      const NUM = Scratch.ArgumentType.NUMBER;
      const STR = Scratch.ArgumentType.STRING;
      return {
        id: "excalidraw",
        name: "Excalidraw 画板",
        color1: "#6965db",
        color2: "#5b57d1",
        color3: "#4b47b8",
        blocks: [
          { blockType: Scratch.BlockType.LABEL, text: "窗口" },
          {
            opcode: "open",
            blockType: Scratch.BlockType.COMMAND,
            text: "打开画板 模式[MODE]",
            arguments: { MODE: { type: STR, menu: "mode", defaultValue: "embed" } }
          },
          { opcode: "close", blockType: Scratch.BlockType.COMMAND, text: "关闭画板" },
          {
            opcode: "setMode",
            blockType: Scratch.BlockType.COMMAND,
            text: "切换到[MODE]模式",
            arguments: { MODE: { type: STR, menu: "mode", defaultValue: "float" } }
          },
          {
            opcode: "setVisible",
            blockType: Scratch.BlockType.COMMAND,
            text: "[STATE]画板",
            arguments: { STATE: { type: STR, menu: "visibility", defaultValue: "show" } }
          },
          {
            opcode: "setRect",
            blockType: Scratch.BlockType.COMMAND,
            text: "设置画板 宽[W] 高[H] 位置 x:[X] y:[Y]",
            arguments: {
              W: { type: NUM, defaultValue: 440 },
              H: { type: NUM, defaultValue: 320 },
              X: { type: NUM, defaultValue: 0 },
              Y: { type: NUM, defaultValue: 0 }
            }
          },
          { opcode: "isOpen", blockType: Scratch.BlockType.BOOLEAN, text: "画板已打开?" },
          { opcode: "currentMode", blockType: Scratch.BlockType.REPORTER, text: "画板模式" },
          {
            opcode: "whenChanged",
            blockType: Scratch.BlockType.HAT,
            isEdgeActivated: false,
            text: "当画板内容被修改"
          },

          "---",
          { blockType: Scratch.BlockType.LABEL, text: "语言" },
          {
            opcode: "setLang",
            blockType: Scratch.BlockType.COMMAND,
            text: "设置画板语言为[LANG]",
            arguments: { LANG: { type: STR, menu: "languages", defaultValue: "auto" } }
          },
          { opcode: "currentLang", blockType: Scratch.BlockType.REPORTER, text: "画板语言" },

          "---",
          { blockType: Scratch.BlockType.LABEL, text: "画面内容" },
          { opcode: "clear", blockType: Scratch.BlockType.COMMAND, text: "清空画板" },
          { opcode: "zoomFit", blockType: Scratch.BlockType.COMMAND, text: "缩放到适合内容" },
          {
            opcode: "setScene",
            blockType: Scratch.BlockType.COMMAND,
            text: "载入场景 JSON [JSON]",
            arguments: { JSON: { type: STR, defaultValue: "{}" } }
          },
          { opcode: "getScene", blockType: Scratch.BlockType.REPORTER, text: "场景 JSON" },
          { opcode: "elementCount", blockType: Scratch.BlockType.REPORTER, text: "图形数量" },

          "---",
          { blockType: Scratch.BlockType.LABEL, text: "导入 / 导出" },
          {
            opcode: "importCostume",
            blockType: Scratch.BlockType.COMMAND,
            text: "导入[SPRITE]的造型[COSTUME]到画板",
            arguments: {
              SPRITE: { type: STR, menu: "sprites", defaultValue: "_myself_" },
              COSTUME: { type: STR, defaultValue: "1" }
            }
          },
          {
            opcode: "importDataURL",
            blockType: Scratch.BlockType.COMMAND,
            text: "导入图片数据链接[URL]到画板",
            arguments: { URL: { type: STR, defaultValue: "data:image/png;base64,..." } }
          },
          {
            opcode: "toCostume",
            blockType: Scratch.BlockType.COMMAND,
            text: "保存为[KIND]造型[NAME] 背景[BG]",
            arguments: {
              KIND: { type: STR, menu: "costumeKind", defaultValue: "vector" },
              NAME: { type: STR, defaultValue: "我的画" },
              BG: { type: STR, menu: "background", defaultValue: "transparent" }
            }
          },
          {
            opcode: "exportImage",
            blockType: Scratch.BlockType.REPORTER,
            text: "导出[FORMAT] 背景[BG] 倍率[SCALE]",
            arguments: {
              FORMAT: { type: STR, menu: "format", defaultValue: "png" },
              BG: { type: STR, menu: "background", defaultValue: "transparent" },
              SCALE: { type: NUM, defaultValue: 2 }
            }
          }
        ],
        menus: {
          mode: {
            acceptReporters: true,
            items: [
              { text: "嵌入舞台", value: "embed" },
              { text: "浮动窗口", value: "float" }
            ]
          },
          visibility: {
            acceptReporters: true,
            items: [
              { text: "显示", value: "show" },
              { text: "隐藏", value: "hide" }
            ]
          },
          background: {
            acceptReporters: true,
            items: [
              { text: "透明", value: "transparent" },
              { text: "白色", value: "white" }
            ]
          },
          format: {
            acceptReporters: true,
            items: [
              { text: "PNG 数据链接", value: "png" },
              { text: "SVG 文本", value: "svg" }
            ]
          },
          costumeKind: {
            acceptReporters: true,
            items: [
              { text: "矢量", value: "vector" },
              { text: "位图", value: "bitmap" }
            ]
          },
          languages: {
            acceptReporters: true,
            items: [
              { text: "自动（跟随编辑器）", value: "auto" },
              { text: "简体中文", value: "zh-CN" },
              { text: "繁體中文", value: "zh-TW" },
              { text: "English", value: "en" },
              { text: "日本語", value: "ja-JP" },
              { text: "한국어", value: "ko-KR" },
              { text: "Français", value: "fr-FR" },
              { text: "Deutsch", value: "de-DE" },
              { text: "Español", value: "es-ES" },
              { text: "Русский", value: "ru-RU" },
              { text: "Português (BR)", value: "pt-BR" },
              { text: "العربية", value: "ar-SA" }
            ]
          },
          sprites: { acceptReporters: true, items: "spriteMenu" }
        }
      };
    }

    spriteMenu() {
      const items = [{ text: "自己", value: "_myself_" }];
      runtime.targets.forEach((target) => {
        if (target.isOriginal && !target.isStage) {
          items.push({ text: target.getName(), value: target.getName() });
        }
      });
      return items;
    }

    open(args) {
      overlay.open(Scratch.Cast.toString(args.MODE) === "float" ? "float" : "embed");
      overlay.setVisible(true);
    }

    close() {
      overlay.close();
    }

    setMode(args) {
      overlay.setMode(Scratch.Cast.toString(args.MODE));
    }

    setVisible(args) {
      overlay.setVisible(Scratch.Cast.toString(args.STATE) !== "hide");
    }

    setRect(args) {
      overlay.setRect({
        width: Math.max(120, Scratch.Cast.toNumber(args.W)),
        height: Math.max(100, Scratch.Cast.toNumber(args.H)),
        x: Scratch.Cast.toNumber(args.X),
        y: Scratch.Cast.toNumber(args.Y)
      });
    }

    isOpen() {
      return overlay.isOpen;
    }

    currentMode() {
      return overlay.mode === "float" ? "浮动窗口" : "嵌入舞台";
    }

    whenChanged() {
      return true;
    }

    setLang(args) {
      overlay.setLangMode(Scratch.Cast.toString(args.LANG));
    }

    currentLang() {
      return overlay.resolveLang();
    }

    clear() {
      return overlay.send("clear").then(() => {});
    }

    zoomFit() {
      return overlay.send("zoomFit").then(() => {});
    }

    setScene(args) {
      return overlay.send("setScene", { json: Scratch.Cast.toString(args.JSON) }).then(() => {});
    }

    getScene() {
      return overlay.send("getScene").then((value) => Scratch.Cast.toString(value));
    }

    elementCount() {
      return overlay.send("elementCount").then((value) => Scratch.Cast.toNumber(value));
    }

    async importCostume(args, util) {
      const target = resolveTarget(args.SPRITE, util);
      const costume = resolveCostume(target, args.COSTUME);
      if (!costume) return;
      const image = await toBoardImage(costumeDataURL(costume));
      if (!image) return;
      await overlay.send("addImage", image);
    }

    async importDataURL(args) {
      const url = Scratch.Cast.toString(args.URL);
      if (!/^data:image\//.test(url)) return;
      const cut = url.indexOf(";") >= 0 ? url.indexOf(";") : url.indexOf(",");
      const image = await toBoardImage({ dataURL: url, mimeType: url.slice(5, cut) });
      if (!image) return;
      await overlay.send("addImage", image);
    }

    async toCostume(args, util) {
      const background = Scratch.Cast.toString(args.BG) === "white";
      if (Scratch.Cast.toString(args.KIND) === "bitmap") {
        const dataURL = await overlay.send("exportPNG", { background, scale: 2 });
        if (dataURL) await addBitmapCostume(dataURL, args.NAME, util.target);
        return;
      }
      const svg = await overlay.send("exportSVG", { background });
      if (!svg) return;
      const flat = await flattenExportedSVG(svg);
      await addVectorCostume(flat, args.NAME, util.target);
    }

    async exportImage(args) {
      const background = Scratch.Cast.toString(args.BG) === "white";
      if (Scratch.Cast.toString(args.FORMAT) === "svg") {
        const svg = await overlay.send("exportSVG", { background });
        if (!svg) return "";
        return Scratch.Cast.toString(await flattenExportedSVG(svg));
      }
      const png = await overlay.send("exportPNG", {
        background,
        scale: Math.max(0.1, Scratch.Cast.toNumber(args.SCALE))
      });
      return Scratch.Cast.toString(png);
    }
  }

  Scratch.extensions.register(new ExcalidrawEditor());
})(Scratch);
