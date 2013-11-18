/*! Licensed under MIT, https://github.com/sofish/pen */
/* jshint -W030, -W093, -W015 */
(function(doc) {

  var Pen, FakePen, utils = {};

  // type detect
  utils.is = function(obj, type) {
    return Object.prototype.toString.call(obj).slice(8, -1) === type;
  };

  // copy props from a obj
  utils.copy = function(defaults, source) {
    for(var p in source) {
      if(source.hasOwnProperty(p)) {
        var val = source[p];
        defaults[p] = this.is(val, 'Object') ? this.copy({}, val) :
          this.is(val, 'Array') ? this.copy([], val) : val;
      }
    }
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
    queue ? queue.concat([fn, time]) : (queue = [[fn, time]]);
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
      textarea: '<textarea name="content"></textarea>',
      list: [
        'blockquote', 'h2', 'h3', 'p', 'insertorderedlist', 'insertunorderedlist', 'inserthorizontalrule',
        'indent', 'outdent', 'bold', 'italic', 'underline', 'createlink'
      ]
    };

    // user-friendly config
    if(config.nodeType === 1) {
      defaults.editor = config;
    } else if(config.match && config.match(/^#[\S]+$/)) {
      defaults.editor = document.getElementById(config.slice(1));
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

    // enable markdown covert
    this.markdown && this.markdown.init(this);

    // stay on the page
    this.config.stay && this.stay();
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
    window.addEventListener('resize', setpos);
    window.addEventListener('scroll', setpos);

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
    editor.addEventListener('mouseup', toggle);

    // toggle toolbar on key select
    editor.addEventListener('keyup', toggle);

    // toggle toolbar on key select
    menu.addEventListener('click', function(e) {
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
          if(input.value) return apply(input.value.replace(/(^\s+)|(\s+$)/g, '').replace(/^(?!http:\/\/|https:\/\/)(.*)$/, 'http://$1'));
          action = 'unlink';
          apply();
        };

        return input.onkeypress = function(e) {
          if(e.which === 13) return createlink(e.target);
        };
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

    // display link input if createlink enabled
    if (linkInput) linkInput.style.display = 'none';

    highlight = function(str) {
      var selector = '.icon-' + str
        , el = menu.querySelector(selector);
      return el && el.classList.add('active');
    };

    effects.forEach(function(item) {
      var tag = item.nodeName.toLowerCase();
      switch(tag) {
        case 'a': return (menu.querySelector('input').value = item.href), highlight('createlink');
        case 'i': return highlight('italic');
        case 'u': return highlight('underline');
        case 'b': return highlight('bold');
        case 'ul': return highlight('insertunorderedlist');
        case 'ol': return highlight('insertorderedlist');
        case 'ol': return highlight('insertorderedlist');
        case 'li': return highlight('indent');
        default : highlight(tag);
      }
    });

    return this;
  };

  Pen.prototype.actions = function() {
    var that = this, reg, block, overall, insert;

    // allow command list
    reg = {
      block: /^(?:p|h[1-6]|blockquote|pre)$/,
      inline: /^(?:bold|italic|underline|insertorderedlist|insertunorderedlist|indent|outdent)$/,
      source: /^(?:insertimage|createlink|unlink)$/,
      insert: /^(?:inserthorizontalrule|insert)$/
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

    this._actions = function(name, value) {
      if(name.match(reg.block)) {
        block(name);
      } else if(name.match(reg.inline) || name.match(reg.source)) {
        overall(name, value);
      } else if(name.match(reg.insert)) {
        insert(name);
      } else {
        if(this.config.debug) utils.log('can not find command function for name: ' + name + (value ? (', value: ' + value) : ''));
      }
    };

    return this;
  };

  // show menu
  Pen.prototype.menu = function() {

    var offset = this._range.getBoundingClientRect()
      , top = offset.top - 10
      , left = offset.left + (offset.width / 2)
      , menu = this._menu;

    // display block to caculate it's width & height
    menu.style.display = 'block';
    menu.style.top = top - menu.clientHeight + 'px';
    menu.style.left = left - (menu.clientWidth/2) + 'px';

    return this;
  };

  Pen.prototype.stay = function() {
    var that = this;
    !window.onbeforeunload && (window.onbeforeunload = function() {
      if(!that._isDestroyed) return 'Are you going to leave here?';
    });
  };

  Pen.prototype.destroy = function(isAJoke) {
    var destroy = isAJoke ? false : true
      , attr = isAJoke ? 'setAttribute' : 'removeAttribute';

    if(!isAJoke) {
      this._sel.removeAllRanges();
      this._menu.style.display = 'none';
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
