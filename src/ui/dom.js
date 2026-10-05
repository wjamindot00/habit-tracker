// 화면 모듈들이 같이 쓰는 DOM 도우미.

export function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}
