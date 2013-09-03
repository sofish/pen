# Pen Editor

![pen - preview](https://f.cloud.github.com/assets/153183/1070081/7f7b588c-1440-11e3-9389-ce1104b442be.png)

**LIVE DEMO:** [http://sofish.github.io/pen](http://sofish.github.io/pen)

## 1. INSTALL

### 1.1 init with an id attribute

```js
var editor = new Pen('#editor');
```

### 1.2 init with an element

```js
var editor = new Pen(documenty.getElementById('#editor'));
```

### 1.3 init with an options

```js
var options = {
  editor: document.body, // {DOM Element} [required]
  class: 'pen', // {String} class of the editor,
  debug: 'false', // {Debug} false by default
  list: ['bold', 'italic', 'underline'] // editor menu list
}

var editor = new Pen(options);
```

## 2. CONFIG

The following object makes the default setting of Pen:

```js
defaults = {
  class: 'pen',
  debug: false,
  list: ['blockquote', 'h2', 'h3', 'p', 'insertorderedlist', 'insertunorderedlist', 'indent', 'outdent', 'bold', 'italic', 'underline', 'createlink']
}
```

If you want to customize the toolbar to fit your own project, you can change pass an `options` obj to `Pen` constructor like [#1.3: init with an options](https://github.com/sofish/pen#13-init-with-an-options):

### 2.1 Change the editor class

Pen will add `.pen` to your editor by default, if you want to change the class, make sure to replace the class name `pen` to your own in `src/pen.css`.

### 2.2 Enable debug mode

If the `options.debug` set to `true`, Pen will output logs to the Console of your browser.

### 2.3 Customize the toolbar

You can set `options.list` to an `Array`, add the following strings to make your own:

- `blockquote`, `h2`, `h3`, `p`: create tag as it's literal meaning
- `insertorderedlist`: create an `ol>li` list
- `insertunorderedlist`: create an `ul>li` list
- `indent`: indent list / blockquote block
- `outdent`: outdent list / blockquote block
- `bold`: wrap the text of the selection in a `b` tag
- `italic`: wrap the text of the selection in a `i` tag
- `underline`: wrap the text of the selection in a `u` tag
- `createlink`: insert link the the text of the selection
