# Pen Editor
> what you see is what you get


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

### 2. Demo

```bash
git clone git@github.com:sofish/pen.git
```

open: `index.html`;