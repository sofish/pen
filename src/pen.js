/*! Licensed under MIT, https://github.com/sofish/pen */
(function(doc) {

  var Pen, FakePen, utils = {}, hasOwnProperty = Object.prototype.hasOwnProperty;

  // type detect
  utils.is = function(obj, type) {
    return Object.prototype.toString.call(obj).slice(8, -1) === type;
  };

  utils.forEach = function(obj, iterator, context) {
    if(utils.is(obj, 'Array')) {
      for (var i = 0, l = obj.length; i < l; i++) iterator.call(context, obj[i], i, obj);
    } else {
      for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) iterator.call(context, obj[key], key, obj);
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
    if(window._pen_debug_mode_on || force) console.log('%cPEN DEBUGGER: %c' + message, 'font-family:arial,sans-serif;color:#1abf89;line-height:2em;', 'font-family:cursor,monospace;color:#333;');
  };

  // shift a function
  utils.shift = function(key, fn, time) {
    time = time || 50;
    var queue = this['_shift_fn' + key], timeout = 'shift_timeout' + key, current;
    if ( queue ) {
      queue.concat([fn, time]);
    }
    else {
      queue = [[fn, time]];
    }
    current = queue.pop();
    clearTimeout(this[timeout]);
    this[timeout] = setTimeout(function() {
      current[0]();
    }, time);
  };

  // merge: make it easy to have a fallback
  utils.merge = function(config) {

    // default settings
    var defaults = {
      class: 'pen',
      debug: false,
      stay: config.stay || !config.debug,
      stayMsg: 'Are you going to leave here?',
      textarea: '<textarea name="content"></textarea>',
      list: [
        'blockquote', 'h2', 'h3', 'p', 'code', 'insertorderedlist', 'insertunorderedlist', 'inserthorizontalrule',
        'indent', 'outdent', 'bold', 'italic', 'underline', 'createlink'
      ]
    };

    // user-friendly config
    if(config.nodeType === 1) {
      defaults.editor = config;
    } else if(config.match && config.match(/^#[\S]+$/)) {
      defaults.editor = doc.getElementById(config.slice(1));
    } else {
      defaults = utils.copy(defaults, config);
    }

    return defaults;
  };

  Pen = function(config) {

    if(!config) return utils.log('can\'t find config', true);

    // merge user config
    var defaults = utils.merge(config);

    if(defaults.editor.nodeType !== 1) return utils.log('can\'t find editor');
    if(defaults.debug) window._pen_debug_mode_on = true;

    var editor = defaults.editor;

    // set default class
    editor.classList.add(defaults.class);

    // set contenteditable
    var editable = editor.getAttribute('contenteditable');
    if(!editable) editor.setAttribute('contenteditable', 'true');

    // assign config
    this.config = defaults;

    // save the selection obj
    this._sel = doc.getSelection();

    // map actions
    this.actions();

    // enable toolbar
    this.toolbar();

    // init placeholder
    this._initPlaceholder();

    // enable markdown covert
    if (this.markdown) {
      this.markdown.init(this);
    }

    // stay on the page
    if (this.config.stay) {
      this.stay(this.config);
    }
  };

  Pen.prototype._addListener = function(target, type, listener) {
    this._eventTargets = this._eventTargets || [];
    this._eventsCache = this._eventsCache || [];
    var index = this._eventTargets.indexOf(target);
    if(index < 0) {
      this._eventTargets.push(target);
      index = this._eventTargets.length - 1;
    }
    this._eventsCache[index] = this._eventsCache[index] || {};
    this._eventsCache[index][type] = this._eventsCache[index][type] || [];
    this._eventsCache[index][type].push(listener);

    target.addEventListener(type, listener, false);
    return this;
  };

  Pen.prototype._removeAllListeners = function() {
    var that = this;
    if (!that._eventsCache) return that;
    utils.forEach(that._eventsCache, function (events, index) {
      var target = that._eventTargets[index];
      utils.forEach(events, function (listeners, type) {
        utils.forEach(listeners, function (listener) {
          target.removeEventListener(type, listener, false);
        });
      });
    });
    that._eventTargets = [];
    that._eventsCache = [];
  };

  // node effects
  Pen.prototype._effectNode = function(el, returnAsNodeName) {
    var nodes = [];
    while(el !== this.config.editor) {
      if(el.nodeName.match(/(?:[pubia]|h[1-6]|blockquote|[uo]l|li)/i)) {
        nodes.push(returnAsNodeName ? el.nodeName.toLowerCase() : el);
      }
      el = el.parentNode;
    }
    return nodes;
  };

  // placeholder
  Pen.prototype._initPlaceholder = function() {
    var that = this, editor = that.config.editor;

    that._placeholder = editor.getAttribute('data-placeholder');

    that._addListener(editor, 'focus', function() {
      if(!that._placeholder) return;
      editor.classList.remove('pen-placeholder');
      if(that._placeholder === editor.innerHTML) editor.innerHTML = '';
    });
    that._addListener(editor, 'blur', function() {
      that.placeholder();
    });

    that.placeholder();
  };

  Pen.prototype.placeholder = function(placeholder) {
    var editor = this.config.editor;
    if(placeholder) this._placeholder = placeholder + '';

    if(this._placeholder && (!editor.innerHTML.trim() || editor.classList.contains('pen-placeholder'))) {
      editor.innerHTML = this._placeholder;
      editor.classList.add('pen-placeholder');
      return true;
    }
    editor.classList.remove('pen-placeholder');
    return false;
  };

  Pen.prototype.getContent = function() {
    var editor = this.config.editor;
    if(editor.classList.contains('pen-placeholder')) return '';
    return editor.innerHTML;
  };

  Pen.prototype.setContent = function(html) {
    this.config.editor.innerHTML = html;
    this.placeholder();
    return this;
  };

  Pen.prototype.focus = function(focusEnd) {
    var editor = this.config.editor, sel = this._sel;
    editor.focus();
    if(!focusEnd) return;

    var range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    return this;
  };

  // remove style attr
  Pen.prototype.nostyle = function() {
    var els = this.config.editor.querySelectorAll('[style]');
    [].slice.call(els).forEach(function(item) {
      item.removeAttribute('style');
    });
    return this;
  };

  Pen.prototype.toolbar = function() {

    var that = this, icons = '';

    for(var i = 0, list = this.config.list; i < list.length; i++) {
      var name = list[i], klass = 'pen-icon icon-' + name;
      icons += '<i class="' + klass + '" data-action="' + name + '">' + (name.match(/^h[1-6]|p$/i) ? name.toUpperCase() : '') + '</i>';
      if((name === 'createlink')) icons += '<input class="pen-input" placeholder="http://" />';
    }

    var menu = doc.createElement('div');
    menu.setAttribute('class', this.config.class + '-menu pen-menu');
    menu.innerHTML = icons;
    menu.style.display = 'none';

    doc.body.appendChild((this._menu = menu));

    var setpos = function() {
      if(menu.style.display === 'block') that.menu();
    };

    // change menu offset when window resize / scroll
    this._addListener(window, 'resize', setpos);
    this._addListener(window, 'scroll', setpos);

    var editor = this.config.editor;
    var toggle = function() {

      if(that._isDestroyed) return;

      utils.shift('toggle_menu', function() {
        var range = that._sel;
        if(!range.isCollapsed) {
          //show menu
          that._range = range.getRangeAt(0);
          that.menu().highlight();
        } else {
          //hide menu
          that._menu.style.display = 'none';
        }
      }, 200);
    };

    // toggle toolbar on mouse select
    this._addListener(editor, 'mouseup', toggle);

    // toggle toolbar on key select
    this._addListener(editor, 'keyup', toggle);

    // toggle toolbar on key select
    this._addListener(menu, 'click', function(e) {
      var action = e.target.getAttribute('data-action');

      if(!action) return;

      var apply = function(value) {
        that._sel.removeAllRanges();
        that._sel.addRange(that._range);
        that._actions(action, value);
        that._range = that._sel.getRangeAt(0);
        that.highlight().nostyle().menu();
      };

      // create link
      if(action === 'createlink') {
        var input = menu.getElementsByTagName('input')[0], createlink;

        input.style.display = 'block';
        input.focus();

        createlink = function(input) {
          input.style.display = 'none';
          if(input.value) {
            var inputValue = input.value;
            inputValue.replace(/(^\s+)|(\s+$)/g, '');
            inputValue.replace(/^(?!mailto:|.+\/|.+#|.+\?)(.*@.*\..+)$/, 'mailto:$1');
            inputValue.replace(/^(?!\w+?:\/\/|mailto:|\/|\.\/|\?|#)(.*)$/, 'http://$1');
            return apply(inputValue);
          }
          action = 'unlink';
          apply();
        };

        input.onkeypress = function(e) {
          if(e.which === 13) return createlink(e.target);
        };

        return input.onkeypress;
      }

      apply();
    });

    return this;
  };

  // highlight menu
  Pen.prototype.highlight = function() {
    var node = this._sel.focusNode
      , effects = this._effectNode(node)
      , menu = this._menu
      , linkInput = menu.querySelector('input')
      , highlight;

    // remove all highlights
    [].slice.call(menu.querySelectorAll('.active')).forEach(function(el) {
      el.classList.remove('active');
    });

    if (linkInput) {
      // display link input if createlink enabled
      linkInput.style.display = 'none';
      // reset link input value
      linkInput.value = '';
    }

    highlight = function(str) {
      var selector = '.icon-' + str
        , el = menu.querySelector(selector);
      return el && el.classList.add('active');
    };

    effects.forEach(function(item) {
      var tag = item.nodeName.toLowerCase();
      switch(tag) {
        case 'a':
          return (menu.querySelector('input').value = item.getAttribute('href')), highlight('createlink');
        case 'i':
          return highlight('italic');
        case 'u':
          return highlight('underline');
        case 'b':
          return highlight('bold');
        case 'code':
          return highlight('code');
        case 'ul':
          return highlight('insertunorderedlist');
        case 'ol':
          return highlight('insertorderedlist');
        case 'ol':
          return highlight('insertorderedlist');
        case 'li':
          return highlight('indent');
        default :
          highlight(tag);
      }
    });

    return this;
  };

  Pen.prototype.actions = function() {
    var that = this, reg, block, overall, insert, wrap;

    // allow command list
    reg = {
      block: /^(?:p|h[1-6]|blockquote|pre)$/,
      inline: /^(?:bold|italic|underline|insertorderedlist|insertunorderedlist|indent|outdent)$/,
      source: /^(?:insertimage|createlink|unlink)$/,
      insert: /^(?:inserthorizontalrule|insert)$/,
      wrap: /^(?:code)$/
    };

    overall = function(cmd, val) {
      var message = ' to exec 「' + cmd + '」 command' + (val ? (' with value: ' + val) : '');
      if(document.execCommand(cmd, false, val) && that.config.debug) {
        utils.log('success' + message);
      } else {
        utils.log('fail' + message);
      }
    };

    insert = function(name) {
      var range = that._sel.getRangeAt(0)
        , node = range.startContainer;

      while(node.nodeType !== 1) {
        node = node.parentNode;
      }

      range.selectNode(node);
      range.collapse(false);
      return overall(name);
    };

    block = function(name) {
      if(that._effectNode(that._sel.getRangeAt(0).startContainer, true).indexOf(name) !== -1) {
        if(name === 'blockquote') return document.execCommand('outdent', false, null);
        name = 'p';
      }
      return overall('formatblock', name);
    };

    wrap = function(tag) {
      var val = '<'+tag+'>'+ document.getSelection() +'</'+tag+'>';
      return overall('insertHTML', val);
    };

    this._actions = function(name, value) {
      if(name.match(reg.block)) {
        block(name);
      } else if(name.match(reg.inline) || name.match(reg.source)) {
        overall(name, value);
      } else if(name.match(reg.insert)) {
        insert(name);
      } else if(name.match(reg.wrap)) {
        wrap(name);
      } else {
        if(this.config.debug) utils.log('can not find command function for name: ' + name + (value ? (', value: ' + value) : ''));
      }
    };

    return this;
  };

  // show menu
  Pen.prototype.menu = function() {

    var offset = this._range.getBoundingClientRect()
      , menuPadding = 10
      , top = offset.top - menuPadding
      , left = offset.left + (offset.width / 2)
      , menu = this._menu
      , menuOffset = { x: 0, y: 0 }
      , stylesheet = this._stylesheet;

    // store the stylesheet used for positioning the menu horizontally
    if(this._stylesheet === undefined) {
      var style = document.createElement("style");
      document.head.appendChild(style);
      this._stylesheet = stylesheet = style.sheet;
    }
    // display block to caculate its width & height
    menu.style.display = 'block';

    menuOffset.x = left - (menu.clientWidth/2);
    menuOffset.y = top - menu.clientHeight;

    // check to see if menu has over-extended its bounding box. if it has,
    // 1) apply a new class if overflowed on top;
    // 2) apply a new rule if overflowed on the left
    if(stylesheet.cssRules.length > 0) {
      stylesheet.deleteRule(0);
    }
    if(menuOffset.x < 0) {
      menuOffset.x = 0;
      stylesheet.insertRule('.pen-menu:after { left: ' + left + 'px; }',0);
    } else {
      stylesheet.insertRule('.pen-menu:after { left: 50%; }',0);
    }
    if(menuOffset.y < 0) {
      menu.classList.toggle('pen-menu-below', true);
      menuOffset.y = offset.top + offset.height + menuPadding;
    } else {
      menu.classList.toggle('pen-menu-below', false);
    }

    menu.style.top = menuOffset.y + 'px';
    menu.style.left = menuOffset.x + 'px';
    return this;
  };

  Pen.prototype.stay = function(config) {
    var that = this;
    if (!window.onbeforeunload) {
      window.onbeforeunload = function() {
        if(!that._isDestroyed) return config.stayMsg;
      };
    }
  };

  Pen.prototype.destroy = function(isAJoke) {
    var destroy = isAJoke ? false : true
      , attr = isAJoke ? 'setAttribute' : 'removeAttribute';

    if(!isAJoke) {
      this._removeAllListeners();
      this._sel.removeAllRanges();
      this._menu.parentNode.removeChild(this._menu);
    } else {
      this.toolbar();
    }
    this._isDestroyed = destroy;
    this.config.editor[attr]('contenteditable', '');

    return this;
  };

  Pen.prototype.rebuild = function() {
    return this.destroy('it\'s a joke');
  };

  // a fallback for old browers
  FakePen = function(config) {
    if(!config) return utils.log('can\'t find config', true);

    var defaults = utils.merge(config)
      , klass = defaults.editor.getAttribute('class');

    klass = klass ? klass.replace(/\bpen\b/g, '') + ' pen-textarea ' + defaults.class : 'pen pen-textarea';
    defaults.editor.setAttribute('class', klass);
    defaults.editor.innerHTML = defaults.textarea;
    return defaults.editor;
  };

  // make it accessible
  this.Pen = doc.getSelection ? Pen : FakePen;

}(document));
