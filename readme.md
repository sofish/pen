# Pen Editor
> what you see is what you get

**live demo:** [http://sofish.github.io/pen](http://sofish.github.io/pen)

### 1. Config

#### 1. init with an id attribute

```js
var editor = new Pen('#editor');
```

#### 2. init with an element

```js
var editor = new Pen(documenty.getElementById('#editor'));
```

#### 3. init with an options

```js
{
  editor: document.body, // {DOM Element} [required]
  class: 'pen', // {String} class of the editor,
  debug: 'false', // {Debug} false by default
  list: ['bold', 'italic', 'underline'] // editor menu list
}
```
