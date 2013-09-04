/*! Licensed under MIT, https://github.com/sofish/pen */
~function(doc) {

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
    if(window._pen_debug_mode_on || force) console.log('Pen Debug Info: ' + message);
  };

  // merge: make it easy to have a fallback
  utils.merge = function(config) {

    // default settings
    var defaults = {
      class: 'pen',
      debug: false,
      textarea: '<textarea name="content"></textarea>',
      list: ['blockquote', 'h2', 'h3', 'p', 'insertorderedlist', 'insertunorderedlist', 'indent', 'outdent', 'bold', 'italic', 'underline', 'createlink']
    };

    // user-friendly config
    if(config.nodeType === 1) {
      defaults.editor = options;
    } else if(config.match && config.match(/^#[\S]+$/)) {
      defaults.editor = doc.getElementById(target);
    } else {
      defaults = utils.copy(defaults, config);
    }

    return defaults;
  }


  Pen = function(config) {

    if(!config) return utils.log('can\'t find config', true);

    // merge user config
    var defaults = utils.merge(config);

    if(defaults.editor.nodeType !== 1) return utils.log('can\'t find editor');
    if(defaults.debug) window._pen_debug_mode_on = true;

    var editor = defaults.editor;

    // set default class
    var klass = editor.getAttribute('class');
    klass = /\bpen\b/.test(klass) ? klass : (klass ? (klass + ' ' + defaults.class) : defaults.class);
    editor.setAttribute('class', klass);

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
  };

  // node effects
  Pen.prototype._effectNode = function(el, returnAsNodeName) {
    var nodes = [], result;
    while(el !== this.config.editor) {
      if(el.nodeName.match(/(?:[pubia]|h[1-6]|blockquote|[uo]l|li)/i)) {
        nodes.push(returnAsNodeName ? el.nodeName.toLowerCase() : el);
      }
      el = el.parentNode;
    }
    return nodes;
  };

  Pen.prototype.toolbar = function() {

    var menu, that = this, icons = '';

    for(var i = 0, list = this.config.list; i < list.length; i++) {
      var name = list[i], klass = 'pen-icon icon-' + name;
      icons += '<i class="' + klass + '" data-action="' + name + '">' + (name.match(/^h[1-6]|p$/i) ? name.toUpperCase() : '') + '</i>';
      if((name === 'createlink')) icons += '<input class="pen-input" placeholder="http://" />';
    }

    menu = doc.createElement('div');
    menu.setAttribute('class', this.config.class + '-menu pen-menu');
    menu.innerHTML = icons;
    menu.style.display = 'none';

    doc.body.appendChild((this._menu = menu));

    // change menu offset when window resize
    window.addEventListener('resize', function() {
      if(menu.style.display === 'block') {
        menu.style.display = 'none';
        that.menu();
      };
    });

    // show toolbar on select
    this.config.editor.addEventListener('mouseup', function(){
        var range = that._sel;
        if(!range.isCollapsed) {
          that._range = range.getRangeAt(0);
          that.menu();
          that.highlight();
        }
    });

    // when to hide
   this.config.editor.addEventListener('click', function() {
      setTimeout(function() {
          that._sel.isCollapsed ?
          (that._menu.style.display = 'none') :
          (that._menu.getElementsByTagName('input')[0].style.display = 'none');
      }, 0);
    });

    // work like an editor
    menu.addEventListener('click', function(e) {
      var action = e.target.getAttribute('data-action');

      if(!action) return;

      var apply = function(value) {
        that._sel.removeAllRanges();
        that._sel.addRange(that._range);
        that._actions(action, value);
        that._range = that._sel.getRangeAt(0);
        that.highlight();
        that.menu();
      }

      // create link
      if(action === 'createlink') {
        var input = menu.getElementsByTagName('input')[0], createlink;

        input.style.display = 'block'
        input.focus();

        createlink = function(input) {
          input.style.display = 'none';
          if(input.value) return apply(input.value.replace(/(^\s+)|(\s+$)/g, ''));
          action = 'unlink';
          apply();
        };

        return input.onkeypress = function(e) {
          if(e.which === 13) return createlink(e.target);
        }
      }

      apply();
    });

    return this;
  }

  // highlight menu
  Pen.prototype.highlight = function(target) {
    var node = this._sel.focusNode
      , effects = this._effectNode(node)
      , menu = this._menu
      , highlight;

    // remove all highlights
    [].slice.call(menu.querySelectorAll('.active')).forEach(function(el) {
      el.classList.remove('active');
    });

    highlight = function(str) {
      var selector = '.icon-' + str
        , el = menu.querySelector(selector);
      return el && el.classList.add('active');
    };

    effects.forEach(function(item) {
      var tag = item.nodeName.toLowerCase();
      if(tag === 'a') {
        menu.querySelector('input').value = item.href;
        return highlight('createlink');
      }
      if(tag === 'i') return highlight('italic');
      if(tag === 'u') return highlight('underline');
      if(tag === 'b') return highlight('bold');
      if(tag === 'ul') return highlight('insertunorderedlist');
      if(tag === 'ol') return highlight('insertorderedlist');
      if(tag === 'ol') return highlight('insertorderedlist');
      if(tag === 'li') return highlight('indent');
      return highlight(tag);
    });

    return this;
  }

  Pen.prototype.actions = function() {
    var that = this;

    // allow list
    var reg = {
      block: /^(?:p|h[1-6]|blockquote)$/,
      inline: /^(?:bold|italic|underline|insertorderedlist|insertunorderedlist|indent|outdent)$/,
      source: /^(?:insertimage|createlink|unlink)$/
    }

    var inline = function(name, value) {
      return doc.execCommand(name, false, value);
    };

    var block = function(name) {
      if(that._effectNode(that._sel.getRangeAt(0).startContainer, true).indexOf(name) !== -1) {
        if(name === 'blockquote') return document.execCommand('outdent', false, null);
        name = 'p';
      }

      return document.execCommand('formatblock', false, name);
    };

    this._actions = function(name, value) {
      if(name.match(reg.block)) {
        block(name);
      } else if(name.match(reg.inline) || name.match(reg.source)) {
        inline(name, value);
      } else {
        if(this.config.debug) log('can\' find command func');
      }
    }

    return this;
  }

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

  // a fallback for old browers
  FakePen = function(config) {
    if(!config) return utils.log('can\'t find config', true);

    var defaults = utils.merge(config)
      , klass = defaults.editor.getAttribute('class');

    klass = klass ? klass.replace(/\bpen\b/g, '') + ' pen-textarea ' + defaults.class : 'pen pen-textarea';
    defaults.editor.setAttribute('class', klass);
    defaults.editor.innerHTML = defaults.textarea;
    return defaults.editor;
  }

  // make it accessible
  this.Pen = doc.getSelection ? Pen : FakePen;

}(document);