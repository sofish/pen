# Pen Editor

a light weight WYSIWYG editor

**live demo:** [http://sofish.github.io/pen](http://sofish.github.io/pen)

![preview](https://f.cloud.github.com/assets/153183/1066367/53c4f9fc-13b2-11e3-885a-122b43da1e4e.png)


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
