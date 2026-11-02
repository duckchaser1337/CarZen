/*
 * CarZen · runtime local dos artboards .dc.html
 *
 * No canvas de Design do Claude, cada artboard carrega o support.js do próprio canvas.
 * Este arquivo faz o mesmo papel fora dele, para rodar os protótipos no navegador:
 * lê o <x-dc>, move o <helmet> para o <head>, compila o template ({{ }}, <sc-if>, <sc-for>)
 * e renderiza com React 18 a classe `Component extends DCLogic` do <script data-dc-script>.
 *
 * React vem de node_modules (depois de `npm install`); se não houver, vem do CDN.
 * Parâmetros da URL viram props: ?veiculosIniciais=1%20veículo
 */
(function () {
  'use strict';

  var embedded = window.self !== window.top;
  var scriptSrc = (document.currentScript && document.currentScript.src) || location.href;

  // Os artboards não trazem meta viewport (o canvas cuida disso); sem ela o celular renderiza em 980px.
  if (!document.querySelector('meta[name="viewport"]')) {
    var vp = document.createElement('meta');
    vp.name = 'viewport';
    vp.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
    document.head.appendChild(vp);
  }

  // Esconde o template cru até o React assumir.
  var hide = document.createElement('style');
  hide.textContent = 'x-dc{display:none!important}';
  document.head.appendChild(hide);

  function loadScript(urls) {
    return new Promise(function (resolve, reject) {
      var i = 0;
      (function next() {
        if (i >= urls.length) return reject(new Error('Não foi possível carregar: ' + urls.join(' | ')));
        var s = document.createElement('script');
        s.src = urls[i++];
        s.onload = resolve;
        s.onerror = function () { s.remove(); next(); };
        document.head.appendChild(s);
      })();
    });
  }
  function local(p) { return new URL('../node_modules/' + p, scriptSrc).href; }
  function cdn(p) { return 'https://cdn.jsdelivr.net/npm/' + p; }

  var reactReady = loadScript([local('react/umd/react.production.min.js'), cdn('react@18.3.1/umd/react.production.min.js')])
    .then(function () {
      return loadScript([local('react-dom/umd/react-dom.production.min.js'), cdn('react-dom@18.3.1/umd/react-dom.production.min.js')]);
    });
  var domReady = new Promise(function (resolve) {
    if (document.readyState !== 'loading') resolve();
    else document.addEventListener('DOMContentLoaded', resolve);
  });

  Promise.all([reactReady, domReady]).then(boot).catch(showError);

  // ---------- Template ----------
  var HOLE_ONLY = /^\s*\{\{\s*([^{}]+?)\s*\}\}\s*$/;
  var HOLE = /\{\{\s*([^{}]+?)\s*\}\}/g;
  var EVENTS = {
    onclick: 'onClick', onchange: 'onChange', oninput: 'onInput', onkeydown: 'onKeyDown', onkeyup: 'onKeyUp',
    onkeypress: 'onKeyPress', onsubmit: 'onSubmit', onfocus: 'onFocus', onblur: 'onBlur',
    onmouseenter: 'onMouseEnter', onmouseleave: 'onMouseLeave', onmousedown: 'onMouseDown', onmouseup: 'onMouseUp',
    onpointerdown: 'onPointerDown', onpointerup: 'onPointerUp', onpointermove: 'onPointerMove',
    onscroll: 'onScroll', ondblclick: 'onDoubleClick', ondoubleclick: 'onDoubleClick',
    ontouchstart: 'onTouchStart', ontouchend: 'onTouchEnd', onwheel: 'onWheel'
  };
  var RENAME = {
    'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength',
    autocomplete: 'autoComplete', inputmode: 'inputMode', autofocus: 'autoFocus', spellcheck: 'spellCheck',
    enterkeyhint: 'enterKeyHint', colspan: 'colSpan', rowspan: 'rowSpan'
  };

  function compile(node) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      if (!t.trim() && t.indexOf('\n') >= 0) return null; // indentação entre tags
      return { k: 't', v: t, dyn: t.indexOf('{{') >= 0 };
    }
    if (node.nodeType !== 1) return null;
    var tag = node.localName;
    if (tag === 'helmet' || tag === 'script') return null;
    var kids = compileKids(node);
    if (tag === 'sc-if') return { k: 'if', v: node.getAttribute('value') || '', c: kids };
    if (tag === 'sc-for') return { k: 'for', list: node.getAttribute('list') || '', as: node.getAttribute('as') || 'item', c: kids };
    var attrs = [];
    for (var i = 0; i < node.attributes.length; i++) {
      var a = node.attributes[i];
      if (a.name.indexOf('hint-') === 0) continue;
      attrs.push({ n: a.name, v: a.value });
    }
    return { k: 'e', tag: tag, a: attrs, c: kids };
  }
  function compileKids(node) {
    var out = [];
    for (var i = 0; i < node.childNodes.length; i++) {
      var c = compile(node.childNodes[i]);
      if (c) out.push(c);
    }
    return out;
  }

  function lookup(expr, scopes) {
    expr = expr.trim();
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    var q = expr.match(/^(['"])(.*)\1$/);
    if (q) return q[2];
    var parts = expr.split('.');
    var cur, found = false;
    for (var i = scopes.length - 1; i >= 0; i--) {
      var s = scopes[i];
      if (s !== null && typeof s === 'object' && parts[0] in s) { cur = s[parts[0]]; found = true; break; }
    }
    if (!found) return undefined;
    for (var j = 1; j < parts.length; j++) {
      if (cur == null) return undefined;
      cur = cur[parts[j]];
    }
    return cur;
  }
  function str(v) { return v == null ? '' : String(v); }
  function interp(text, scopes) { return text.replace(HOLE, function (_, e) { return str(lookup(e, scopes)); }); }
  function resolve(raw, scopes) {
    var m = raw.match(HOLE_ONLY);
    if (m) return lookup(m[1], scopes);
    return raw.indexOf('{{') >= 0 ? interp(raw, scopes) : raw;
  }
  function styleObj(css) {
    var out = {};
    String(css).split(';').forEach(function (decl) {
      var i = decl.indexOf(':');
      if (i < 0) return;
      var prop = decl.slice(0, i).trim(), val = decl.slice(i + 1).trim();
      if (!prop || val === '') return;
      if (prop.indexOf('--') !== 0) {
        prop = prop.toLowerCase().replace(/^-ms-/, 'ms-').replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
      }
      out[prop] = val;
    });
    return out;
  }

  function makeRenderer(h, Fragment) {
    function element(n, scopes, key) {
      var props = { key: key };
      for (var i = 0; i < n.a.length; i++) {
        var a = n.a[i], low = a.n.toLowerCase();
        var v = resolve(a.v, scopes);
        if (low.length > 2 && low.indexOf('on') === 0) {
          if (typeof v === 'function') props[EVENTS[low] || ('on' + low.charAt(2).toUpperCase() + low.slice(3))] = v;
          continue;
        }
        if (low === 'style') { props.style = typeof v === 'string' ? styleObj(v) : v; continue; }
        if (low === 'ref') { if (v && (typeof v === 'function' || typeof v === 'object')) props.ref = v; continue; }
        props[RENAME[low] || a.n] = v;
      }
      if ((n.tag === 'input' || n.tag === 'textarea') && 'value' in props && props.value == null) props.value = '';
      var kids = renderNodes(n.c, scopes, key + '/');
      return kids.length ? h(n.tag, props, kids) : h(n.tag, props);
    }
    function renderNodes(nodes, scopes, prefix) {
      var out = [];
      nodes.forEach(function (n, i) {
        var key = prefix + i;
        if (n.k === 't') { out.push(n.dyn ? interp(n.v, scopes) : n.v); return; }
        if (n.k === 'if') {
          if (resolve(n.v, scopes)) out.push(h(Fragment, { key: key }, renderNodes(n.c, scopes, key + '.')));
          return;
        }
        if (n.k === 'for') {
          var list = resolve(n.list, scopes);
          if (!Array.isArray(list)) return;
          list.forEach(function (item, idx) {
            var sc = { $index: idx };
            sc[n.as] = item;
            var id = item !== null && typeof item === 'object' ? (item.id != null ? item.id : item.key) : null;
            out.push(h(Fragment, { key: key + ':' + (id != null ? id : idx) }, renderNodes(n.c, scopes.concat([sc]), key + '.')));
          });
          return;
        }
        out.push(element(n, scopes, key));
      });
      return out;
    }
    return renderNodes;
  }

  // ---------- Montagem ----------
  function boot() {
    var React = window.React, ReactDOM = window.ReactDOM, h = React.createElement;
    var xdc = document.querySelector('x-dc');
    if (!xdc) throw new Error('Nenhum <x-dc> encontrado nesta página.');

    var helmet = xdc.querySelector('helmet');
    if (helmet) Array.prototype.slice.call(helmet.children).forEach(function (el) { document.head.appendChild(el); });

    var template = compileKids(xdc);
    var scriptEl = document.querySelector('script[data-dc-script]');
    var src = scriptEl ? scriptEl.textContent : 'class Component extends DCLogic { renderVals() { return {}; } }';
    var meta = {};
    try { meta = JSON.parse((scriptEl && scriptEl.getAttribute('data-props')) || '{}'); } catch (e) { console.warn('data-props inválido', e); }
    var size = meta.$preview || { width: 390, height: 844 };

    var props = {};
    Object.keys(meta).forEach(function (k) {
      if (k.charAt(0) !== '$' && meta[k] && typeof meta[k] === 'object' && 'default' in meta[k]) props[k] = meta[k].default;
    });
    new URLSearchParams(location.search).forEach(function (v, k) { props[k] = v; });

    var renderNodes = makeRenderer(h, React.Fragment);
    class DCLogic extends React.Component {
      render() {
        var vals = typeof this.renderVals === 'function' ? this.renderVals() : {};
        var out = renderNodes(template, [vals], 'r');
        return out.length === 1 ? out[0] : h(React.Fragment, null, out);
      }
    }
    var Component = new Function('DCLogic', 'React', src + '\n;return typeof Component !== "undefined" ? Component : null;')(DCLogic, React);
    if (!Component) throw new Error('O script do artboard não define "class Component extends DCLogic".');

    class Boundary extends React.Component {
      constructor(p) { super(p); this.state = { err: null }; }
      static getDerivedStateFromError(err) { return { err: err }; }
      componentDidCatch(err) { console.error(err); }
      render() {
        if (!this.state.err) return this.props.children;
        return h('pre', { style: { margin: 0, padding: 20, font: '12px/1.5 ui-monospace, monospace', color: '#B4400C', whiteSpace: 'pre-wrap' } },
          'Erro ao renderizar o protótipo:\n\n' + String((this.state.err && this.state.err.stack) || this.state.err));
      }
    }

    xdc.remove();
    var page = document.createElement('style');
    page.textContent = [
      'html,body{height:100%}',
      'body{margin:0;background:#DCDFE4;display:flex;align-items:center;justify-content:center;overflow:hidden}',
      '#carzen-frame{flex:none;width:' + size.width + 'px;height:' + size.height + 'px;border-radius:38px;overflow:hidden;box-shadow:0 0 0 10px #15171C,0 30px 80px -20px rgba(0,0,0,.45);transform-origin:center center}',
      'body.cz-embed{background:transparent;display:block}',
      'body.cz-embed #carzen-frame,body.cz-phone #carzen-frame{border-radius:0;box-shadow:none}',
      'body.cz-phone{align-items:flex-start;overflow:auto}',
      'body.cz-phone #carzen-frame{transform-origin:top center}',
      '.cz-back{position:fixed;top:16px;left:16px;z-index:5;font:600 13px/1 system-ui,sans-serif;color:#2B2F38;text-decoration:none;background:#fff;padding:10px 14px;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.12)}',
      '.cz-back:hover{background:#F3F4F6}',
      'body.cz-phone .cz-back{display:none}'
    ].join('\n');
    document.head.appendChild(page);

    var frame = document.createElement('div');
    frame.id = 'carzen-frame';
    document.body.appendChild(frame);
    if (embedded) document.body.classList.add('cz-embed');
    else {
      var back = document.createElement('a');
      back.href = './';
      back.className = 'cz-back';
      back.textContent = '← Todos os estilos';
      document.body.appendChild(back);
    }

    function fit() {
      var w = window.innerWidth, ht = window.innerHeight, s;
      var phone = !embedded && w < 520;
      document.body.classList.toggle('cz-phone', phone);
      if (embedded) s = Math.min(w / size.width, ht / size.height);
      else if (phone) s = w / size.width;
      else s = Math.min(1, (ht - 64) / size.height, (w - 64) / size.width);
      frame.style.transform = s === 1 ? '' : 'scale(' + s + ')';
    }
    fit();
    window.addEventListener('resize', fit);

    ReactDOM.createRoot(frame).render(h(Boundary, null, h(Component, props)));
  }

  function showError(err) {
    console.error(err);
    var box = document.createElement('pre');
    box.style.cssText = 'margin:24px;padding:16px;border-radius:12px;background:#FCEEE5;color:#B4400C;font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap';
    box.textContent = 'Não foi possível iniciar o protótipo.\n\n' + String((err && err.message) || err) +
      '\n\nRode `npm install` na raiz do projeto e abra pelo servidor local (`npm start`).';
    (document.body || document.documentElement).appendChild(box);
  }
})();
