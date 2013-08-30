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
        list: ['bold', 'italic', 'underline']
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

    // enable toolbar
    this.toolbar();
  };

  Pen.prototype.toolbar = function() {

    var menu, that = this, icons = '';

    for(var i = 0, list = this.config.list; i < list.length; i++) {
      icons += '<i class="pen-icon" data-action="' + list[i] + '">' + list[i] + '</i>';
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
    utils.bind(menu, 'mousedown', function(e) {
      doc.getSelection().addRange(that._range);
      that.cmd(e.target.getAttribute('data-action'));
    });

    return this;
  }

  // add effects
  Pen.prototype.cmd = function(effect) {

    var that = this;

    var _fonteffect = function(name) {
      return function() {
        doc.execCommand(name, false, null);
        that._menu.style.display = 'none';
      }
    };

    var actions = {
      bold: _fonteffect('bold'),
      italic: _fonteffect('italic'),
      underline: _fonteffect('underline')
    };

    // add effect
    actions[effect]();

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

  // make it accessible
  this.Pen = Pen;

}(document);