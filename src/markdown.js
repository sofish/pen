/*! Licensed under MIT, https://github.com/sofish/pen */
(function(root) {

  // only works with Pen
  if(!root.Pen) return;

  // markdown covertor obj
  var covertor = {
    keymap: { '96': '`', '62': '>', '49': '1', '46': '.', '45': '-', '42': '*', '35': '#'},
    stack : []
  };

  // return valid markdown syntax
  covertor.valid = function(str) {
    var len = str.length;

    if(str.match(/[#]{1,6}/)) {
      return ['h' + len, len];
    } else if(str === '```') {
      return ['pre', len];
    } else if(str === '>') {
      return ['blockquote', len];
    } else if(str === '1.') {
      return ['insertorderedlist', len];
    } else if(str === '-' || str === '*') {
      return ['insertunorderedlist', len];
    } else if(str.match(/(?:\.|\*|\-){3,}/)) {
      return ['inserthorizontalrule', len];
    }
  };

  // parse command
  covertor.parse = function(e) {
    var code = e.keyCode || e.which;

    // when `space` is pressed
    if (code === 32) {
      var markdownSyntax = this.stack.join('');
      // reset stack
      this.stack = [];

      var cmd = this.valid(markdownSyntax);
      if (cmd) {
        // prevents leading space after executing command
        e.preventDefault();
        return cmd;
      }
    }

    // make cmd
    if(this.keymap[code]) this.stack.push(this.keymap[code]);

    return false;
  };

  // exec command
  covertor.action = function(pen, cmd) {

    // only apply effect at line start
    if(pen.selection.focusOffset > cmd[1]) return;

    var node = pen.selection.focusNode;
    node.textContent = node.textContent.slice(cmd[1]);
    pen.execCommand(cmd[0]);
  };

  // init covertor
  covertor.init = function(pen) {
    pen.on('keypress', function(e) {
      var cmd = covertor.parse(e);
      if(cmd) return covertor.action(pen, cmd);
    });
  };

  // append to Pen
  root.Pen.prototype.markdown = covertor;

}(window));
