const RENDER_TO_DOM = Symbol("render to dom");

export class Component {
  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
    this._range = null;
  }

  get vdom() {
    return this.render().vdom;
  }

  get vchildren() {
    return this.children.map((child) => child.vdom);
  }

  setAttribute(name, value) {
    this.props[name] = value;
  }

  appendChild(component) {
    this.children.push(component);
  }

  [RENDER_TO_DOM](range) {
    this._range = range;
    this._vdom = this.vdom; // 缓存当前 vdom
    this._vdom[RENDER_TO_DOM](range);
  }

  // rerender() {
  //   let oldRange = this._range;

  //   let range = document.createRange();
  //   range.setStart(oldRange.startContainer, oldRange.startOffset);
  //   range.setEnd(oldRange.startContainer, oldRange.startOffset);
  //   this[RENDER_TO_DOM](range);

  //   oldRange.setStart(range.endContainer, range.endOffset);
  //   oldRange.deleteContents();
  // }

  setState(newState) {
    if (this.state === null || typeof this.state !== "object") {
      this.state = newState;
      this.rerender();
      return;
    }

    let merge = (oldState, newState) => {
      for (let i in newState) {
        if (oldState[i] === null || typeof oldState[i] !== "object") {
          oldState[i] = newState[i];
        } else {
          merge(oldState[i], newState[i]);
        }
      }
    };

    merge(this.state, newState);
    this.rerender();
  }
}

class ElementWrapper extends Component {
  constructor(type) {
    super();
    this.type = type;
    this.root = document.createElement(type);
  }

  [RENDER_TO_DOM](range) {
    range.deleteContents();

    let root = document.createElement(this.type);
    // console.log(this.type);

    for (let name in this.props) {
      const value = this.props[name];
      // [\s\S] 表示所有字符
      if (name.match(/^on([\s\S]+)/)) {
        root.addEventListener(
          RegExp.$1.replace(/^[\s\S]/, (c) => c.toLowerCase()),
          value
        );
      } else {
        if (name === "className") {
          root.setAttribute("class", value);
        } else {
          root.setAttribute(name, value);
        }
      }
    }

    for (let child of this.children) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_TO_DOM](childRange);
    }

    range.insertNode(root);
  }

  get vdom() {
    return this;
  }
}

class TextWrapper extends Component {
  constructor(content) {
    super();
    this.type = "#text";
    this.content = content;
    this.root = document.createTextNode(content);
  }

  [RENDER_TO_DOM](range) {
    range.deleteContents();
    range.insertNode(this.root);
  }

  get vdom() {
    return this;
  }
}

export function createElement(type, attributes, ...children) {
  let ele;
  if (typeof type === "string") {
    ele = new ElementWrapper(type);
  } else {
    ele = new type();
  }

  // 添加属性
  for (let attr in attributes) {
    ele.setAttribute(attr, attributes[attr]);
  }

  // 添加子节点
  const insertChildren = (children) => {
    for (let child of children) {
      if (typeof child === "string") {
        child = new TextWrapper(child);
      }

      if (child === null) continue;

      if (typeof child === "object" && child instanceof Array) {
        insertChildren(child);
      } else {
        ele.appendChild(child);
      }
    }
  };
  insertChildren(children);

  return ele;
}

export function render(component, parentElement) {
  let range = document.createRange();
  range.setStart(parentElement, 0);
  range.setEnd(parentElement, parentElement.childNodes.length);
  range.deleteContents();

  component[RENDER_TO_DOM](range);
}
