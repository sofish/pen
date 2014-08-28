/*! Licensed under MIT, https://github.com/sofish/pen */
(function(root, doc) {

  var Pen, FakePen, debugMode, utils = {};
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var toString = Object.prototype.toString;

  // allow command list
  var commandsReg = {
    block: /^(?:p|h[1-6]|blockquote|pre)$/,
    inline: /^(?:bold|italic|underline|insertorderedlist|insertunorderedlist|indent|outdent)$/,
    source: /^(?:insertimage|createlink|unlink)$/,
    insert: /^(?:inserthorizontalrule|insert)$/,
    wrap: /^(?:code)$/
  };

  var effectNodeReg = /(?:[pubia]|h[1-6]|blockquote|[uo]l|li)/i;

  var strReg = {
    whiteSpace: /(^\s+)|(\s+$)/g,
    mailTo: /^(?!mailto:|.+\/|.+#|.+\?)(.*@.*\..+)$/,
    http: /^(?!\w+?:\/\/|mailto:|\/|\.\/|\?|#)(.*)$/
  };

  // type detect
  utils.is = function(obj, type) {
    return toString.call(obj).slice(8, -1) === type;
  };

  utils.forEach = function(obj, iterator, context, arrayLike) {
    if (arrayLike == null) arrayLike = utils.is(obj, 'Array');
    if(arrayLike) {
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
    if(debugMode || force) console.log('%cPEN DEBUGGER: %c' + message, 'font-family:arial,sans-serif;color:#1abf89;line-height:2em;', 'font-family:cursor,monospace;color:#333;');
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

  function commandOverall(cmd, val) {
    var message = ' to exec 「' + cmd + '」 command' + (val ? (' with value: ' + val) : '');
    if(document.execCommand(cmd, false, val)) {
      utils.log('success' + message);
    } else {
      utils.log('fail' + message, true);
    }
  }

  function commandInsert(name) {
    var range = this._sel.getRangeAt(0)
      , node = range.startContainer;

    while(node.nodeType !== 1) {
      node = node.parentNode;
    }

    range.selectNode(node);
    range.collapse(false);
    return commandOverall.call(this, name);
  }

  function commandBlock(name) {
    if(effectNode.call(this, this._sel.getRangeAt(0).startContainer, true).indexOf(name) !== -1) {
      if(name === 'blockquote') return document.execCommand('outdent', false, null);
      name = 'p';
    }
    return commandOverall.call(this, 'formatblock', name);
  }

  function commandWrap(tag) {
    var val = '<' + tag + '>' + this._sel + '</' + tag + '>';
    return commandOverall.call(this, 'insertHTML', val);
  }

  // placeholder
  function initPlaceholder() {
    var that = this, editor = that.config.editor;

    that._placeholder = editor.getAttribute('data-placeholder');
    that.placeholder();
  }

  function initToolbar() {
    var icons = '';

    utils.forEach(this.config.list, function (name) {
      var klass = 'pen-icon icon-' + name;
      icons += '<i class="' + klass + '" data-action="' + name + '">' + (name.match(/^h[1-6]|p$/i) ? name.toUpperCase() : '') + '</i>';
      if((name === 'createlink')) icons += '<input class="pen-input" placeholder="http://" />';
    }, null, true);

    this._menu = doc.createElement('div');
    this._menu.setAttribute('class', this.config.class + '-menu pen-menu');
    this._menu.innerHTML = icons;
    this._menu.style.display = 'none';

    doc.body.appendChild(this._menu);
  }

  function initEvents() {
    var timer, that = this, menu = that._menu, editor = that.config.editor, sel = that._sel;

    var setpos = function() {
      if(menu.style.display === 'block') that.menu();
    };

    // change menu offset when window resize / scroll
    addListener.call(this, window, 'resize', setpos);
    addListener.call(this, window, 'scroll', setpos);

    var toggle = function() {
      that._range = sel.getRangeAt(0);

      clearTimeout(timer);
      timer = setTimeout(function() {
        if(!sel.isCollapsed) {
          //show menu
          that.menu().highlight();
        } else {
          //hide menu
          that._menu.style.display = 'none';
        }
      }, 200);
    };

    // toggle toolbar on mouse select
    addListener.call(this, editor, 'mouseup', toggle);

    // toggle toolbar on key select
    addListener.call(this, editor, 'keyup', toggle);

    var menuApply = function(action, value) {
      that.setRange();
      that.execCommand(action, value);
      that._range = that.getRange();
      that.highlight().menu();
    };

    // toggle toolbar on key select
    addListener.call(this, menu, 'click', function(e) {
      var action = e.target.getAttribute('data-action');

      if(!action) return;
      if(action !== 'createlink') return menuApply(action);
      // create link
      var input = menu.getElementsByTagName('input')[0];

      input.style.display = 'block';
      input.focus();

      var createlink = function(input) {
        input.style.display = 'none';
        if(input.value) {
          var inputValue = input.value
            .replace(strReg.whiteSpace, '')
            .replace(strReg.mailTo, 'mailto:$1')
            .replace(strReg.http, 'http://$1');
          return menuApply(action, inputValue);
        }
        action = 'unlink';
        menuApply(action);
      };

      input.onkeypress = function(e) {
        if(e.which === 13) return createlink(e.target);
      };

    });

    // listen for placeholder
    addListener.call(this, editor, 'focus', function() {
      if(editor.classList.contains('pen-placeholder') || that.isEmpty()) editor.innerHTML = '<div><br></div>';
      editor.classList.remove('pen-placeholder');
    });

    addListener.call(this, editor, 'blur', function() {
      that.placeholder();
    });

    // listen for paste and clear style
    addListener.call(this, editor, 'paste', function() {
      setTimeout(function() {
        that.clearAttr('id');
        that.clearAttr('name');
        that.clearAttr('class');
        that.clearAttr('style');
      });
    });

    // addListener.call(this, editor, 'keydown', function(e) {
    //   if (e.keyCode === 13) {
    //     document.execCommand('insertHTML', false, '<p><br></p>');
    //     return false;
    //   }
    // });
  }

  function addListener(target, type, listener) {
    this._eventTargets = this._eventTargets || [];
    this._eventsCache = this._eventsCache || [];
    var index = this._eventTargets.indexOf(target);
    if(index < 0) {
      index = this._eventTargets.push(target) - 1;
    }
    this._eventsCache[index] = this._eventsCache[index] || {};
    this._eventsCache[index][type] = this._eventsCache[index][type] || [];
    this._eventsCache[index][type].push(listener);

    target.addEventListener(type, listener, false);
    return this;
  }

  function removeAllListeners() {
    var that = this;
    if (!that._eventsCache) return that;
    utils.forEach(that._eventsCache, function (events, index) {
      var target = that._eventTargets[index];
      utils.forEach(events, function (listeners, type) {
        utils.forEach(listeners, function (listener) {
          target.removeEventListener(type, listener, false);
        }, null, true);
      }, null, false);
    }, null, true);
    that._eventTargets = [];
    that._eventsCache = [];
    return that;
  }

  // node effects
  function effectNode(el, returnAsNodeName) {
    var nodes = [];
    while(el !== this.config.editor) {
      if(el.nodeName.match(effectNodeReg)) {
        nodes.push(returnAsNodeName ? el.nodeName.toLowerCase() : el);
      }
      el = el.parentNode;
    }
    return nodes;
  }

  Pen = function(config) {

    if(!config) throw new Error('Can\'t find config');

    debugMode = config.debug;

    // merge user config
    var defaults = utils.merge(config);

    var editor = defaults.editor;

    if(!editor || editor.nodeType !== 1) throw new Error('Can\'t find editor');

    // set default class
    editor.classList.add(defaults.class);

    // set contenteditable
    editor.setAttribute('contenteditable', 'true');

    // assign config
    this.config = defaults;

    // save the selection obj
    this._sel = doc.getSelection();

    // enable toolbar
    initToolbar.call(this);

    // init placeholder
    initPlaceholder.call(this);

    // init events
    initEvents.call(this);

    // enable markdown covert
    if (this.markdown) this.markdown.init(this);

    // stay on the page
    if (this.config.stay) this.stay(this.config);

  };

  Pen.prototype.on = function(type, listener) {
    addListener.call(this, this.config.editor, type, listener);
    return this;
  };

  Pen.prototype.placeholder = function(placeholder) {
    var editor = this.config.editor;
    if(placeholder) this._placeholder = placeholder + '';

    if(this._placeholder && (editor.classList.contains('pen-placeholder') || this.isEmpty())) {
      editor.innerHTML = this._placeholder;
      editor.classList.add('pen-placeholder');
      return true;
    }
    editor.classList.remove('pen-placeholder');
    return false;
  };

  Pen.prototype.isEmpty = function() {
    var editor = this.config.editor;
    return !(editor.innerText.trim() || editor.querySelectorAll('img').length);
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

  Pen.prototype.getRange = function() {
    var sel = this._sel;
    return (sel.rangeCount && sel.getRangeAt(0)) || null;
  };

  Pen.prototype.setRange = function(range) {
    var sel = this._sel;
    range = range || this._range;
    if (!range) {
      range = this.getRange();
      if (range) range.collapse(false); // set to end
    }
    if (range) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    return this;
  };

  Pen.prototype.focus = function(focusStart) {
    this.config.editor.focus();
    if(!focusStart) this.setRange();
    return this;
  };

  Pen.prototype.execCommand = function(name, value) {
    if(name.match(commandsReg.block)) {
      commandBlock.call(this, name);
    } else if(name.match(commandsReg.inline) || name.match(commandsReg.source)) {
      commandOverall.call(this, name, value);
    } else if(name.match(commandsReg.insert)) {
      commandInsert.call(this, name);
    } else if(name.match(commandsReg.wrap)) {
      commandWrap.call(this, name);
    } else {
      utils.log('can not find command function for name: ' + name + (value ? (', value: ' + value) : ''), true);
    }
  };

  // remove style attr
  Pen.prototype.clearAttr = function(attr) {
    var els = this.config.editor.querySelectorAll('[' + attr + ']');
    utils.forEach(els, function(item) {
      item.removeAttribute(attr);
    }, null, true);
    return this;
  };

  // highlight menu
  Pen.prototype.highlight = function() {
    var node = this._sel.focusNode
      , effects = effectNode.call(this, node)
      , menu = this._menu
      , linkInput = menu.querySelector('input')
      , highlight;

    // remove all highlights
    utils.forEach(menu.querySelectorAll('.active'), function(el) {
      el.classList.remove('active');
    }, null, true);

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

    utils.forEach(effects, function(item) {
      var tag = item.nodeName.toLowerCase();
      switch(tag) {
        case 'a':
          menu.querySelector('input').value = item.getAttribute('href');
          tag = 'createlink';
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
        case 'code':
          tag = 'code';
          break;
        case 'ul':
          tag = 'insertunorderedlist';
          break;
        case 'ol':
          tag = 'insertorderedlist';
          break;
        case 'ol':
          tag = 'insertorderedlist';
          break;
        case 'li':
          tag = 'indent';
          break;
      }
      highlight(tag);
    }, null, true);

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
      removeAllListeners.call(this);
      this._sel.removeAllRanges();
      this._menu.parentNode.removeChild(this._menu);
    } else {
      initToolbar.call(this);
      initPlaceholder.call(this);
      initEvents.call(this);
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
  root.Pen = doc.getSelection ? Pen : FakePen;

}(window, document));
