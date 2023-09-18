import type { Declaration, Rule, Selector } from "./CSSParser";
import type { Node, Element } from "./HTMLParser";
import { NodeType, element } from "./HTMLParser";

interface AnyObject {
  [key: string]: any;
}

// 可继承的CSS属性(只取两个为例)
const inheritableAttrs = ["color", "font-size"];

// 样式节点，由解析后的DOM节点、CSS样式值、孩子构成
export interface StyleNode {
  node: Node; // 解析的DOM对象
  values: AnyObject; // CSS键值对属性组成的对象
  children: StyleNode[]; // 后代,StyleNode数组,每一项为StyleNode类型
}

// * 获取DOM元素的CSS内联样式(如"color: red; font-szie: 14px")，以键值对形式组成一个对象返回
function getInlineStyle(styleText: string): AnyObject {
  styleText = styleText.trim(); // 内敛样式文本
  if (!styleText) {
    return {};
  }
  // 得到声明数组，如["color: red", "font-size: 14px"]
  const styleList = styleText.split(";"); // CSS每一条声明以";"为分隔符
  if (!styleList.length) {
    return {};
  }
  // 遍历每一条声明，保存css样式属性及其值到对象中，最后返回该内敛样式对象
  return styleList.reduce((styleObj: AnyObject, item: string) => {
    const data = item.split(":"); // 得到CSS属性及其值，如 color : red
    let name: string = data[0]; // css属性名，如color
    let value: string = data[1]; // css属性值，如red
    if (data.length === 2 && name && value) {
      styleObj[name.trim()] = value.trim(); // 存储css样式属性到对象中，如{ color:red }
    }
    return styleObj;
  }, {});
}

// * 从父样式节点中获取可继承的CSS样式值(如color、font-size)
function getIneritableAttrValues(parent?: StyleNode): AnyObject {
  if (!parent) {
    return {};
  }
  const keys = Object.keys(parent.values); // 父节点的样式属性
  if (keys.length === 0) {
    return {};
  }
  return keys.reduce((inheritableAttrObj, key) => {
    // 遍历父节点的样式属性，如果是可继承的CSS属性，则保存到可继承的样式对象中
    if (inheritableAttrs.includes(key)) {
      inheritableAttrObj[key] = parent.values[key];
    }
    return inheritableAttrObj; // 返回子节点可继承的样式属性对象
  }, {});
}

// * 查询DOM解析树，及其CSS选择器，判断是否存在匹配的选择器
function isMatch(elem: Element, selectors: Selector[]): boolean {
  // 遍历每一个选择器
  return selectors.some((selector) => {
    // 通配符，匹配所有
    if (selector.tagName === "*") {
      return true;
    }
    // 标签名匹配
    if (selector.tagName === elem.tagName) {
      return true;
    }
    // id匹配
    if (selector.id === elem.attributes?.id) {
      return true;
    }
    // class类名匹配
    if (elem.attributes?.class) {
      const elemClassList = elem.attributes.class.split(" ").filter(Boolean); // DOM解析对象的类名
      const cssClassList = selector.class.split(" ").filter(Boolean); // CSS解析对象选择器的类名
      for (const className of elemClassList) {
        if (cssClassList.includes(className)) {
          return true; // 若存在匹配的类名，返回true
        }
      }
    }
    // 不匹配
    return false;
  });
}

// * 样式数组转换为对象, [{...}, ..., {...}] -> {......}
function cssValuesToObject(declarations: Declaration[]): AnyObject {
  // 遍历每一条声明，如 {name: "color", value: "red" }，提取键值对保存到对象，最后返回该对象
  return declarations.reduce(
    (styleObj: AnyObject, declaration: Declaration) => {
      styleObj[declaration.name] = declaration.value;
      return styleObj;
    },
    {}
  );
}

// * 从CSS解析树中寻找与DOM元素匹配的选择器，然后提取样式，返回样式对象(css属性键值对组成)
function getStyleValues(
  elem: Node,
  cssRules: Rule[],
  parent?: StyleNode
): AnyObject {
  // 获取可继承的样式对象,如{color: red, font-size:14px}
  const inheritableAttrObj = getIneritableAttrValues(parent);

  // 文本节点继承父类的可继承样式，且文本没有自定义样式，故直接返回
  // (因为文本不是标签，通常是标签包裹的内容，只能通过父类标签定义样式来使得文本具有样式)
  if (elem.nodeType === NodeType.Text) {
    return inheritableAttrObj;
  }

  // 元素节点，遍历每一条CSS规则，查询该规则的CSS选择器是否与该元素的tagName、id和class等匹配
  return cssRules.reduce((styleObj: AnyObject, rule) => {
    if (isMatch(elem as Element, rule.selectors)) {
      // DOM元素与当前规则的选择器匹配(只要匹配一种则该CSS规则生效)，获取对应CSS样式声明declarations，合并到样式对象
      styleObj = { ...styleObj, ...cssValuesToObject(rule.declarations) }; // 合并: 即重写操作，后定义优先【但忽略了!important和选择器优先级】
    }
    return styleObj; // 返回elem(DOM解析对象)的样式
  }, inheritableAttrObj);
}

// * 通过DOM解析树和CSS解析树，构建并返回样式节点
function getStyleNode(
  elem: Node,
  cssRules: Rule[],
  parent?: StyleNode
): StyleNode {
  // 样式树，含三个属性
  const styleNode: StyleNode = {
    node: elem, // DOM解析树
    values: getStyleValues(elem, cssRules, parent), // 从CSS解析树中寻找匹配的选择器以提取样式(declarations)
    children: [], // 各个后代的样式树
  };

  // 处理元素节点的内联样式，合并到values属性(可能会重写已有的CSS样式，因为内联样式优先级较高)
  if (elem.nodeType === NodeType.Element) {
    // 合并CSS内联样式，保存到values属性
    if (elem.attributes.style) {
      styleNode.values = {
        ...styleNode.values,
        ...getInlineStyle(elem.attributes.style),
      };
    }

    // 依次处理每个子元素(文本节点无后代)，获取它们的样式树
    styleNode.children = elem.children.map((child) =>
      getStyleNode(child, cssRules, styleNode)
    ) as unknown as StyleNode[];
  }

  return styleNode; // 返回当前elem(DOM解析树)的样式树
}

//////////////////////////////////////////////
// 程序入口: 接收三个参数，解析的DOM树、解析的CSS规则、样式节点(样式树)
export function getStyleTree(
  elem: Node,
  cssRules: Rule[],
  parent?: StyleNode
): StyleNode {
  // 接收DOM解析树，构建并返回其样式树
  return getStyleNode(elem, cssRules, parent);
}

// export function getStyleTree(
//   elem: Node | Node[],
//   cssRules: Rule[],
//   parent?: StyleNode
// ) {
//   if (Array.isArray(elem)) {
//     // DOM解析对象数组，遍历每一个元素，依次构建其样式节点，最后组成数组返回
//     return elem.map((elem) => getStyleNode(elem, cssRules, parent));
//   } else {
//     // 单个DOM解析对象，构建其样式树(节点)并返回
//     return getStyleNode(elem, cssRules, parent);
//   }
// }

/* usage and example*/
// import HTMLParser from "./HTMLParser";
// import CSSParser from "./CSSParser";
// function parseHTML(html) {
//   const parser = new HTMLParser();
//   return parser.parse(html);
// }
// function parseCSS(css) {
//   const parser = new CSSParser();
//   return parser.parse(css);
// }
// const domTree = parseHTML(`
//     <html>
//         <body id=" body " data-index="1" style="color: red; background: yellow;">
//             <div class="lightblue test">test!</div>
//         </body>
//     </html>
// `);
// const cssRules = parseCSS(`
//     * {
//         display: block;
//     }
//     div {
//         font-size: 14px;
//         position: relative;
//         width: 100%;
//         height: 100%;
//         background: rgba(0, 0, 0, 1);
//         margin-bottom: 20px;
//     }
//     .lightblue {
//         font-size: 16px;
//     }
//     body {
//         font-size: 88px;
//         color: #000;
//     }
// `);
// console.log(JSON.stringify(getStyleTree(domTree, cssRules), null, 4));
