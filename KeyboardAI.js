/* ===========================================================
   ПРЕЛОАДЕР
   Отдельный блок: не зависит от остального кода страницы.
   Прогресс честный наполовину: идёт по времени, но не уходит
   дальше 92%, пока не загрузились страница и шрифты. Минимум
   ~1.9 с, чтобы не мигал на быстрой сети; максимум 7 с, чтобы
   никогда не держать человека на заставке.
   =========================================================== */
(function () {
  "use strict";

  /* true — показывать заставку только при первом заходе за сессию */
  var SHOW_ONCE_PER_SESSION = false;

  var root = document.documentElement;
  var el = document.getElementById("preloader");

  function after(ms, fn) { return window.setTimeout(fn, ms); }

  function dispose() {
    root.classList.remove("pl-show", "pl-lock");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  if (!el) { dispose(); return; }

  if (SHOW_ONCE_PER_SESSION) {
    try {
      if (window.sessionStorage.getItem("nexus-preloader")) { dispose(); return; }
      window.sessionStorage.setItem("nexus-preloader", "1");
    } catch (e) { /* хранилище недоступно — просто показываем */ }
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ring = el.querySelector(".pl-ring-fill");
  var countEl = el.querySelector(".pl-count b");
  var cap = el.querySelector(".pl-cap");

  var MIN_TIME = reduce ? 500 : 1900;   /* мс до 100% на быстрой сети */
  var MAX_WAIT = 7000;                  /* мс, после которых ждать загрузку перестаём */
  var STALL_AT = 92;                    /* пока не готово, дальше не идём */
  var MAX_RATE = 0.16;                  /* % в мс: сглаживает скачок после ожидания */

  var ready = false;
  var done = false;
  var p = 0;
  var shownInt = -1;
  var lastStep = 0;
  var last = performance.now();
  var start = last;

  function markReady() { ready = true; }

  var pageLoaded = document.readyState === "complete"
    ? Promise.resolve()
    : new Promise(function (resolve) { window.addEventListener("load", resolve, { once: true }); });
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

  Promise.all([pageLoaded, fontsReady]).then(markReady, markReady);
  after(MAX_WAIT, markReady);

  /* Медленный старт, быстрая середина, мягкий выход на 100% */
  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function tap() {
    cap.classList.remove("is-tap");
    void cap.offsetWidth;
    cap.classList.add("is-tap");
  }

  function render() {
    ring.style.strokeDashoffset = (100 - p).toFixed(2);
    el.style.setProperty("--p", (p / 100).toFixed(3));

    var n = Math.min(100, Math.floor(p));
    if (n === shownInt) return;
    shownInt = n;
    countEl.textContent = String(n);

    /* лёгкое касание на каждые 10% */
    var step = Math.floor(n / 10);
    if (step > lastStep && n < 100) {
      lastStep = step;
      if (!reduce) tap();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    p = 100;
    render();

    if (reduce) { dispose(); return; }

    cap.classList.remove("is-tap");
    el.classList.add("is-press");                    /* клавиша до упора + волна */

    after(380, function () { el.classList.add("is-leaving"); });

    after(520, function () {
      el.classList.add("is-lifting");                /* шторка уходит вверх */
      root.classList.remove("pl-lock");              /* снимает паузу с волны по клавиатуре hero */
    });

    after(520 + 1050, dispose);
  }

  function tick(now) {
    if (done) return;
    var dt = now - last;
    last = now;

    var t = Math.min(1, (now - start) / MIN_TIME);
    var target = Math.min(100 * ease(t), ready ? 100 : STALL_AT);
    p = Math.min(target, p + dt * MAX_RATE);
    render();

    if (p >= 99.9 && ready && t >= 1) finish();
    else window.requestAnimationFrame(tick);
  }

  /* Возврат по кнопке «назад» из кэша браузера: заставка не нужна */
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { done = true; dispose(); }
  });

  render();
  window.requestAnimationFrame(tick);
})();

(function () {
  "use strict";

  /* ===========================================================
     СОСТОЯНИЕ КОНФИГУРАТОРА
     Нужно раньше остального: от типа свитча зависит звук.
     =========================================================== */
  var config = { case: "graphite", switch: "linear", keycaps: "dark" };

  /* ===========================================================
     РАСКЛАДКИ
     Реальные 84 клавиши (75%), 68 клавиш (65%) и Studio.
     Каждый ряд занимает ровно 16 юнитов, поэтому клавиши разной
     ширины встают в общие столбцы, как на настоящей плате.
     =========================================================== */
  function k(code, label, ru, w) {
    return { code: code, label: label, ru: ru || "", w: w || 1 };
  }

  function letters(en, ru) {
    return en.split("").map(function (ch, i) {
      return k("Key" + ch, ch, ru.charAt(i));
    });
  }

  var AI_KEY = { code: "Insert", ai: true, w: 1 };
  var KNOB = { knob: true, w: 1 };

  var FN_KEYS = [];
  for (var f = 1; f <= 12; f++) FN_KEYS.push(k("F" + f, "F" + f));

  var ROW_FN = [k("Escape", "Esc")].concat(FN_KEYS, [k("PrintScreen", "PrtSc"), k("Delete", "Del"), AI_KEY]);
  var ROW_FN_STUDIO = [k("Escape", "Esc")].concat(FN_KEYS, [KNOB, k("Delete", "Del"), AI_KEY]);

  var ROW_NUM = [k("Backquote", "`", "Ё")]
    .concat("1234567890".split("").map(function (d) { return k("Digit" + d, d); }))
    .concat([k("Minus", "-"), k("Equal", "="), k("Backspace", "Backspace", "", 2), k("PageUp", "PgUp")]);

  var ROW_TOP = [k("Tab", "Tab", "", 1.5)]
    .concat(letters("QWERTYUIOP", "ЙЦУКЕНГШЩЗ"))
    .concat([k("BracketLeft", "[", "Х"), k("BracketRight", "]", "Ъ"), k("Backslash", "\\", "", 1.5), k("PageDown", "PgDn")]);

  var ROW_HOME = [k("CapsLock", "Caps", "", 1.75)]
    .concat(letters("ASDFGHJKL", "ФЫВАПРОЛД"))
    .concat([k("Semicolon", ";", "Ж"), k("Quote", "'", "Э"), k("Enter", "Enter", "", 2.25), k("Home", "Home")]);

  var ROW_SHIFT = [k("ShiftLeft", "Shift", "", 2.25)]
    .concat(letters("ZXCVBNM", "ЯЧСМИТЬ"))
    .concat([k("Comma", ",", "Б"), k("Period", ".", "Ю"), k("Slash", "/"), k("ShiftRight", "Shift", "", 1.75), k("ArrowUp", "↑"), k("End", "End")]);

  var ROW_SPACE = [
    k("ControlLeft", "Ctrl", "", 1.25), k("MetaLeft", "Win", "", 1.25), k("AltLeft", "Alt", "", 1.25),
    k("Space", "", "", 6.25),
    k("AltRight", "Alt"), k("Fn", "Fn"), k("ControlRight", "Ctrl"),
    k("ArrowLeft", "←"), k("ArrowDown", "↓"), k("ArrowRight", "→")
  ];

  var LAYOUTS = {
    "75": [ROW_FN, ROW_NUM, ROW_TOP, ROW_HOME, ROW_SHIFT, ROW_SPACE],
    "65": [ROW_NUM, ROW_TOP, ROW_HOME, ROW_SHIFT, ROW_SPACE],
    "studio": [ROW_FN_STUDIO, ROW_NUM, ROW_TOP, ROW_HOME, ROW_SHIFT, ROW_SPACE]
  };

  var ALPHA_RE = /^(Key|Digit)|^(Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash)$/;
  var ARROW_RE = /^Arrow/;

  /* Реестр: физический код клавиши -> все её копии на странице */
  var keyIndex = {};

  function createKey(def, interactive, aiTab) {
    var el;

    if (def.ai) {
      if (interactive) {
        el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", "Клавиша ИИ: открыть чат NEXUS AI");
        if (!aiTab) el.tabIndex = -1;
      } else {
        el = document.createElement("div");
        el.setAttribute("aria-hidden", "true");
      }
      el.className = "key key-ai";
      el.dataset.code = def.code;
      return el;
    }

    el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");

    if (def.knob) {
      el.className = "key key-knob";
      return el;
    }

    var cls = "key " + (ALPHA_RE.test(def.code) ? "key-alpha" : "key-mod");
    if (ARROW_RE.test(def.code)) cls += " key-arrow";
    el.className = cls;
    el.dataset.code = def.code;

    if (def.label) {
      var kl = document.createElement("span");
      kl.className = "kl";
      kl.textContent = def.label;
      el.appendChild(kl);
    }
    if (def.ru) {
      var kr = document.createElement("span");
      kr.className = "kr";
      kr.textContent = def.ru;
      el.appendChild(kr);
    }
    return el;
  }

  function setCaps(container, caps) {
    container.classList.remove("caps-dark", "caps-light", "caps-duo");
    container.classList.add("caps-" + caps);
  }

  function buildBoard(container) {
    var layout = LAYOUTS[container.getAttribute("data-layout")] || LAYOUTS["75"];
    var interactive = container.getAttribute("data-interactive") === "true";
    var aiTab = container.getAttribute("data-ai-tab") !== "false";
    var legends = container.getAttribute("data-legends") || "full";

    container.textContent = "";
    container.classList.add("legends-" + legends);
    setCaps(container, container.getAttribute("data-caps") || "dark");

    var frag = document.createDocumentFragment();

    layout.forEach(function (row, r) {
      var rowEl = document.createElement("div");
      rowEl.className = "kb-row";
      var x = 0;

      row.forEach(function (def) {
        var el = createKey(def, interactive, aiTab);
        el.style.setProperty("--u", String(Math.round(def.w * 4)));
        el.style.setProperty("--x", x.toFixed(2));
        el.style.setProperty("--r", String(r));
        x += def.w;

        if (el.dataset.code && interactive) {
          (keyIndex[el.dataset.code] = keyIndex[el.dataset.code] || []).push(el);
        }
        rowEl.appendChild(el);
      });

      frag.appendChild(rowEl);
    });

    container.appendChild(frag);
  }

  Array.prototype.forEach.call(document.querySelectorAll(".kb-rows[data-layout]"), buildBoard);

  /* ===========================================================
     ЗВУК СВИТЧЕЙ (Web Audio, без файлов)
     Нажатие собрано из слоёв, как у настоящей клавиатуры:
       - щелчок или бугорок свитча (у тактильных и кликовых),
       - «тук» корпуса: короткий низкий тон с провалом по высоте,
       - глухой удар колпачка о плату,
       - тонкий звон пластины,
       - у широких клавиш (пробел, Enter, Shift) ещё и дребезг
         стабилизатора, а сам звук ниже.
     Отпускание клавиши звучит отдельно, тише и суше. Каждое
     нажатие чуть отличается, а звук смещается влево или вправо
     в зависимости от положения клавиши на экране.
     Чтобы изменить характер, правьте профили в SWITCH_SOUND.
     =========================================================== */
  var audioCtx = null;
  var noiseBuf = null;
  var masterIn = null;
  var soundOn = false;

  /* thock: высота «тука», Гц; body: срез шума корпуса, Гц; ping: звон пластины, Гц;
     click: сила щелчка (0 — без щелчка), clickDelay: сколько проходит от щелчка
     до удара о плату, с; up и upGain: частота и громкость отпускания */
  var SWITCH_SOUND = {
    linear: {
      thock: 128, thockGain: 0.52, thockDecay: 0.11,
      body: 900, bodyGain: 0.7,
      ping: 2300, pingGain: 0.08,
      click: 0, clickFreq: 0, clickDelay: 0,
      up: 1800, upGain: 0.08
    },
    tactile: {
      thock: 150, thockGain: 0.46, thockDecay: 0.09,
      body: 1100, bodyGain: 0.65,
      ping: 2800, pingGain: 0.1,
      click: 0.22, clickFreq: 3300, clickDelay: 0.007,
      up: 2100, upGain: 0.1
    },
    clicky: {
      thock: 170, thockGain: 0.4, thockDecay: 0.075,
      body: 1400, bodyGain: 0.55,
      ping: 3600, pingGain: 0.12,
      click: 0.8, clickFreq: 4300, clickDelay: 0.014,
      up: 3000, upGain: 0.2
    }
  };

  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();

      // белый шум без затухания: огибающую задаёт каждый удар отдельно
      var len = Math.floor(audioCtx.sampleRate * 0.15);
      noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      // общий выход с компрессором: быстрая печать не клиппирует
      masterIn = audioCtx.createGain();
      masterIn.gain.value = 0.9;
      var comp = audioCtx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 12;
      comp.ratio.value = 5;
      comp.attack.value = 0.002;
      comp.release.value = 0.1;
      masterIn.connect(comp);
      comp.connect(audioCtx.destination);
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function voiceOut(ctx, pan) {
    var g = ctx.createGain();
    if (ctx.createStereoPanner) {
      var sp = ctx.createStereoPanner();
      sp.pan.value = pan;
      g.connect(sp);
      sp.connect(masterIn);
    } else {
      g.connect(masterIn);
    }
    return g;
  }

  // короткий удар шума через фильтр: корпус, плата, щелчок
  function noiseHit(ctx, out, t, type, freq, q, gain, decay) {
    var src = ctx.createBufferSource();
    var f = ctx.createBiquadFilter();
    var g = ctx.createGain();
    src.buffer = noiseBuf;
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.0006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(f);
    f.connect(g);
    g.connect(out);
    src.start(t, Math.random() * 0.05); // шум каждый раз с другого места
    src.stop(t + decay + 0.01);
  }

  // тон с падением частоты: основа «тука»
  function toneHit(ctx, out, t, f0, f1, sweep, gain, decay) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g);
    g.connect(out);
    o.start(t);
    o.stop(t + decay + 0.02);
  }

  // ширина клавиши в юнитах и положение по горизонтали для панорамы
  function keyTraits(keyEl) {
    var traits = { width: 1, pan: 0 };
    if (!keyEl || !keyEl.getBoundingClientRect) return traits;
    var u = parseFloat(keyEl.style.getPropertyValue("--u"));
    if (u) traits.width = u / 4;
    var r = keyEl.getBoundingClientRect();
    if (r.width && window.innerWidth) {
      var x = ((r.left + r.width / 2) / window.innerWidth) * 2 - 1;
      traits.pan = Math.max(-1, Math.min(1, x)) * 0.35;
    }
    return traits;
  }

  // клавиша с таким кодом, которая сейчас на экране (досок с клавишами несколько)
  function keyElFor(code) {
    var list = keyIndex[code];
    if (!list || !list.length) return null;
    for (var i = 0; i < list.length; i++) {
      var r = list[i].getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) return list[i];
    }
    return list[0];
  }

  function sizeScale(width) {
    return width >= 5 ? 0.62 : width >= 1.75 ? 0.8 : 1;
  }

  function playSwitch(type, keyEl) {
    var ctx = ensureAudio();
    if (!ctx) return;

    var p = SWITCH_SOUND[type] || SWITCH_SOUND.linear;
    var k = keyTraits(keyEl);
    var s = sizeScale(k.width);
    var j = 0.95 + Math.random() * 0.1; // каждое нажатие чуть отличается
    var t = ctx.currentTime + 0.005;
    var tb = t + p.clickDelay;          // момент удара о плату
    var out = voiceOut(ctx, k.pan);

    // щелчок или бугорок свитча
    if (p.click) {
      noiseHit(ctx, out, t, "bandpass", p.clickFreq * j, 3.5, p.click * 0.6, 0.012);
      if (p.click >= 0.5) {
        toneHit(ctx, out, t, p.clickFreq * 0.9 * j, p.clickFreq * 0.85 * j, 0.01, p.click * 0.06, 0.03);
      }
    }

    // «тук» корпуса и его обертон
    toneHit(ctx, out, tb, p.thock * 1.7 * s * j, p.thock * s * j, 0.03, p.thockGain, p.thockDecay);
    toneHit(ctx, out, tb, p.thock * 2.7 * s * j, p.thock * 2.3 * s * j, 0.02, p.thockGain * 0.3, p.thockDecay * 0.5);

    // колпачок о плату и звон пластины
    noiseHit(ctx, out, tb, "lowpass", p.body * s * j, 0.7, p.bodyGain, 0.05);
    noiseHit(ctx, out, tb, "bandpass", p.ping * j, 5, p.pingGain, 0.035);

    // дребезг стабилизатора у широких клавиш
    if (k.width >= 1.75) {
      noiseHit(ctx, out, tb + 0.004, "bandpass", 1300 * j, 2.5, k.width >= 5 ? 0.16 : 0.1, 0.045);
    }
  }

  function releaseSwitch(type, keyEl) {
    var ctx = ensureAudio();
    if (!ctx) return;

    var p = SWITCH_SOUND[type] || SWITCH_SOUND.linear;
    var k = keyTraits(keyEl);
    var s = sizeScale(k.width);
    var j = 0.95 + Math.random() * 0.1;
    var t = ctx.currentTime + 0.005;
    var out = voiceOut(ctx, k.pan);

    noiseHit(ctx, out, t, "bandpass", p.up * j, 1.6, p.upGain, 0.02);
    toneHit(ctx, out, t, p.thock * 0.8 * s * j, p.thock * 0.7 * s * j, 0.02, p.thockGain * 0.22, 0.04);
  }

  var previewTimers = [];
  function playPreview() {
    previewTimers.forEach(window.clearTimeout);
    previewTimers = [0, 140, 260, 420, 540, 700, 820].map(function (delay) {
      return window.setTimeout(function () {
        playSwitch(config.switch);
        window.setTimeout(function () { releaseSwitch(config.switch); }, 70);
      }, delay);
    });
  }

  var soundToggle = document.getElementById("soundToggle");
  if (soundToggle) {
    soundToggle.addEventListener("click", function () {
      soundOn = !soundOn;
      soundToggle.setAttribute("aria-pressed", String(soundOn));
      if (soundOn) playSwitch(config.switch);
    });
  }

  /* ===========================================================
     ОТКЛИК НА НАЖАТИЯ
     Физическая клавиатура подсвечивает клавиши на странице,
     клики и касания работают так же.
     =========================================================== */
  var chatRoot = document.getElementById("aiChat");

  function chatIsOpen() { return !!chatRoot && !chatRoot.hidden; }

  function isTypingTarget(t) {
    return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
  }

  function pressKey(code, down) {
    var list = keyIndex[code];
    if (!list) return;
    for (var i = 0; i < list.length; i++) list[i].classList.toggle("is-pressed", down);
  }

  function releaseAll() {
    Object.keys(keyIndex).forEach(function (code) { pressKey(code, false); });
  }

  function pulseAiKeys() {
    (keyIndex.Insert || []).forEach(function (el) {
      el.classList.remove("is-active");
      void el.offsetWidth;
      el.classList.add("is-active");
      window.setTimeout(function () { el.classList.remove("is-active"); }, 1100);
    });
  }

  var MOD_RE = /^(Control|Alt|Meta|Shift)(Left|Right)$/;

  document.addEventListener("keydown", function (e) {
    if (e.repeat || isTypingTarget(e.target) || chatIsOpen()) return;

    var isMod = MOD_RE.test(e.code);
    if (!isMod && (e.ctrlKey || e.metaKey || e.altKey)) return; // не мешаем сочетаниям браузера

    if (e.code === "Insert") {
      e.preventDefault();
      pressKey("Insert", true);
      pulseAiKeys();
      if (soundOn) { playSwitch(config.switch, keyElFor("Insert")); soundDown.Insert = true; }
      openChat(null);
      return;
    }

    if (!keyIndex[e.code]) return;
    pressKey(e.code, true);
    if (soundOn) { playSwitch(config.switch, keyElFor(e.code)); soundDown[e.code] = true; }
  });

  /* отпускание звучит, только если нажатие этой клавиши мы озвучили */
  var soundDown = {};

  document.addEventListener("keyup", function (e) {
    pressKey(e.code, false);
    if (soundDown[e.code]) {
      delete soundDown[e.code];
      if (soundOn) releaseSwitch(config.switch, keyElFor(e.code));
    }
  });
  window.addEventListener("blur", function () { soundDown = {}; releaseAll(); });

  var pointerKey = null;

  document.addEventListener("pointerdown", function (e) {
    var keyEl = e.target.closest ? e.target.closest('.kb-rows[data-interactive="true"] .key') : null;
    if (!keyEl || keyEl.classList.contains("key-knob")) return;
    keyEl.classList.add("is-pressed");
    pointerKey = keyEl;
    if (soundOn) { playSwitch(config.switch, keyEl); pointerSounded = true; }
  });

  var pointerSounded = false;

  function releasePointerKey() {
    if (pointerKey) {
      pointerKey.classList.remove("is-pressed");
      if (pointerSounded && soundOn) releaseSwitch(config.switch, pointerKey);
      pointerSounded = false;
      pointerKey = null;
    }
  }
  document.addEventListener("pointerup", releasePointerKey);
  document.addEventListener("pointercancel", releasePointerKey);

  /* Клавиша ИИ открывает чат */
  document.addEventListener("click", function (e) {
    var aiKey = e.target.closest ? e.target.closest("button.key-ai") : null;
    if (!aiKey) return;
    pulseAiKeys();
    openChat(aiKey);
  });

  /* ===========================================================
     ШАПКА: состояние при прокрутке, мобильное меню, подсветка раздела
     =========================================================== */
  var header = document.getElementById("siteHeader");
  var menuToggle = document.getElementById("menuToggle");
  var mobileNav = document.getElementById("mobileNav");
  var primaryNav = document.getElementById("primaryNav");
  var menuOpen = false;
  var menuBackground = Array.prototype.slice.call(document.querySelectorAll("main, footer.site-footer"));
  var menuLoop = [header.querySelector(".logo"), menuToggle].concat(
    Array.prototype.slice.call(mobileNav.querySelectorAll("a"))
  );

  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Мобильное меню: во весь экран, страница под ним не прокручивается
     и недоступна для фокуса (inert). */
  function setMenu(open) {
    if (open === menuOpen) return;
    menuOpen = open;
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    mobileNav.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("menu-open", open);
    menuBackground.forEach(function (el) { el.inert = open; });
  }

  menuToggle.addEventListener("click", function () {
    setMenu(!menuOpen);
  });

  Array.prototype.forEach.call(mobileNav.querySelectorAll("a"), function (link) {
    link.addEventListener("click", function () { setMenu(false); });
  });

  document.addEventListener("keydown", function (e) {
    if (!menuOpen) return;

    if (e.key === "Escape") {
      setMenu(false);
      menuToggle.focus();
      return;
    }

    /* Tab ходит по кругу: логотип, кнопка меню, ссылки меню */
    if (e.key === "Tab") {
      var first = menuLoop[0];
      var last = menuLoop[menuLoop.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  window.matchMedia("(min-width: 901px)").addEventListener("change", function (e) {
    if (e.matches) setMenu(false);
  });

  /* Подсветка в «таблетке»: идёт за курсором и фокусом,
     без них стоит под текущим разделом. */
  var hoverLink = null;

  function placeThumb() {
    var target = hoverLink || primaryNav.querySelector('a[aria-current="true"]');
    if (!target || !primaryNav.offsetWidth) {
      primaryNav.classList.remove("has-thumb");
      return;
    }
    var firstShow = !primaryNav.classList.contains("has-thumb");
    if (firstShow) primaryNav.classList.add("thumb-snap");
    primaryNav.style.setProperty("--thumb-x", target.offsetLeft + "px");
    primaryNav.style.setProperty("--thumb-w", target.offsetWidth + "px");
    if (firstShow) {
      void primaryNav.offsetWidth;
      primaryNav.classList.add("has-thumb");
      requestAnimationFrame(function () { primaryNav.classList.remove("thumb-snap"); });
    }
  }

  Array.prototype.forEach.call(primaryNav.querySelectorAll("a"), function (a) {
    a.addEventListener("mouseenter", function () { hoverLink = a; placeThumb(); });
    a.addEventListener("focus", function () {
      if (a.matches(":focus-visible")) { hoverLink = a; placeThumb(); }
    });
    a.addEventListener("blur", function () {
      if (hoverLink === a) { hoverLink = null; placeThumb(); }
    });
  });
  primaryNav.addEventListener("mouseleave", function () {
    hoverLink = null;
    placeThumb();
  });
  window.addEventListener("resize", placeThumb);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeThumb);

  /* Подсветка текущего раздела: в «таблетке» и в мобильном меню */
  var spyLinks = {};
  Array.prototype.forEach.call(
    document.querySelectorAll('.primary-nav a[href^="#"], .mobile-nav a[href^="#"]:not(.btn)'),
    function (a) {
      var id = a.getAttribute("href").slice(1);
      (spyLinks[id] = spyLinks[id] || []).push(a);
    }
  );

  function setCurrentSection(id) {
    Object.keys(spyLinks).forEach(function (key) {
      spyLinks[key].forEach(function (a) {
        if (key === id) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    });
    placeThumb();
  }

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var links = spyLinks[entry.target.id];
        if (!links) return;
        if (entry.isIntersecting) {
          setCurrentSection(entry.target.id);
        } else if (links[0].getAttribute("aria-current")) {
          setCurrentSection(null);
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });

    Object.keys(spyLinks).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) spy.observe(section);
    });
  }

  placeThumb();

  /* ===========================================================
     ЧАТ С ИИ
     Настоящая модель, как на сайте Neural Fortress: страница шлёт
     историю переписки на сервер (server.js, POST /api/chat) и
     получает { reply }. Ключ API живёт только на сервере, в этом
     файле его нет. Сайт нужно открывать через сервер (npm start),
     а не двойным кликом по файлу.
     =========================================================== */
  var chatWindow = chatRoot ? chatRoot.querySelector(".ai-chat-window") : null;
  var chatLog = document.getElementById("aiChatLog");
  var chatForm = document.getElementById("aiChatForm");
  var chatInput = document.getElementById("aiChatInput");
  var chatOpeners = Array.prototype.slice.call(document.querySelectorAll("[data-open-chat]"));
  var chatClosers = Array.prototype.slice.call(document.querySelectorAll("[data-close-chat]"));
  var chatChips = Array.prototype.slice.call(document.querySelectorAll(".chat-chip"));
  var pageRegions = Array.prototype.slice.call(document.querySelectorAll("header.site-header, main, footer.site-footer"));

  var chatTrigger = null;
  var chatGreeted = false;
  var chatBusy = false;
  var chatHideTimer = null;
  var chatHistory = [];

  var CHAT_CONFIG = {
    /* Относительный путь: работает, пока страницу отдаёт server.js
       (тот же адрес, CORS не нужен). Если API окажется на другом
       домене, подставьте полный URL. */
    endpoint: "/api/chat",
    timeoutMs: 30000,
    maxHistory: 20,
    systemPrompt:
      "Ты — NEXUS AI, ассистент на сайте механической клавиатуры NEXUS. " +
      "Помогаешь с текстом (сократить, переписать, перевести, объяснить код, набросать план) и отвечаешь на вопросы о клавиатуре. " +
      "О NEXUS используй только эти факты и ничего не выдумывай. " +
      "NEXUS — вымышленная концепция продукта, купить её нельзя. " +
      "Три модели: NEXUS 65 — компактная, 68 клавиш, без функционального ряда; " +
      "NEXUS 75 — сбалансированная, 84 клавиши, функциональный ряд и стрелки на месте, цена от $299; " +
      "NEXUS Studio — 84 клавиши, поворотный регулятор и двухцветные колпачки, для творческих задач. " +
      "Характеристики NEXUS 75: фрезерованный алюминиевый корпус, опрос 1000 Гц, 32-битный контроллер, N-key rollover, кастомная прошивка. " +
      "Свитчи с горячей заменой (линейные, тактильные, кликовые) меняются без пайки; послушать их можно в разделе «Настройка» на сайте. " +
      "Подключение: беспроводное с низкой задержкой и проводное по USB-C; до трёх устройств, переключение сочетанием Fn и цифры. " +
      "Отдельная клавиша ИИ запускает команды: сократить, переписать, перевести, объяснить, сгенерировать. " +
      "Если спрашивают о том, чего нет в этих фактах (вес, батарея, сроки, гарантия), скажи, что таких данных нет. " +
      "Если вопрос не о клавиатуре, тексте или коде, вежливо верни разговор к этим темам. " +
      "Отвечай по-русски, коротко, обычным текстом без Markdown-разметки (без звёздочек и решёток); " +
      "для списка нумеруй пункты «1. », «2. » с новой строки."
  };

  var CHAT_GREETING = {
    text: "Здравствуйте! Я NEXUS AI. Могу сократить или переписать текст, перевести, объяснить код и набросать план. Выберите команду ниже или напишите сами."
  };

  var CHAT_ERRORS = {
    timeout: "Ответ не пришёл за 30 секунд. Отправьте сообщение ещё раз.",
    offline: "Не удалось связаться с ассистентом. Проверьте соединение и отправьте сообщение ещё раз.",
    file: "Чат работает только через сервер. Запустите npm start и откройте сайт по адресу http://localhost:3000/keyboard."
  };

  /* Запрос к серверу. done(err, text): ровно один вызов на запрос. */
  function requestAiReply(done) {
    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = controller
      ? window.setTimeout(function () { controller.abort(); }, CHAT_CONFIG.timeoutMs)
      : 0;

    fetch(CHAT_CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: CHAT_CONFIG.systemPrompt,
        messages: chatHistory.slice(-CHAT_CONFIG.maxHistory)
      }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP_" + res.status);
        return res.json();
      })
      .then(function (data) {
        var reply = data && data.reply ? String(data.reply).trim() : "";
        if (!reply) throw new Error("EMPTY_REPLY");
        return reply;
      })
      .then(
        function (reply) {
          window.clearTimeout(timer);
          done(null, reply);
        },
        function (err) {
          window.clearTimeout(timer);
          if (window.console) console.error("NEXUS AI:", err);
          done(err);
        }
      );
  }

  function errorText(err) {
    if (window.location.protocol === "file:") return CHAT_ERRORS.file;
    if (err && err.name === "AbortError") return CHAT_ERRORS.timeout;
    return CHAT_ERRORS.offline;
  }

  function addMessage(role, content) {
    var el = document.createElement("div");
    el.className = "msg msg-" + role;

    var p = document.createElement("p");
    p.textContent = content.text;
    el.appendChild(p);

    if (content.list) {
      var ol = document.createElement("ol");
      content.list.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        ol.appendChild(li);
      });
      el.appendChild(ol);
    }

    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
    return el;
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "msg msg-ai msg-typing";
    el.innerHTML = '<span></span><span></span><span></span><span class="visually-hidden">NEXUS AI печатает…</span>';
    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
    return el;
  }

  function sendMessage(text) {
    text = (text || "").trim();
    if (!text || chatBusy) return false;

    chatBusy = true;
    addMessage("user", { text: text });
    chatHistory.push({ role: "user", content: text });
    var typing = showTyping();

    requestAiReply(function (err, reply) {
      if (typing.parentNode) typing.parentNode.removeChild(typing);

      if (err) {
        /* неудавшийся вопрос не остаётся в истории, повтор не задвоит его */
        chatHistory.pop();
        addMessage("error", { text: errorText(err) });
      } else {
        chatHistory.push({ role: "assistant", content: reply });
        addMessage("ai", { text: reply });
      }
      chatBusy = false;
    });
    return true;
  }

  function setPageInert(state) {
    pageRegions.forEach(function (el) { el.inert = state; });
  }

  function openChat(trigger) {
    if (!chatRoot || chatIsOpen()) return;
    window.clearTimeout(chatHideTimer);
    chatTrigger = trigger || null;
    releaseAll();

    chatRoot.hidden = false;
    void chatRoot.offsetWidth; // даём браузеру отрисовать до начала перехода
    chatRoot.classList.add("is-open");
    document.body.classList.add("chat-open");
    setPageInert(true);

    if (!chatGreeted) {
      chatGreeted = true;
      addMessage("ai", CHAT_GREETING);
    }

    // На тач-экранах фокус в поле сразу открыл бы экранную клавиатуру
    if (window.matchMedia("(hover: hover)").matches) {
      chatInput.focus();
    } else {
      chatWindow.focus();
    }
  }

  function closeChat() {
    if (!chatIsOpen()) return;
    chatRoot.classList.remove("is-open");
    document.body.classList.remove("chat-open");
    setPageInert(false);
    chatHideTimer = window.setTimeout(function () { chatRoot.hidden = true; }, 320);
    if (chatTrigger && document.body.contains(chatTrigger)) chatTrigger.focus();
  }

  chatOpeners.forEach(function (btn) {
    btn.addEventListener("click", function () { openChat(btn); });
  });
  chatClosers.forEach(function (el) { el.addEventListener("click", closeChat); });
  chatChips.forEach(function (chip) {
    chip.addEventListener("click", function () { sendMessage(chip.dataset.prompt); });
  });

  if (chatForm) {
    chatForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sendMessage(chatInput.value)) chatInput.value = "";
    });
  }

  /* Escape закрывает чат; Tab не уходит за его пределы */
  document.addEventListener("keydown", function (e) {
    if (!chatIsOpen() || !chatRoot.classList.contains("is-open")) return;

    if (e.key === "Escape") {
      e.preventDefault();
      closeChat();
      return;
    }
    if (e.key !== "Tab") return;

    var focusable = Array.prototype.slice
      .call(chatWindow.querySelectorAll('button, input, [tabindex="0"]'))
      .filter(function (el) { return !el.disabled; });
    if (!focusable.length) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    var active = document.activeElement;

    if (!chatWindow.contains(active) || active === chatWindow) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ===========================================================
     СЦЕНАРИИ ИИ: вкладки с примером «было — стало»
     =========================================================== */
  var workflowTabs = Array.prototype.slice.call(document.querySelectorAll(".workflow-tab"));
  var workflowDisplay = document.getElementById("workflowPanel");
  var workflowCmd = document.getElementById("workflowCmd");
  var workflowDesc = document.getElementById("workflowDesc");
  var wfFrom = document.getElementById("wfFrom");
  var wfTo = document.getElementById("wfTo");
  var workflowTimer = null;

  var WORKFLOW_CONTENT = {
    write: {
      cmd: "Переписать абзац",
      desc: "Улучшим тон, ясность и структуру, сохранив ваш стиль.",
      from: "Мы хотели бы вас проинформировать о том, что в связи с определёнными обстоятельствами встреча была перенесена на более позднее время.",
      to: "Встреча переносится на более позднее время."
    },
    code: {
      cmd: "Объяснить функцию",
      desc: "Получите понятное объяснение того, что делает код и зачем.",
      from: "items.reduce((s, i) => s + i.price * i.qty, 0)",
      to: "Складывает стоимость всех позиций: цена каждой умножается на количество, начальное значение суммы — 0.",
      mono: true
    },
    design: {
      cmd: "Сгенерировать творческое направление",
      desc: "Превратите сырую идею в готовую концепцию за секунды.",
      from: "Приложение для медитации. Нужен визуальный стиль.",
      to: "Тихий и тёплый: мягкие цвета рассвета, крупная округлая типографика, много воздуха и никаких резких контрастов."
    },
    research: {
      cmd: "Суммировать данные",
      desc: "Сожмите длинные источники до того, что действительно важно.",
      from: "Опрос 1 200 пользователей: 64% открывают приложение утром, 22% днём, 14% вечером. Среди утренних пользователей 71% заходят из уведомления.",
      to: "Почти две трети аудитории приходит утром, и большинство из них — по уведомлению. Его стоит планировать на это время."
    },
    create: {
      cmd: "Набросать первую версию",
      desc: "Начните не с чистого листа — ИИ сделает первый черновик.",
      from: "Письмо клиенту: поставка задерживается на два дня.",
      to: "Здравствуйте! Ваш заказ задерживается на два дня. Приносим извинения и отправим его сразу после комплектации."
    }
  };

  function renderWorkflow(content) {
    workflowCmd.textContent = content.cmd;
    workflowDesc.textContent = content.desc;
    wfFrom.textContent = content.from;
    wfTo.textContent = content.to;
    wfFrom.classList.toggle("is-code", !!content.mono);
  }

  function switchWorkflow(category) {
    var content = WORKFLOW_CONTENT[category];
    if (!content || !workflowDisplay) return;

    workflowTabs.forEach(function (tab) {
      var active = tab.dataset.category === category;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active) workflowDisplay.setAttribute("aria-labelledby", tab.id);
    });

    window.clearTimeout(workflowTimer);
    workflowDisplay.classList.add("is-switching");
    workflowTimer = window.setTimeout(function () {
      renderWorkflow(content);
      workflowDisplay.classList.remove("is-switching");
    }, 180);
  }

  workflowTabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { switchWorkflow(tab.dataset.category); });

    tab.addEventListener("keydown", function (e) {
      var n = workflowTabs.length;
      var next = i;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = n - 1;
      else return;

      e.preventDefault();
      workflowTabs[next].focus();
      switchWorkflow(workflowTabs[next].dataset.category);
    });
  });

  /* ===========================================================
     КОНФИГУРАТОР
     Клавиатура не пересобирается при выборе: меняются только
     классы, поэтому обработчики и состояние клавиш сохраняются.
     =========================================================== */
  var customKbBody = document.getElementById("customKbBody");
  var customKbRows = document.getElementById("customKbRows");
  var configSummary = document.getElementById("configSummary");
  var switchNote = document.getElementById("switchNote");

  var CASE_CLASS = {
    graphite: "kb-case-graphite",
    silver: "kb-case-silver",
    black: "kb-case-black"
  };

  var LABELS = {
    case: { graphite: "графитовый", silver: "серебристый", black: "чёрный" },
    switch: { linear: "линейные", tactile: "тактильные", clicky: "кликовые" },
    keycaps: { dark: "тёмные", light: "светлые", duo: "двухцветные" }
  };

  var SWITCH_NOTE = {
    linear: "Плавный ход без щелчка и бугорка. Тихий и быстрый.",
    tactile: "Заметный бугорок в момент срабатывания. Точный набор без лишнего шума.",
    clicky: "Чёткий щелчок при срабатывании. Его и слышно, и чувствуется."
  };

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function applyConfig() {
    if (customKbBody) {
      customKbBody.classList.remove("kb-case-graphite", "kb-case-silver", "kb-case-black");
      customKbBody.classList.add(CASE_CLASS[config.case]);
    }
    if (customKbRows) setCaps(customKbRows, config.keycaps);
    if (switchNote) switchNote.textContent = SWITCH_NOTE[config.switch];
    if (configSummary) {
      configSummary.textContent = capitalize(
        LABELS.case[config.case] + " корпус, " +
        LABELS.switch[config.switch] + " свитчи, " +
        LABELS.keycaps[config.keycaps] + " колпачки."
      );
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll(".option-swatch, .option-pill"), function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.dataset.group;
      var value = btn.dataset.value;
      if (!group || !value) return;

      config[group] = value;

      Array.prototype.forEach.call(document.querySelectorAll('[data-group="' + group + '"]'), function (b) {
        b.setAttribute("aria-pressed", String(b === btn));
      });

      applyConfig();
      if (group === "switch") playSwitch(value);
    });
  });

  var switchPreview = document.getElementById("switchPreview");
  if (switchPreview) switchPreview.addEventListener("click", playPreview);

  /* ===========================================================
     ФУНКЦИИ: клавиатура слева подсвечивает клавиши того пункта,
     который сейчас в центре экрана
     =========================================================== */
  var featSection = document.getElementById("features");
  var featBoard = document.getElementById("featKbRows");
  var featItems = Array.prototype.slice.call(document.querySelectorAll(".feature-item[data-keys]"));

  if (featSection && featBoard && featItems.length && "IntersectionObserver" in window) {
    var featKeys = {};
    Array.prototype.forEach.call(featBoard.querySelectorAll("[data-code]"), function (el) {
      featKeys[el.dataset.code] = el;
    });
    var activeFeat = null;

    var lightFeature = function (item) {
      if (activeFeat === item) return;
      activeFeat = item;
      var codes = item.dataset.keys.split(",");

      featItems.forEach(function (it) { it.classList.toggle("is-active", it === item); });
      Object.keys(featKeys).forEach(function (code) {
        featKeys[code].classList.toggle("key-lit", codes.indexOf(code) !== -1);
      });
      featBoard.classList.add("is-focus");
    };

    featSection.classList.add("is-enhanced");
    var featIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) lightFeature(en.target); });
    }, { rootMargin: "-48% 0px -48% 0px" });
    featItems.forEach(function (it) { featIO.observe(it); });
    lightFeature(featItems[0]);
  }

  /* ===========================================================
     HERO: клавиатура слегка поворачивается за курсором,
     блик на корпусе следует за ним. Только для мыши.
     =========================================================== */
  var heroStage = document.querySelector(".hero-stage");
  var heroBody = heroStage ? heroStage.querySelector(".kb-hero .kb-body") : null;

  if (heroBody && window.matchMedia("(hover: hover) and (min-width: 769px) and (prefers-reduced-motion: no-preference)").matches) {
    var tiltFrame = 0;

    heroStage.addEventListener("pointermove", function (e) {
      var cx = e.clientX, cy = e.clientY;
      if (tiltFrame) return;
      tiltFrame = window.requestAnimationFrame(function () {
        tiltFrame = 0;
        var r = heroStage.getBoundingClientRect();
        var nx = Math.max(-1, Math.min(1, ((cx - r.left) / r.width) * 2 - 1));
        var ny = Math.max(-1, Math.min(1, ((cy - r.top) / r.height) * 2 - 1));
        heroBody.style.setProperty("--tilt-y", (nx * 5).toFixed(2) + "deg");
        heroBody.style.setProperty("--tilt-x", (-ny * 4).toFixed(2) + "deg");
        heroBody.style.setProperty("--mx", ((nx + 1) * 50).toFixed(1) + "%");
        heroBody.style.setProperty("--my", ((ny + 1) * 50).toFixed(1) + "%");
      });
    });

    heroStage.addEventListener("pointerleave", function () {
      ["--tilt-x", "--tilt-y", "--mx", "--my"].forEach(function (name) {
        heroBody.style.removeProperty(name);
      });
    });
  }

  applyConfig();
})();

/* ===========================================================
   АНИМАЦИЯ ПРИ СКРОЛЛЕ
   Движение привязано к положению страницы, а не к таймеру:
   прокрутили чуть-чуть, анимация прошла чуть-чуть, и обратно.
   Что здесь происходит:
     - hero: заголовок уходит вверх и гаснет, клавиатура
       остаётся и растёт, свет за ней расходится;
     - заголовки секций зажигаются по словам;
     - клавиатуры разворачиваются к зрителю и выравниваются;
     - карточки и строки всплывают по очереди;
     - стол: предметы движутся с разной скоростью, а в мониторе
       выделяется текст и появляется панель ИИ;
     - числа в характеристиках набираются до значения;
     - тонкая полоса прогресса в шапке.
   Без prefers-reduced-motion и без поддержки translate/scale/rotate
   скрипт не делает ничего, страница остаётся как была.
   Всё настраивается в списке RULES ниже.
   =========================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.CSS || !CSS.supports || !CSS.supports("translate", "0 1px") ||
      !CSS.supports("scale", "1") || !CSS.supports("rotate", "0 1 0 5deg")) return;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function linear(t) { return t; }

  /* ---------- правила ----------
     range: enter (появление: верх элемента идёт от from к to доли высоты окна),
            view (весь проход через окно, 0 при входе снизу, 1 при выходе сверху),
            hero (первые 80% высоты hero)
     y, s, yaw, op: значения в начале и в конце [от, до]; opk: насколько быстрее
     прозрачность доходит до конца (1.5 значит на 2/3 пути)
     span: подотрезок прогресса [от, до], ref: элемент, по которому считается
     прогресс (если не он сам), group и stagger: задержка по колонкам в ряду */
  var RISE = { y: [28, 0], op: [0, 1], opk: 1.4, from: 0.95, to: 0.7 };
  var BOARD = { y: [64, 0], s: [0.88, 1], op: [0, 1], opk: 1.6, from: 0.95, to: 0.45 };

  var RULES = [
    /* hero */
    { sel: ".hero-copy",  range: "hero", y: [0, -90], op: [1, 0], opk: 1.7 },
    { sel: ".kb-hero",    range: "hero", y: [0, 56], s: [1, 1.09] },
    { sel: ".hero-hint",  range: "hero", y: [0, 28] },
    { sel: ".hero-light", range: "hero", y: [0, -70], s: [1, 1.3], op: [1, 0.15] },

    /* заголовки и подзаголовки */
    { sel: ".section-head h2, .final-cta h2", fx: "words", ref: ".specs-layout", from: 0.9, to: 0.42 },
    { sel: ".section-head p, .final-cta-inner > p:not(.final-cta-note)", ref: ".specs-layout", base: RISE, delay: 0.03 },

    /* продукт */
    { sel: ".intro-visual .keyboard-wrap", ref: ".intro-visual", range: "view", ease: "out",
      span: [0, 0.5], y: [72, 0], s: [0.86, 1], yaw: [16, 0], op: [0, 1], opk: 2.2 },
    { sel: ".spec-chips li", base: RISE, from: 0.97, to: 0.74 },

    /* функции */
    { sel: ".kb-feature", ref: ".features-layout", base: BOARD, yaw: [14, 0] },

    /* ИИ */
    { sel: ".workflow-tabs", base: RISE, from: 0.97, to: 0.76 },
    { sel: ".workflow-stage", y: [56, 0], s: [0.93, 1], op: [0, 1], opk: 1.5, from: 0.98, to: 0.52 },

    /* настройка */
    { sel: ".customize-visual .keyboard-wrap", ref: ".customize-visual", base: BOARD, yaw: [-14, 0] },
    { sel: ".option-group", base: RISE, from: 0.97, to: 0.72 },

    /* детали */
    { sel: ".detail-card", group: "detail", stagger: 0.07, y: [56, 0], s: [0.96, 1], op: [0, 1], opk: 1.5, from: 0.98, to: 0.62 },
    { sel: ".detail-visual img", ref: ".detail-card", range: "view", y: [14, -14] },

    /* характеристики */
    { sel: ".spec-row", base: RISE, y: [22, 0], from: 0.98, to: 0.78 },
    { sel: ".spec-row dd[data-count]", fx: "count", ref: ".spec-row", from: 0.98, to: 0.66 },

    /* стол: лёгкий сдвиг фото при прокрутке */
    { sel: ".desk-scene img", ref: ".desk-scene", range: "view", y: [-14, 14] },

    /* линейка */
    { sel: ".model-item", group: "model", stagger: 0.08, y: [60, 0], op: [0, 1], opk: 1.5, from: 0.98, to: 0.64 },
    { sel: ".model-item:nth-child(1) .keyboard-wrap", ref: ".model-item", range: "view", y: [10, -10] },
    { sel: ".model-item:nth-child(2) .keyboard-wrap", ref: ".model-item", range: "view", y: [18, -18] },
    { sel: ".model-item:nth-child(3) .keyboard-wrap", ref: ".model-item", range: "view", y: [26, -26] },

    /* цена, вопросы, финал */
    { sel: ".price-band", y: [48, 0], s: [0.95, 1], op: [0, 1], opk: 1.5, from: 0.98, to: 0.6 },
    { sel: ".faq-item", base: RISE, y: [18, 0], from: 0.98, to: 0.8 },
    { sel: ".final-cta-actions, .final-cta-note", base: RISE, delay: 0.05 }
  ];

  /* ---------- подготовка ---------- */
  var items = [];
  var vh = window.innerHeight, vw = window.innerWidth;
  var docH = 0, heroH = 0;
  var hero = document.querySelector(".hero");
  var bar = document.querySelector(".scroll-progress");

  function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      if (src) for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }

  function splitWords(el) {
    var words = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType !== 3) return; // <br> и вложенные теги не трогаем
      var frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement("span");
        w.className = "sa-w";
        w.textContent = part;
        frag.appendChild(w);
        words.push(w);
      });
      el.replaceChild(frag, node);
    });
    return words;
  }

  RULES.forEach(function (rule) {
    var o = extend({ range: "enter", fx: "pose", y: [0, 0], s: [1, 1], yaw: [0, 0], op: [1, 1], opk: 1,
                     from: 0.92, to: 0.62, delay: 0, stagger: 0 }, rule.base, rule);
    var list = document.querySelectorAll(rule.sel);
    Array.prototype.forEach.call(list, function (el) {
      var it = {
        el: el, o: o, q: -1, top: 0, left: 0, h: 0, extra: 0,
        ref: (o.ref && el.closest(o.ref)) || el,
        ease: (o.ease === "out" || (!o.ease && o.range === "enter")) ? easeOut : linear
      };
      if (o.fx === "words") it.words = splitWords(el);
      if (o.fx === "count") {
        it.target = parseInt(el.getAttribute("data-count"), 10);
        it.suffix = el.textContent.replace(/^\s*\d+/, "");
      }
      if (o.origin) el.style.transformOrigin = o.origin;
      items.push(it);
    });
  });

  /* ---------- измерения: считаем по раскладке, а не по getBoundingClientRect,
     поэтому собственные сдвиги элемента не влияют на его же прогресс ---------- */
  function offsetOf(el) {
    var x = 0, y = 0;
    for (var n = el; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
    return { x: x, y: y };
  }

  function measure() {
    vh = window.innerHeight;
    vw = window.innerWidth;
    docH = root.scrollHeight;
    heroH = hero ? hero.offsetHeight : 0;

    var rows = {};
    items.forEach(function (it) {
      var p = offsetOf(it.ref);
      it.top = p.y;
      it.left = p.x;
      it.h = it.ref.offsetHeight;
      it.extra = it.o.delay;
      if (it.o.group) {
        var key = it.o.group + ":" + Math.round(p.y / 8);
        (rows[key] = rows[key] || []).push(it);
      }
    });
    Object.keys(rows).forEach(function (key) {
      rows[key].sort(function (a, b) { return a.left - b.left; });
      rows[key].forEach(function (it, i) { it.extra = it.o.delay + i * it.o.stagger; });
    });
  }

  /* ---------- эффекты ---------- */
  function pose(it, t) {
    var o = it.o, e = it.ease(t), st = it.el.style;
    var k = vw < 768 ? 0.55 : 1; // на телефоне движения мягче
    var y = lerp(o.y[0], o.y[1], e) * k;
    var s = lerp(o.s[0], o.s[1], e);
    var yaw = lerp(o.yaw[0], o.yaw[1], e) * k;
    var op = lerp(o.op[0], o.op[1], clamp(e * o.opk, 0, 1));

    // в покое всё возвращается в none: лишних слоёв и контекстов нет
    st.translate = Math.abs(y) < 0.05 ? "none" : "0 " + y.toFixed(1) + "px";
    st.scale = Math.abs(s - 1) < 0.0005 ? "none" : s.toFixed(4);
    st.rotate = Math.abs(yaw) < 0.05 ? "none" : "0 1 0 " + yaw.toFixed(2) + "deg";
    st.opacity = op >= 0.999 ? "" : op.toFixed(3);
  }

  function words(it, t) {
    var n = it.words.length;
    var pos = t * (n + 1.5);
    for (var i = 0; i < n; i++) {
      var v = 0.45 + 0.55 * clamp(pos - i, 0, 1);
      it.words[i].style.opacity = v >= 0.999 ? "" : v.toFixed(3);
    }
  }

  function count(it, t) {
    it.el.textContent = Math.round(easeOut(t) * it.target) + it.suffix;
  }

  var FX = { pose: pose, words: words, count: count };

  /* ---------- прогресс ---------- */
  function progress(it, y, heroT) {
    var o = it.o, t;
    if (o.range === "hero") {
      t = heroT;
    } else {
      var top = it.top - y;
      if (o.range === "view") {
        t = (vh - top) / (vh + it.h);
      } else {
        t = (vh * o.from - top - it.extra * vh) / (vh * (o.from - o.to));
      }
      t = clamp(t, 0, 1);
    }
    if (o.span) t = clamp((t - o.span[0]) / (o.span[1] - o.span[0]), 0, 1);
    return t;
  }

  var frame = 0;

  function update() {
    frame = 0;
    var y = window.pageYOffset;
    var heroT = heroH ? clamp(y / (heroH * 0.8), 0, 1) : 0;

    if (bar) {
      var max = docH - vh;
      bar.style.transform = "scaleX(" + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ")";
    }

    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var t = progress(it, y, heroT);
      var q = Math.round(t * 500);
      if (q === it.q) continue; // ничего не изменилось: стили не трогаем
      it.q = q;
      FX[it.o.fx](it, t);
    }
  }

  function request() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  function remeasure() {
    measure();
    items.forEach(function (it) { it.q = -1; });
    request();
  }

  var pending = 0;
  function remeasureSoon() {
    if (pending) return;
    pending = window.requestAnimationFrame(function () { pending = 0; remeasure(); });
  }

  /* ---------- запуск ---------- */
  root.classList.add("sa");
  measure();
  update();

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", remeasureSoon);
  window.addEventListener("load", remeasureSoon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasureSoon);
  if ("ResizeObserver" in window) new ResizeObserver(remeasureSoon).observe(document.body);
})();
