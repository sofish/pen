# # Pen Editor

**live demo:** [http://sofish.github.io/pen](http://sofish.github.io/pen)

![pen - preview](https://f.cloud.github.com/assets/153183/1070081/7f7b588c-1440-11e3-9389-ce1104b442be.png)


## 1. Config

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
{
  editor: document.body, // {DOM Element} [required]
  class: 'pen', // {String} class of the editor,
  debug: 'false', // {Debug} false by default
  list: ['bold', 'italic', 'underline'] // editor menu list
}
```
