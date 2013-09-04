# Pen Editor

- **LIVE DEMO:** [http://sofish.github.io/pen](http://sofish.github.io/pen)
- **Markdown is supported**

![pen - preview](https://f.cloud.github.com/assets/153183/1070081/7f7b588c-1440-11e3-9389-ce1104b442be.png)

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
  textarea: '<textarea name="content"></textarea>',
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
  list: ['blockquote', 'h2', 'h3', 'p', 'insertorderedlist', 'insertunorderedlist', 'indent', 'outdent', 'bold', 'italic', 'underline', 'createlink']
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

## 3. markdown syntax support

Install the `markdown.js` after `pen.js`, and it will be enabled automaticly.

```html
<script src="src/pen.js"></script>
<script src="src/markdown.js"></script>
```

Heading / ol / ul / blockquote / pre is supported, the corresponding string is `#` (1 to 6), `1.`, `-` or `*`, `>` and `\`\`\``.

## 4. license

Licensed under MIT.
