~function(doc) {

  var Pen, utils = {};

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

  // event handler
  utils._event = function(el, event, handler) {

    handler = handler || function() {};
    handler = utils._eventfixer(el, handler);

    return el.addEventListener ?
        el.addEventListener(event, handler, false) : el.attachEvent('on' + event, handler);
  };

  utils._eventfixer = function(el, fn) {
    return function(e) {
      // event object
      e = e || window.event;

      // prevent default
      if(!e.preventDefault) e.preventDefault = function() {
        return e.returnValue = false;
      }

      // stop propagation
      if(!e.stopPropagation) e.stopPropagation = function() {
        return e.cancelBubble = true;
      }

      // event target
      if(!e.target) e.target = e.srcElement;

      fn.call(el, e);
    }
  }

  utils.bind = utils._event;


  Pen = function(config) {

    if(!config) return utils.log('can\'t find config', true);

    // default settings
    var defaults = {
        class: 'pen',
        debug: false,
        list: ['blockquote', 'h2', 'h3', 'bold', 'italic', 'underline', 'createlink']
      }

    // user-friendly config
    if(config.nodeType === 1) {
      defaults.editor = options;
    } else if(config.match && config.match(/^#[\S]+$/)) {
      defaults.editor = doc.getElementById(target);
    } else {
      defaults = utils.copy(defaults, config);
    }

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

    // map actions
    this.actions();

    // enable toolbar
    this.toolbar();
  };

  Pen.prototype.toolbar = function() {

    var menu, that = this, icons = '';

    for(var i = 0, list = this.config.list; i < list.length; i++) {
      var name = list[i], klass = 'pen-icon icon-' + name;
      icons += '<i class="' + klass + '" data-action="' + name + '">' + name + '</i>';
      if((name === 'createlink')) icons += '<input class="pen-input" placeholder="http://" />';
    }

    menu = doc.createElement('div');
    menu.setAttribute('class', this.config.class + '-menu pen-menu');
    menu.innerHTML = icons;
    menu.style.display = 'none';

    doc.body.appendChild((this._menu = menu));

    // show toolbar on select
    utils.bind(this.config.editor, 'mouseup', function(){
        var range = doc.getSelection();
        if(!range.isCollapsed) {
          that._range = range.getRangeAt(0);
          return that.menu();
        }
    });

    // when to hide
    utils.bind(this.config.editor, 'click', function() {
      if(doc.getSelection().isCollapsed) that._menu.style.display = 'none';
    });

    // work like an editor
    utils.bind(menu, 'click', function(e) {
      var action = e.target.getAttribute('data-action')
        , value = null;

      if(!action) return;

      // create link
      if(action === 'createlink') {
        var input = menu.getElementsByTagName('input')[0];

        input.style.display = 'block'
        input.focus();

        return input.onkeypress = function(e) {
          if(e.which === 13 && e.target.value) {
            doc.getSelection().addRange(that._range);
            url = e.target.value.replace(/(^\s+)|(\s+$)/g, '');
            that._actions(action, url);

            menu.style.display = 'none';
            input.style.display = 'none';
            input.value = '';
          }
        }
      }

      that.config.editor.focus();
      doc.getSelection().addRange(that._range);
      that._actions(action, value);
    });

    return this;
  }

  Pen.prototype.actions = function() {
    var that = this;

    // allow list
    var reg = {
      block: /^(?:p|h[1-6]|blockquote)$/,
      inline: /^(?:bold|italic|underline)$/,
      source: /^(?:insertimage|createlink)$/
    }

    var currentEffectNode = function(el, tag) {
      el = el.parentNode;
      while(el.nodeName !== 'BODY') {
        if(el.nodeName === tag.toUpperCase()) return el;
        el = el.parentNode;
      }
    };

    var inline = function(name, value) {
      return doc.execCommand(name, false, value);
    };

    var block = function(name) {
      var node = doc.getSelection().getRangeAt(0).startContainer;
      if(currentEffectNode(node, name)) {
        if(name === 'blockquote') return document.execCommand('outdent', false, null);
        name = 'p';
      }
      return document.execCommand('formatblock', false, name);
    };

    this._actions = function(name, value) {
      if(name.match(reg.block)) {
        return block(name);
      } else if(name.match(reg.inline) || name.match(reg.source)) {
        return inline(name, value);
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

  // make it accessible
  this.Pen = Pen;

}(document);