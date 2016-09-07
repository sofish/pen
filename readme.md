# Pen Editor

- **LIVE DEMO:** [http://sofish.github.io/pen](http://sofish.github.io/pen)
- **Markdown is supported**
- **Build status:** [![Build Status](https://travis-ci.org/sofish/pen.png?branch=master)](https://travis-ci.org/sofish/pen)

******************

![pen editor - screenshot ](https://f.cloud.github.com/assets/153183/1093671/61d4c0d2-16a9-11e3-88ed-01b1758a9a42.png)

******************

## 0. source code

You can clone the source code from github, or using bower.

```
bower install pen
```


## 1. installation

#### 1.1 init with id attribute

```js
var editor = new Pen('#editor');
```

#### 1.2 init with an element

```js
var editor = new Pen(document.getElementById('editor'));
```

#### 1.3 init with options

```js
var options = {
  editor: document.body, // {DOM Element} [required]
  class: 'pen', // {String} class of the editor,
  debug: false, // {Boolean} false by default
  textarea: '<textarea name="content"></textarea>', // fallback for old browsers
  list: ['bold', 'italic', 'underline'] // editor menu list
}

var editor = new Pen(options);
```

## 2. configure

The following object sets up the default settings of Pen:

```js
defaults = {
  class: 'pen',
  debug: false,
  textarea: '<textarea name="content"></textarea>',
  list: [
    'blockquote', 'h2', 'h3', 'p', 'insertorderedlist', 'insertunorderedlist',
    'indent', 'outdent', 'bold', 'italic', 'underline', 'createlink'
  ],
  stay: true
}
```

If you want to customize the toolbar to fit your own project, you can instanciate `Pen` constructor with an `options` object like [#1.3: init with options](https://github.com/sofish/pen#13-init-with-options):

#### 2.1 Fallback for old browser

You can set `defaults.textarea` to a piece of HTML string, by default, it's `<textarea name="content"></textarea>`。This will be set as `innerHTML` of your `#editor`.

#### 2.2 Change the editor class

Pen will add `.pen` to your editor by default, if you want to change the class, make sure to replace the class name `pen` to your own in `src/pen.css`.

#### 2.3 Enable debug mode

If `options.debug` is set to `true`, Pen will output logs to the Console of your browser.

![debugger](https://f.cloud.github.com/assets/153183/1078426/e1d40758-1527-11e3-9a68-12c58225c93c.png)

#### 2.4 Customize the toolbar

You can set `options.list` to an `Array`, add the following strings to make your own:

- `blockquote`, `h2`, `h3`, `p`, `pre`: create a tag as its literal meaning
- `insertorderedlist`: create an `ol>li` list
- `insertunorderedlist`: create a `ul>li` list
- `indent`: indent list / blockquote block
- `outdent`: outdent list / blockquote block
- `bold`: wrap the text selection in a `b` tag
- `italic`: wrap the text selection in an `i` tag
- `underline`: wrap the text selection in a `u` tag
- `createlink`: insert link to the text selection
- `inserthorizontalrule`: insert a `hr` tag

#### 2.5 Prevent unsafe page redirect

By default, Pen will prevent unsafe page redirect when editing, to shut down it, specific `options.stay` to `false`.

__NOTE:__ if `defaults.debug` is set to `true` and `default.stay` is not set: `defaults.stay == !defaults.debug`.

#### 2.6 Disable and Re-enable editor

You can disable the pen editor by call `destroy()` method of the `var pen = new Pen(options)` object. like:

```js
var pen = new Pen('#editor');

pen.destroy(); // return itself
```

And, there's a corresponding method called `rebuild()` to re-enable the editor:

```js
pen.rebuild(); // return itself
```

#### 2.7 Export content as markdown

It's an experimental feature

```js
var pen = new Pen('#editor');

pen.toMd(); // return a markdown string
```


## 3. markdown syntax support

#### 3.1 install
The syntax convertor will be enabled automatically by linking `markdown.js` after `pen.js:

```html
<script src="src/pen.js"></script>
<script src="src/markdown.js"></script>
```

#### 3.2 usage
To use it, you can type `action cmd` + `space key` at a line start. like:

```
### This will create a h3 tag
```

The following cmds are allowed:

- Headings: type 1~6 `#` at the line start
- Unordered List: type `- ` or `* `
- Ordered List: type `1. `
- Code block: type **\`\`\`**
- Block Quote: type `> `
- Horizontal Rule: more than 3 `-`, `*`, `.` will create a `<hr />`, like `......`

## 4. license

Licensed under MIT.

## 5. trusted by *

[![Teambition](https://dn-project-site.qbox.me/images/logo.png)](https://github.com/teambition)
