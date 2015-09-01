/*! Licensed under MIT, https://github.com/sofish/pen */
(function(root, doc) {

  var Pen, debugMode, selection, utils = {};
  var toString = Object.prototype.toString;
  var slice = Array.prototype.slice;

  // allow command list
  var commandsReg = {
    block: /^(?:p|h[1-6]|blockquote|pre)$/,
    inline: /^(?:bold|italic|underline|insertorderedlist|insertunorderedlist|indent|outdent)$/,
    source: /^(?:createlink|unlink)$/,
    insert: /^(?:inserthorizontalrule|insertimage|insert)$/,
    wrap: /^(?:code)$/
  };

  var lineBreakReg = /^(?:blockquote|pre|div)$/i;

  var effectNodeReg = /(?:[pubia]|h[1-6]|blockquote|[uo]l|li)/i;

  var strReg = {
    whiteSpace: /(^\s+)|(\s+$)/g,
    mailTo: /^(?!mailto:|.+\/|.+#|.+\?)(.*@.*\..+)$/,
    http: /^(?!\w+?:\/\/|mailto:|\/|\.\/|\?|#)(.*)$/
  };

  var autoLinkReg = {
    url: /((https?|ftp):\/\/|www\.)[^\s<]{3,}/gi,
    prefix: /^(?:https?|ftp):\/\//i,
    notLink: /^(?:img|a|input|audio|video|source|code|pre|script|head|title|style)$/i,
    maxLength: 100
  };

  // type detect
  utils.is = function(obj, type) {
    return toString.call(obj).slice(8, -1) === type;
  };

  utils.forEach = function(obj, iterator, arrayLike) {
    if (!obj) return;
    if (arrayLike == null) arrayLike = utils.is(obj, 'Array');
    if (arrayLike) {
      for (var i = 0, l = obj.length; i < l; i++) iterator(obj[i], i, obj);
    } else {
      for (var key in obj) {
        if (obj.hasOwnProperty(key)) iterator(obj[key], key, obj);
      }
    }
  };

  // copy props from a obj
  utils.copy = function(defaults, source) {
    utils.forEach(source, function (value, key) {
      defaults[key] = utils.is(value, 'Object') ? utils.copy({}, value) :
        utils.is(value, 'Array') ? utils.copy([], value) : value;
    });
    return defaults;
  };

  // log
  utils.log = function(message, force) {
    if (debugMode || force)
      console.log('%cPEN DEBUGGER: %c' + message, 'font-family:arial,sans-serif;color:#1abf89;line-height:2em;', 'font-family:cursor,monospace;color:#333;');
  };

  utils.delayExec = function (fn) {
    var timer = null;
    return function (delay) {
      clearTimeout(timer);
      timer = setTimeout(function() {
        fn();
      }, delay || 1);
    };
  };

  // merge: make it easy to have a fallback
  utils.merge = function(config) {

    // default settings
    var defaults = {
      class: 'pen',
      debug: false,
      toolbar: null, // custom toolbar
      stay: config.stay || !config.debug,
      stayMsg: 'Are you going to leave here?',
      textarea: '<textarea name="content"></textarea>',
      list: [
        'blockquote', 'h2', 'h3', 'p', 'code', 'insertorderedlist', 'insertunorderedlist', 'inserthorizontalrule',
        'indent', 'outdent', 'bold', 'italic', 'underline', 'createlink', 'insertimage'
      ],
      cleanAttrs: ['id', 'class', 'style', 'name'],
      cleanTags: ['script']
    };

    // user-friendly config
    if (config.nodeType === 1) {
      defaults.editor = config;
    } else if (config.match && config.match(/^#[\S]+$/)) {
      defaults.editor = doc.getElementById(config.slice(1));
    } else {
      defaults = utils.copy(defaults, config);
    }

    return defaults;
  };

  function commandOverall(ctx, cmd, val) {
    var message = ' to exec 「' + cmd + '」 command' + (val ? (' with value: ' + val) : '');

    try {
      doc.execCommand(cmd, false, val);
    } catch(err) {
      // TODO: there's an error when insert a image to document, bug not a bug
      return utils.log('fail' + message, true);
    }

    utils.log('success' + message);
  }

  function commandInsert(ctx, name, val) {
    var node = getNode(ctx);
    if (!node) return;
    ctx._range.selectNode(node);
    ctx._range.collapse(false);

    // hide menu when a image was inserted
    if(name === 'insertimage' && ctx._menu) toggleNode(ctx._menu, true);

    return commandOverall(ctx, name, val);
  }

  function commandBlock(ctx, name) {
    var list = effectNode(ctx, getNode(ctx), true);
    if (list.indexOf(name) !== -1) name = 'p';
    return commandOverall(ctx, 'formatblock', name);
  }

  function commandWrap(ctx, tag, value) {
    value = '<' + tag + '>' + (value||selection.toString()) + '</' + tag + '>';
    return commandOverall(ctx, 'insertHTML', value);
  }

  function initToolbar(ctx) {
    var icons = '', inputStr = '<input class="pen-input" placeholder="http://" />';

    ctx._toolbar = ctx.config.toolbar;
    if (!ctx._toolbar) {
      var toolList = ctx.config.list;
      utils.forEach(toolList, function (listname) {
        var parts = listname.split('|'),
            name = parts[0] || listname,
            tooltip = parts[1] || '';
        var klass = 'pen-icon icon-' + name;
        icons += '<i class="' + klass + '" data-action="' + name + '" title="' + tooltip + '"></i>';
      }, true);
      if (toolList.indexOf('createlink') >= 0 || toolList.indexOf('createlink') >= 0)
        icons += inputStr;
    } else if (ctx._toolbar.querySelectorAll('[data-action=createlink]').length ||
      ctx._toolbar.querySelectorAll('[data-action=insertimage]').length) {
      icons += inputStr;
    }

    if (icons) {
      ctx._menu = doc.createElement('div');
      ctx._menu.setAttribute('class', ctx.config.class + '-menu pen-menu');
      ctx._menu.innerHTML = icons;
      ctx._inputBar = ctx._menu.querySelector('input');
      toggleNode(ctx._menu, true);
      doc.body.appendChild(ctx._menu);
    }
    if (ctx._toolbar && ctx._inputBar) toggleNode(ctx._inputBar);
  }

  function initEvents(ctx) {
    var toolbar = ctx._toolbar || ctx._menu, editor = ctx.config.editor;

    var toggleMenu = utils.delayExec(function() {
      ctx.highlight().menu();
    });
    var outsideClick = function() {};

    function updateStatus(delay) {
      ctx._range = ctx.getRange();
      toggleMenu(delay);
    }

    if (ctx._menu) {
      var setpos = function() {
        if (ctx._menu.style.display === 'block') ctx.menu();
      };

      // change menu offset when window resize / scroll
      addListener(ctx, root, 'resize', setpos);
      addListener(ctx, root, 'scroll', setpos);

      // toggle toolbar on mouse select
      var selecting = false;
      addListener(ctx, editor, 'mousedown', function() {
        selecting = true;
      });
      addListener(ctx, editor, 'mouseleave', function() {
        if (selecting) updateStatus(800);
        selecting = false;
      });
      addListener(ctx, editor, 'mouseup', function() {
        if (selecting) updateStatus(100);
        selecting = false;
      });
      // Hide menu when focusing outside of editor
      outsideClick = function(e) {
        if (ctx._menu && !containsNode(editor, e.target) && !containsNode(ctx._menu, e.target)) {
          removeListener(ctx, doc, 'click', outsideClick);
          toggleMenu(100);
        }
      };
    } else {
      addListener(ctx, editor, 'click', function() {
        updateStatus(0);
      });
    }

    addListener(ctx, editor, 'keyup', function(e) {
      if (e.which === 8 && ctx.isEmpty()) return lineBreak(ctx, true);
      // toggle toolbar on key select
      if (e.which !== 13 || e.shiftKey) return updateStatus(400);
      var node = getNode(ctx, true);
      if (!node || !node.nextSibling || !lineBreakReg.test(node.nodeName)) return;
      if (node.nodeName !== node.nextSibling.nodeName) return;
      // hack for webkit, make 'enter' behavior like as firefox.
      if (node.lastChild.nodeName !== 'BR') node.appendChild(doc.createElement('br'));
      utils.forEach(node.nextSibling.childNodes, function(child) {
        if (child) node.appendChild(child);
      }, true);
      node.parentNode.removeChild(node.nextSibling);
      focusNode(ctx, node.lastChild, ctx.getRange());
    });

    // check line break
    addListener(ctx, editor, 'keydown', function(e) {
      editor.classList.remove('pen-placeholder');
      if (e.which !== 13 || e.shiftKey) return;
      var node = getNode(ctx, true);
      if (!node || !lineBreakReg.test(node.nodeName)) return;
      var lastChild = node.lastChild;
      if (!lastChild || !lastChild.previousSibling) return;
      if (lastChild.previousSibling.textContent || lastChild.textContent) return;
      // quit block mode for 2 'enter'
      e.preventDefault();
      var p = doc.createElement('p');
      p.innerHTML = '<br>';
      node.removeChild(lastChild);
      if (!node.nextSibling) node.parentNode.appendChild(p);
      else node.parentNode.insertBefore(p, node.nextSibling);
      focusNode(ctx, p, ctx.getRange());
    });

    var menuApply = function(action, value) {
      ctx.execCommand(action, value);
      ctx._range = ctx.getRange();
      ctx.highlight().menu();
    };

    // toggle toolbar on key select
    addListener(ctx, toolbar, 'click', function(e) {
      var node = e.target, action;

      while (node !== toolbar && !(action = node.getAttribute('data-action'))) {
        node = node.parentNode;
      }

      if (!action) return;
      if (!/(?:createlink)|(?:insertimage)/.test(action)) return menuApply(action);
      if (!ctx._inputBar) return;

      // create link
      var input = ctx._inputBar;
      if (toolbar === ctx._menu) toggleNode(input);
      else {
        ctx._inputActive = true;
        ctx.menu();
      }
      if (ctx._menu.style.display === 'none') return;

      setTimeout(function() { input.focus(); }, 400);
      var createlink = function() {
        var inputValue = input.value;

        if (!inputValue) action = 'unlink';
        else {
          inputValue = input.value
            .replace(strReg.whiteSpace, '')
            .replace(strReg.mailTo, 'mailto:$1')
            .replace(strReg.http, 'http://$1');
        }
        menuApply(action, inputValue);
        if (toolbar === ctx._menu) toggleNode(input, false);
        else toggleNode(ctx._menu, true);
      };

      input.onkeypress = function(e) {
        if (e.which === 13) return createlink();
      };

    });

    // listen for placeholder
    addListener(ctx, editor, 'focus', function() {
      if (ctx.isEmpty()) lineBreak(ctx, true);
      addListener(ctx, doc, 'click', outsideClick);
    });

    addListener(ctx, editor, 'blur', function() {
      checkPlaceholder(ctx);
      ctx.checkContentChange();
    });

    // listen for paste and clear style
    addListener(ctx, editor, 'paste', function() {
      setTimeout(function() {
        ctx.cleanContent();
      });
    });
  }

  function addListener(ctx, target, type, listener) {
    if (ctx._events.hasOwnProperty(type)) {
      ctx._events[type].push(listener);
    } else {
      ctx._eventTargets = ctx._eventTargets || [];
      ctx._eventsCache = ctx._eventsCache || [];
      var index = ctx._eventTargets.indexOf(target);
      if (index < 0) index = ctx._eventTargets.push(target) - 1;
      ctx._eventsCache[index] = ctx._eventsCache[index] || {};
      ctx._eventsCache[index][type] = ctx._eventsCache[index][type] || [];
      ctx._eventsCache[index][type].push(listener);

      target.addEventListener(type, listener, false);
    }
    return ctx;
  }

  // trigger local events
  function triggerListener(ctx, type) {
    if (!ctx._events.hasOwnProperty(type)) return;
    var args = slice.call(arguments, 2);
    utils.forEach(ctx._events[type], function (listener) {
      listener.apply(ctx, args);
    });
  }

  function removeListener(ctx, target, type, listener) {
    var events = ctx._events[type];
    if (!events) {
      var _index = ctx._eventTargets.indexOf(target);
      if (_index >= 0) events = ctx._eventsCache[_index][type];
    }
    if (!events) return ctx;
    var index = events.indexOf(listener);
    if (index >= 0) events.splice(index, 1);
    target.removeEventListener(type, listener, false);
    return ctx;
  }

  function removeAllListeners(ctx) {
    utils.forEach(this._events, function (events) {
      events.length = 0;
    }, false);
    if (!ctx._eventsCache) return ctx;
    utils.forEach(ctx._eventsCache, function (events, index) {
      var target = ctx._eventTargets[index];
      utils.forEach(events, function (listeners, type) {
        utils.forEach(listeners, function (listener) {
          target.removeEventListener(type, listener, false);
        }, true);
      }, false);
    }, true);
    ctx._eventTargets = [];
    ctx._eventsCache = [];
    return ctx;
  }

  function checkPlaceholder(ctx) {
    ctx.config.editor.classList[ctx.isEmpty() ? 'add' : 'remove']('pen-placeholder');
  }

  function trim(str) {
    return (str || '').replace(/^\s+|\s+$/g, '');
  }

  // node.contains is not implemented in IE10/IE11
  function containsNode(parent, child) {
    if (parent === child) return true;
    child = child.parentNode;
    while (child) {
      if (child === parent) return true;
      child = child.parentNode;
    }
    return false;
  }

  function getNode(ctx, byRoot) {
    var node, root = ctx.config.editor;
    ctx._range = ctx._range || ctx.getRange();
    node = ctx._range.commonAncestorContainer;
    if (!node || node === root) return null;
    while (node && (node.nodeType !== 1) && (node.parentNode !== root)) node = node.parentNode;
    while (node && byRoot && (node.parentNode !== root)) node = node.parentNode;
    return containsNode(root, node) ? node : null;
  }

  // node effects
  function effectNode(ctx, el, returnAsNodeName) {
    var nodes = [];
    el = el || ctx.config.editor;
    while (el && el !== ctx.config.editor) {
      if (el.nodeName.match(effectNodeReg)) {
        nodes.push(returnAsNodeName ? el.nodeName.toLowerCase() : el);
      }
      el = el.parentNode;
    }
    return nodes;
  }

  // breakout from node
  function lineBreak(ctx, empty) {
    var range = ctx._range = ctx.getRange(), node = doc.createElement('p');
    if (empty) ctx.config.editor.innerHTML = '';
    node.innerHTML = '<br>';
    range.insertNode(node);
    focusNode(ctx, node.childNodes[0], range);
  }

  function focusNode(ctx, node, range) {
    range.setStartAfter(node);
    range.setEndBefore(node);
    range.collapse(false);
    ctx.setRange(range);
  }

  function autoLink(node) {
    if (node.nodeType === 1) {
      if (autoLinkReg.notLink.test(node.tagName)) return;
      utils.forEach(node.childNodes, function (child) {
        autoLink(child);
      }, true);
    } else if (node.nodeType === 3) {
      var result = urlToLink(node.nodeValue || '');
      if (!result.links) return;
      var frag = doc.createDocumentFragment(),
        div = doc.createElement('div');
      div.innerHTML = result.text;
      while (div.childNodes.length) frag.appendChild(div.childNodes[0]);
      node.parentNode.replaceChild(frag, node);
    }
  }

  function urlToLink(str) {
    var count = 0;
    str = str.replace(autoLinkReg.url, function(url) {
      var realUrl = url, displayUrl = url;
      count++;
      if (url.length > autoLinkReg.maxLength) displayUrl = url.slice(0, autoLinkReg.maxLength) + '...';
      // Add http prefix if necessary
      if (!autoLinkReg.prefix.test(realUrl)) realUrl = 'http://' + realUrl;
      return '<a href="' + realUrl + '">' + displayUrl + '</a>';
    });
    return {links: count, text: str};
  }

  function toggleNode(node, hide) {
    node.style.display = hide ? 'none' : 'block';
  }

  Pen = function(config) {

    if (!config) throw new Error('Can\'t find config');

    debugMode = config.debug;

    // merge user config
    var defaults = utils.merge(config);

    var editor = defaults.editor;

    if (!editor || editor.nodeType !== 1) throw new Error('Can\'t find editor');

    // set default class
    editor.classList.add(defaults.class);

    // set contenteditable
    editor.setAttribute('contenteditable', 'true');

    // assign config
    this.config = defaults;

    // set placeholder
    if (defaults.placeholder) editor.setAttribute('data-placeholder', defaults.placeholder);
    checkPlaceholder(this);

    // save the selection obj
    this.selection = selection;

    // define local events
    this._events = {change: []};

    // enable toolbar
    initToolbar(this);

    // init events
    initEvents(this);

    // to check content change
    this._prevContent = this.getContent();

    // enable markdown covert
    if (this.markdown) this.markdown.init(this);

    // stay on the page
    if (this.config.stay) this.stay(this.config);

  };

  Pen.prototype.on = function(type, listener) {
    addListener(this, this.config.editor, type, listener);
    return this;
  };

  Pen.prototype.isEmpty = function(node) {
    node = node || this.config.editor;
    return !(node.querySelector('img')) && !(node.querySelector('blockquote')) &&
      !(node.querySelector('li')) && !trim(node.textContent);
  };

  Pen.prototype.getContent = function() {
    return this.isEmpty() ?  '' : trim(this.config.editor.innerHTML);
  };

  Pen.prototype.setContent = function(html) {
    this.config.editor.innerHTML = html;
    this.cleanContent();
    return this;
  };

  Pen.prototype.checkContentChange = function () {
    var prevContent = this._prevContent, currentContent = this.getContent();
    if (prevContent === currentContent) return;
    this._prevContent = currentContent;
    triggerListener(this, 'change', currentContent, prevContent);
  };

  Pen.prototype.getRange = function() {
    var editor = this.config.editor, range = selection.rangeCount && selection.getRangeAt(0);
    if (!range) range = doc.createRange();
    if (!containsNode(editor, range.commonAncestorContainer)) {
      range.selectNodeContents(editor);
      range.collapse(false);
    }
    return range;
  };

  Pen.prototype.setRange = function(range) {
    range = range || this._range;
    if (!range) {
      range = this.getRange();
      range.collapse(false); // set to end
    }
    try {
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (e) {/* IE throws error sometimes*/}
    return this;
  };

  Pen.prototype.focus = function(focusStart) {
    if (!focusStart) this.setRange();
    this.config.editor.focus();
    return this;
  };

  Pen.prototype.execCommand = function(name, value) {
    name = name.toLowerCase();
    this.setRange();

    if (commandsReg.block.test(name)) {
      commandBlock(this, name);
    } else if (commandsReg.inline.test(name) || commandsReg.source.test(name)) {
      commandOverall(this, name, value);
    } else if (commandsReg.insert.test(name)) {
      commandInsert(this, name, value);
    } else if (commandsReg.wrap.test(name)) {
      commandWrap(this, name, value);
    } else {
      utils.log('can not find command function for name: ' + name + (value ? (', value: ' + value) : ''), true);
    }
    if (name === 'indent') this.checkContentChange();
    else this.cleanContent({cleanAttrs: ['style']});
  };

  // remove attrs and tags
  // pen.cleanContent({cleanAttrs: ['style'], cleanTags: ['id']})
  Pen.prototype.cleanContent = function(options) {
    var editor = this.config.editor;

    if (!options) options = this.config;
    utils.forEach(options.cleanAttrs, function (attr) {
      utils.forEach(editor.querySelectorAll('[' + attr + ']'), function(item) {
        item.removeAttribute(attr);
      }, true);
    }, true);
    utils.forEach(options.cleanTags, function (tag) {
      utils.forEach(editor.querySelectorAll(tag), function(item) {
        item.parentNode.removeChild(item);
      }, true);
    }, true);

    checkPlaceholder(this);
    this.checkContentChange();
    return this;
  };

  // auto link content, return content
  Pen.prototype.autoLink = function() {
    autoLink(this.config.editor);
    return this.getContent();
  };

  // highlight menu
  Pen.prototype.highlight = function() {
    var toolbar = this._toolbar || this._menu
      , node = getNode(this);
    // remove all highlights
    utils.forEach(toolbar.querySelectorAll('.active'), function(el) {
      el.classList.remove('active');
    }, true);

    if (!node) return this;

    var effects = effectNode(this, node)
      , inputBar = this._inputBar
      , highlight;

    if (inputBar && toolbar === this._menu) {
      // display link input if createlink enabled
      inputBar.style.display = 'none';
      // reset link input value
      inputBar.value = '';
    }

    highlight = function(str) {
      if (!str) return;
      var el = toolbar.querySelector('[data-action=' + str + ']');
      return el && el.classList.add('active');
    };
    utils.forEach(effects, function(item) {
      var tag = item.nodeName.toLowerCase();
      switch(tag) {
        case 'a':
          if (inputBar) inputBar.value = item.getAttribute('href');
          tag = 'createlink';
          break;
        case 'img':
          if (inputBar) inputBar.value = item.getAttribute('src');
          tag = 'insertimage';
          break;
        case 'i':
          tag = 'italic';
          break;
        case 'u':
          tag = 'underline';
          break;
        case 'b':
          tag = 'bold';
          break;
        case 'pre':
        case 'code':
          tag = 'code';
          break;
        case 'ul':
          tag = 'insertunorderedlist';
          break;
        case 'ol':
          tag = 'insertorderedlist';
          break;
        case 'li':
          tag = 'indent';
          break;
      }
      highlight(tag);
    }, true);

    return this;
  };

  // show menu
  Pen.prototype.menu = function() {
    if (!this._menu) return this;
    if (selection.isCollapsed) {
      this._menu.style.display = 'none'; //hide menu
      this._inputActive = false;
      return this;
    }
    if (this._toolbar) {
      if (!this._inputBar || !this._inputActive) return this;
    }
    var offset = this._range.getBoundingClientRect()
      , menuPadding = 10
      , top = offset.top - menuPadding
      , left = offset.left + (offset.width / 2)
      , menu = this._menu
      , menuOffset = {x: 0, y: 0}
      , stylesheet = this._stylesheet;

    // fixes some browser double click visual discontinuity
    // if the offset has no width or height it should not be used
    if (offset.width === 0 && offset.height === 0) return this;

    // store the stylesheet used for positioning the menu horizontally
    if (this._stylesheet === undefined) {
      var style = document.createElement("style");
      document.head.appendChild(style);
      this._stylesheet = stylesheet = style.sheet;
    }
    // display block to caculate its width & height
    menu.style.display = 'block';

    menuOffset.x = left - (menu.clientWidth / 2);
    menuOffset.y = top - menu.clientHeight;

    // check to see if menu has over-extended its bounding box. if it has,
    // 1) apply a new class if overflowed on top;
    // 2) apply a new rule if overflowed on the left
    if (stylesheet.cssRules.length > 0) {
      stylesheet.deleteRule(0);
    }
    if (menuOffset.x < 0) {
      menuOffset.x = 0;
      stylesheet.insertRule('.pen-menu:after {left: ' + left + 'px;}', 0);
    } else {
      stylesheet.insertRule('.pen-menu:after {left: 50%; }', 0);
    }
    if (menuOffset.y < 0) {
      menu.classList.add('pen-menu-below');
      menuOffset.y = offset.top + offset.height + menuPadding;
    } else {
      menu.classList.remove('pen-menu-below');
    }

    menu.style.top = menuOffset.y + 'px';
    menu.style.left = menuOffset.x + 'px';
    return this;
  };

  Pen.prototype.stay = function(config) {
    var ctx = this;
    if (!window.onbeforeunload) {
      window.onbeforeunload = function() {
        if (!ctx._isDestroyed) return config.stayMsg;
      };
    }
  };

  Pen.prototype.destroy = function(isAJoke) {
    var destroy = isAJoke ? false : true
      , attr = isAJoke ? 'setAttribute' : 'removeAttribute';

    if (!isAJoke) {
      removeAllListeners(this);
      try {
        selection.removeAllRanges();
        if (this._menu) this._menu.parentNode.removeChild(this._menu);
      } catch (e) {/* IE throws error sometimes*/}
    } else {
      initToolbar(this);
      initEvents(this);
    }
    this._isDestroyed = destroy;
    this.config.editor[attr]('contenteditable', '');

    return this;
  };

  Pen.prototype.rebuild = function() {
    return this.destroy('it\'s a joke');
  };

  // a fallback for old browers
  root.Pen = function(config) {
    if (!config) return utils.log('can\'t find config', true);

    var defaults = utils.merge(config)
      , klass = defaults.editor.getAttribute('class');

    klass = klass ? klass.replace(/\bpen\b/g, '') + ' pen-textarea ' + defaults.class : 'pen pen-textarea';
    defaults.editor.setAttribute('class', klass);
    defaults.editor.innerHTML = defaults.textarea;
    return defaults.editor;
  };

  // export content as markdown
  var regs = {
    a: [/<a\b[^>]*href=["']([^"]+|[^']+)\b[^>]*>(.*?)<\/a>/ig, '[$2]($1)'],
    img: [/<img\b[^>]*src=["']([^\"+|[^']+)[^>]*>/ig, '![]($1)'],
    b: [/<b\b[^>]*>(.*?)<\/b>/ig, '**$1**'],
    i: [/<i\b[^>]*>(.*?)<\/i>/ig, '***$1***'],
    h: [/<h([1-6])\b[^>]*>(.*?)<\/h\1>/ig, function(a, b, c) {
      return '\n' + ('######'.slice(0, b)) + ' ' + c + '\n';
    }],
    li: [/<(li)\b[^>]*>(.*?)<\/\1>/ig, '* $2\n'],
    blockquote: [/<(blockquote)\b[^>]*>(.*?)<\/\1>/ig, '\n> $2\n'],
    pre: [/<pre\b[^>]*>(.*?)<\/pre>/ig, '\n```\n$1\n```\n'],
    p: [/<p\b[^>]*>(.*?)<\/p>/ig, '\n$1\n'],
    hr: [/<hr\b[^>]*>/ig, '\n---\n']
  };

  Pen.prototype.toMd = function() {
    var html = this.getContent()
          .replace(/\n+/g, '') // remove line break
          .replace(/<([uo])l\b[^>]*>(.*?)<\/\1l>/ig, '$2'); // remove ul/ol

    for(var p in regs) {
      if (regs.hasOwnProperty(p))
        html = html.replace.apply(html, regs[p]);
    }
    return html.replace(/\*{5}/g, '**');
  };

  // make it accessible
  if (doc.getSelection) {
    selection = doc.getSelection();
    root.Pen = Pen;
  }

}(window, document));
