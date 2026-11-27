(() => {
  if (location.pathname !== '/index.html') return;

  const report = (details) => window.webkit.messageHandlers.gameStatus.postMessage(details);
  let ready = false;
  let storage = false;
  try {
    if (!localStorage.getItem('hd2d-quality')) localStorage.setItem('hd2d-quality', 'medium');
    storage = localStorage.getItem('hd2d-quality') !== null;
  } catch { /* The game reports storage errors from its own save commands. */ }

  const fail = (detail) => {
    if (!ready) report({ state: 'error', detail: String(detail).slice(0, 400) });
  };
  addEventListener('error', (event) => {
    if (event instanceof ErrorEvent) fail(event.message);
  });
  addEventListener('unhandledrejection', (event) => fail(event.reason));

  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.dataset.iosGame = 'true';
    const css = document.createElement('style');
    css.textContent = `
      #stage, .ctag { touch-action: none; -webkit-user-select: none; user-select: none; }
      .ios-map-controls { position: fixed; left: 12px; bottom: 8px; z-index: 10; display: flex; gap: 4px; }
      .ios-map-controls[hidden] { display: none; }
      .ios-map-controls .btn { min-width: 44px; min-height: 44px; padding: 4px 8px; font-size: 16px; touch-action: manipulation; }
      body[data-map-view="war"] .ios-map-controls { top: 9px; right: 12px; bottom: auto; left: auto; }
      body:has(.sysmenu-list:not([hidden])) .ios-map-controls { visibility: hidden; }
      @media (max-height: 470px) {
        .tt-menu { top: auto !important; bottom: 55px; gap: 5px; }
        .tt-menu .btn { min-height: 40px; padding: 5px 18px; font-size: 18px; }
        .tt-menu .btn small { font-size: 11px; }
        .tt-foot { bottom: 4px; left: 8px; right: 8px; }
        .tt-foot p { margin: 1px 0 0; font-size: 9px; line-height: 1.25; }
        .tt-foot .free, .tt-foot .maker { font-size: 11px; }
        .setup { gap: 6px; padding: 10px 10px 0; }
        .setup h2 { font-size: 23px; letter-spacing: .12em; }
        .setup .levels { width: min(100%, 650px); flex-wrap: nowrap; gap: 6px; }
        .setup .level { flex: 1 1 0; width: auto; min-width: 0; padding: 5px 6px; line-height: 1.2; }
        .setup .level b { font-size: 11px; }
        .setup .lv-name { font-size: 19px; margin: 1px 0; }
        .setup .level small { font-size: 11px; }
        .setup .level .cheat { margin-top: 3px; padding: 2px 3px; font-size: 10px; }
        .setup-opts { width: min(100%, 650px); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
        .setup .opt { margin-top: 0; min-height: 34px; padding: 3px 4px; line-height: 1.2; font-size: 11px; letter-spacing: 0; }
        .setup .cheat i { flex: none; }
        .setup .rulers { grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; }
        .setup .ruler { height: 119px; }
        .setup .ruler img { height: 88px; }
        .setup .ruler .meta { padding: 16px 4px 3px; }
        .setup .ruler b { font-size: 18px; letter-spacing: 1px; }
        .setup .ruler small, .setup .ruler .rstat { font-size: 10px; gap: 3px; }
        .setup-foot { padding: 4px 0 6px; }
        .setup-foot .btn { min-height: 40px; padding: 4px 16px !important; }

        body { --ios-city-width: min(300px, 44vw); }
        .citypanel {
          top: 92px; left: 12px; width: var(--ios-city-width); max-height: calc(100% - 148px);
          overflow: auto; overscroll-behavior: contain; touch-action: pan-y;
        }
        .citypanel > * { flex-shrink: 0; }
        .citypanel header { position: sticky; top: 0; z-index: 1; padding: 5px 9px; background: var(--lacquer); }
        .citypanel header h2 { font-size: 24px; }
        .citypanel .stats { padding: 6px 9px; column-gap: 7px; font-size: 14px; }
        .citypanel .roster { flex: 0 0 auto; overflow: visible; padding: 4px 6px 8px; }
        .citypanel .off { grid-template-columns: 34px minmax(0, 1fr) auto; gap: 5px; min-height: 44px; }
        .citypanel .off img { width: 34px; height: 40px; }
        .citypanel .off .sub { grid-template-columns: repeat(2, max-content); font-size: 12px; }
        body[data-screen="strategy"] .dock {
          left: auto; right: 12px; bottom: 8px; transform: none; width: max-content;
          max-width: calc(100% - var(--ios-city-width) - 32px); gap: 5px;
        }
        body[data-screen="strategy"] .dock .tabs { flex-wrap: wrap; justify-content: center; }
        body[data-screen="strategy"] .dock .btn { min-width: 44px; min-height: 40px; padding: 3px 7px; font-size: 15px; }
        body[data-map-view="war"]:not(.flat2d) .sysbtns { --sys-top: 9px; }
        body[data-map-view="war"]:not(.flat2d) .warbar {
          top: 57px; right: 12px; max-width: none; gap: 3px 8px; padding: 3px 8px;
        }
        body[data-map-view="war"]:not(.flat2d) .warbar .day { font-size: 18px; }
        body[data-map-view="war"]:not(.flat2d) .warbar .side { gap: 4px; font-size: 13px; }
        body[data-map-view="war"]:not(.flat2d) .warbar .side b { font-size: 15px; }

        .tq-formation { padding: 10px 12px; overflow-y: auto; justify-content: safe center; }
        .tq-formation h2 { margin: 5px 0 0; font-size: 38px; }
        .tq-formation .tq-sub { margin: 4px 0 12px; font-size: 14px; }
        .tq-forms { flex: 0 0 auto; width: min(100%, 720px); grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
        .tq-form { padding: 8px 6px; }
        .tq-form-svg svg { height: clamp(52px, 20vh, 92px); }
        .tq-form b { margin-top: 5px; font-size: 24px; }
        .tq-form small { margin-top: 4px; font-size: 12px; line-height: 1.4; }

        .tq-top { top: 6px; left: 8px; right: 8px; gap: 8px; }
        .tq-card, .tq-card.r { gap: 5px; padding: 5px; }
        .tq-card { grid-template-columns: 44px minmax(0, 1fr); }
        .tq-card.r { grid-template-columns: minmax(0, 1fr) 44px; }
        .tq-face { width: 44px; height: 56px; }
        .tq-bar { margin-top: 3px; }
        .tq-round { width: 58px; height: 58px; }
        .tq-round b { font-size: 24px; }
        .tq-console { left: 8px; right: 8px; bottom: 6px; padding: 5px 7px; gap: 4px; }
        .tq-orders { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 8px; }
        .tq-row { grid-template-columns: 40px minmax(0, 1fr); gap: 3px; margin: 0; }
        .tq-seg { gap: 2px; padding: 2px; }
        .tq-cmd { justify-content: center; min-height: 36px; padding: 3px 4px; }
        .tq-side { display: grid; grid-template-columns: minmax(0, 1fr); gap: 4px; }
        .tq-tactics { width: 100%; }
        .tq-tac { min-height: 38px; flex-direction: row; justify-content: center; gap: 4px; padding: 3px; }
        .tq-ctrl { justify-content: center; margin: 0; gap: 4px; }
        .tq-ctrl .tq-btn { min-height: 38px; padding: 3px 7px; }
        .tq-feed { display: none; }
      }
    `;
    document.head.append(css);
    const panel = document.createElement('div');
    panel.className = 'ios-map-controls';
    panel.hidden = true;
    const ui = document.querySelector('#ui');
    const dialogs = document.querySelector('#ui-top');
    const fade = document.querySelector('#fade');
    const currentView = () => {
      if (fade.classList.contains('on') || [...dialogs.children].some((child) => !child.classList.contains('mappick'))) return null;
      return window.__game?.mapInput.view;
    };
    const zooms = (view) => !!view && !(view === window.__game.war && (view.flat || view.viewState?.().tactical));
    const zoom = (delta) => {
      const view = currentView();
      if (zooms(view)) view.zoom(delta, { x: 0, y: 0 });
    };
    const button = (text, label, action) => {
      const item = document.createElement('button');
      item.className = 'btn';
      item.type = 'button';
      item.textContent = text;
      item.setAttribute('aria-label', label);
      item.addEventListener('click', action);
      return item;
    };
    const out = button('−', '缩小地图', () => zoom(120));
    const into = button('＋', '放大地图', () => zoom(-120));
    const back = button('返回', '取消或返回', () => {
      if (currentView()) window.__game.mapInput.cancel();
    });
    panel.append(out, into, back);
    document.body.append(panel);

    // Own touch pointers on the map. The desktop pointer handlers still handle mouse and pen.
    let gesture = null;
    const canvas = () => document.querySelector('#stage canvas');
    const point = (event) => ({ x: event.clientX, y: event.clientY });
    const mapPoint = ({ x, y }, surface) => {
      const bounds = surface.getBoundingClientRect();
      return { x: (x - bounds.left) / bounds.width * 2 - 1, y: 1 - (y - bounds.top) / bounds.height * 2 };
    };
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const consume = (event) => { event.preventDefault(); event.stopPropagation(); };
    const alive = () => gesture && !gesture.cancelled && gesture.view === currentView();

    addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch') return;
      const surface = canvas();
      const label = event.target.closest('.ctag');
      if (!gesture) {
        const view = currentView();
        if (!event.isPrimary || !view || !surface || !(event.target === surface || label)) return;
        gesture = { view, surface, label, start: point(event), pointers: new Map(), moved: false, multi: false, span: 0, cancelled: false };
        document.querySelector('#tip').hidden = true;
      }
      consume(event);
      gesture.pointers.set(event.pointerId, point(event));
      if (gesture.pointers.size >= 2) {
        gesture.multi = true;
        gesture.span = gesture.pointers.size === 2 ? distance(...gesture.pointers.values()) : 0;
      }
      try { gesture.surface.setPointerCapture(event.pointerId); } catch { /* The pointer can end before capture. */ }
    }, true);

    addEventListener('pointermove', (event) => {
      if (!gesture?.pointers.has(event.pointerId)) return;
      consume(event);
      if (!alive()) { gesture.cancelled = true; return; }
      const current = point(event);
      const previous = gesture.pointers.get(event.pointerId);
      gesture.pointers.set(event.pointerId, current);
      const { view, pointers, multi, span, surface } = gesture;
      if (multi) {
        if (pointers.size !== 2 || !zooms(view)) return;
        const [a, b] = pointers.values();
        const length = distance(a, b);
        if (!span || length < 12) { gesture.span = length; return; }
        const change = Math.log(length / span);
        const stepped = view === window.__game.war;
        if (stepped ? Math.abs(change) < 0.12 : Math.abs(length - span) < 3) return;
        gesture.span = length;
        const center = mapPoint({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, surface);
        view.zoom(stepped ? -Math.sign(change) * 120 : -change * 1000, center);
        return;
      }
      if (!gesture.moved && distance(gesture.start, current) < 8) return;
      const from = gesture.moved ? previous : gesture.start;
      gesture.moved = true;
      const dx = current.x - from.x, dy = current.y - from.y;
      if (view.slide) view.slide(dx, dy);
      else view.orbit?.(dx, dy);
    }, true);

    const end = (event) => {
      if (!gesture?.pointers.has(event.pointerId)) return;
      consume(event);
      const current = point(event);
      const { moved, multi, start, label, surface, view, pointers } = gesture;
      const tap = event.type === 'pointerup' && alive() && !multi && !moved && distance(start, current) < 8;
      if (event.type !== 'pointerup') gesture.cancelled = true;
      pointers.delete(event.pointerId);
      if (pointers.size < 2) gesture.span = 0;
      if (pointers.size === 0) gesture = null;
      if (!tap) return;
      const hit = document.elementFromPoint(current.x, current.y);
      if (label && label === hit?.closest('.ctag')) label.click();
      else if (hit === surface) view.click(mapPoint(current, surface));
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) addEventListener(type, end, true);
    addEventListener('blur', () => { gesture = null; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) gesture = null; });

    const update = () => {
      const view = currentView();
      if (gesture && !alive()) gesture.cancelled = true;
      out.hidden = into.hidden = !zooms(view);
      back.hidden = !view || !window.__game.mapInput.canCancel;
      panel.hidden = out.hidden && back.hidden;
    };
    const reportReady = () => {
      const screen = document.body.dataset.screen;
      if (ready) report({ state: 'ready', screen, storage, width: innerWidth, height: innerHeight });
    };
    const observer = new MutationObserver(update);
    for (const layer of [ui, dialogs]) observer.observe(layer, { childList: true });
    observer.observe(fade, { attributes: true, attributeFilter: ['class'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-screen', 'data-map-view', 'class'] });
    new MutationObserver(reportReady).observe(document.body, { attributes: true, attributeFilter: ['data-screen'] });
    const timer = setInterval(() => {
      if (!window.__game || !document.querySelector('#stage canvas')) return;
      clearInterval(timer);
      ready = true;
      update();
      reportReady();
    }, 200);
  });
})();
