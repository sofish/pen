~function(doc) {

  var utils = {};

  // log
  utils.log = function(message, force) {
    if(window._pen_debug_mode_on || force) {
      console.info('Pen Debug Info:');
      console.log(message);
    }
  };

  // type detect
  utils.is = function(obj, type) {
    return Object.prototype.toString.call(obj).slice(8, -1) === type;
  };

  // copy props from a obj
  utils.copy = function(defaults, source) {
    for(var p in source) {
      if(source.hasOwnProperty(p)) {
        var val = source[p];
        if(this.is(val, 'Object')) {
          defaults[p] = this.copy({}, val);
        } else if (this.is(val, 'Array')) {
          defaults[p] = this.copy([], val);
        } else {
          defaults[p] = val;
        }
      }
    }
    return defaults;
  };

  // shift a func
  utils.shift = function(key, fn, time) {
    time = time || 100;
    var queue = this['_shift_fn_' + key]
      , id = '_shift_timeout_' + key
      , current;
    queue ? queue.concat([fn, time]) : (queue = [[fn, time]]);
    current = queue.pop();
    clearTimeout(this[id]);
    this[id] = setTimeout(function() {
      current[0]();
    }, current[1]);
  };

  // get position
  utils.position = function(e) {
    var top = e.clientY || e.pageY
      , left = e.clientX || e.pageX
      , offset;

    offset = e.target.currentStyle ?
          e.target.currentStyle.lineHeight :
          doc.defaultView.getComputedStyle(e.target, null).getPropertyValue('line-height');

    offset = +offset.slice(0, -2);

    return { top: top - offset, left: left };
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

  /**
   * Pen - Editor constructor
   *
   * @param config {DOM Element | String | Object}
   *   config can be a DOM Element, or an HTML ID attribute like '#editor', or an Object:
   *   {
   *     editor: DOM Element [required]
   *     class: class of the editor || 'pen'
   *     debug: enable debug mode || 'false'
   *   }
   *
   * @example
   *  - var editor = new Pen(documenty.body); // make `document.body` as an editor
   *  - var editor = new Pen('#editor'); // make `#editor` as an editor
   *  - var editor = new Pen({
   *      editor: document.body,
   *      debug: true
   *    }); // make `document.body` as an editor and enable debug mode
   */
  var Pen = function(config) {
    if(!config) return utils.log('can\'t find config', true);

    // default settings
    var defaults = {
        class: 'pen',
        debug: false,
        list: ['bold', 'italic', 'underline']
      }

    // user-friendly config
    if(config.nodeType === 1) {
      var editor = options;
    } else if(config.match && config.match(/^#[\S]+$/)) {
      var editor = doc.getElementById(target);
    } else {
      defaults = utils.copy(defaults, config);
    }

    // debug flag
    if(defaults.debug) window._pen_debug_mode_on = true;

    // pen need a editor-area to work with
    if(editor) defaults.editor = editor;
    if(editor && editor.nodeType !== 1) return utils.log('can\'t find editor');

    editor = defaults.editor;

    // set default class
    var klass = editor.getAttribute('class');
    klass = /\bpen\b/.test(klass) ? klass : (klass ? (klass + ' ' + defaults.class) : defaults.class);
    editor.setAttribute('class', klass);

    // set contenteditable
    var editable = editor.getAttribute('contenteditable');
    if(!editable) editor.setAttribute('contenteditable', 'true');

    // assign config
    this.config = defaults;

    return this.init();
  };

  Pen.prototype.toolbar = function() {

    var icons = function(list) {
      var html = ''
      for(var i = 0, len = list.length; i < len; i++) {
        html += '<i class="pen-icon" data-action="' + list[i] + '">' + list[i] + '</i>';
      }
      return html;
    }

    // create toolbar [dom]
    var menu = doc.createElement('div')
      , that = this;

    menu.setAttribute('class', this.config.class + '-menu pen-menu');
    menu.innerHTML = icons(this.config.list);
    menu.style.display = 'none';

    doc.body.appendChild((this._menu = menu));

    // hide the toolbar & only bind once
    utils.bind(this.config.editor, 'mousedown', function() {
      that._menu.style.display = 'none';
    });

    // add effect
    utils.bind(menu, 'click', function(e) {
      var target = e.target, action = target.getAttribute('data-action');
      that.cmd(action);
    })

    return this;
  }

  Pen.prototype.cmd = function(effect) {

    var _fonteffect = function(name) {
      return function() {
        doc.execCommand(name, false, null);
      }
    };

    var actions = {
      bold: _fonteffect('bold'),
      italic: _fonteffect('italic'),
      underline: _fonteffect('underline')
    };

    // add effect
    if(!actions[effect]()) utils.log('fail to add ' + effect + ' effect.');

    return this;
  };

  Pen.prototype.menu = function(position) {

    this._menu.style.top = position.top + 'px';
    this._menu.style.left = position.left + 'px';
    this._menu.style.display = 'block';

    return this;
  };

  Pen.prototype.init = function() {

    var that = this, editor = this.config.editor;

    // embed editor menu
    this.toolbar();

    utils.bind(editor, 'mouseup', function(e) {
      utils.shift('toolbar', function() {
        var range = doc.getSelection();
        if(range.toString().length) {
          var position = utils.position(e);
          return that.menu(position);
        }
      }, 200);
    });

    return this;
  };

  this.Pen = Pen;

}(document);