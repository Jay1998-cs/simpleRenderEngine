import { StyleNode, getStyleTree } from "../styleTree";
import { Display } from "./type";
import { getDisplayValue } from "../../utils/utils";
import BoxDimensions from "./BoxDimensions";
import LayoutBox from "./LayoutBox";

// 导出模块
export { BoxDimensions };

//////////////////////////
// 程序入口
export function getLayoutTree(styleNode: StyleNode, parentBox: BoxDimensions) {
  parentBox.content.height = 0; // 【初始化父容器高度为0，后续由子元素撑起】

  const root = buildLayoutTree(styleNode); // 自顶向下，递归构建所有布局节点
  root.layout(parentBox); // 计算每个布局节点的布局(尺寸和位置)信息
  return root; // 返回布局树
}

// 递归地遍历每一个节点Node，构建其布局节点，返回未计算布局信息的布局树
function buildLayoutTree(styleNode: StyleNode): LayoutBox {
  if (getDisplayValue(styleNode) === Display.None) {
    throw new Error("root display: none which can not build tree");
  }

  const layoutTree = new LayoutBox(styleNode); // 布局节点(树)

  if (!styleNode.children) {
    return;
  }

  // DFS构建后代元素的布局节点
  let anonymousBox: LayoutBox | undefined; // 内联元素的容器
  for (const child of styleNode.children) {
    const childDisplay = getDisplayValue(child);
    if (childDisplay === Display.None) {
      // display: none
      continue; // 跳过隐藏的元素
    }
    if (childDisplay === Display.Block) {
      // display: block
      anonymousBox = undefined;
      layoutTree.children.push(buildLayoutTree(child)); // 创建块级元素的布局节点并存入到布局树
    } else {
      // display: inline
      if (!anonymousBox) {
        // 创建匿名容器作为内联元素(可能多个)的布局节点，其本质也是布局树，只不过挂载的是内联元素的布局节点
        anonymousBox = new LayoutBox();
        layoutTree.children.push(anonymousBox); // 将内联元素的匿名容器添加到整体布局树中
      }
      anonymousBox.children.push(buildLayoutTree(child)); // 创建内联元素的布局节点，并存入匿名容器
    }
  }

  return layoutTree;
}

/* usage and example */
// import HTMLParser from "../HTMLParser";
// import CSSParser from "../CSSParser";

// function parseHTML(html: string) {
//   const parser = new HTMLParser();
//   return parser.parse(html);
// }
// function parseCSS(css: string) {
//   const parser = new CSSParser();
//   return parser.parse(css);
// }
// const domTree = parseHTML(`
//             <html>
//                 <body id=" body " data-index="1" style="color: red; background: yellow;">
//                     <div class="lightblue test">test!</div>
//                 </body>
//             </html>
//         `);
// const cssRules = parseCSS(`
//             * {
//                 display: block;
//             }

//             div {
//                 font-size: 14px;
//                 position: relative;
//                 width: 400px;
//                 height: 400px;
//                 background: rgba(0, 0, 0, 1);
//                 margin-bottom: 20px;
//                 display: block;
//             }

//             .lightblue {
//                 font-size: 16px;
//                 display: block;
//             }

//             body {
//                 display: block;
//                 font-size: 88px;
//                 color: #000;
//                 height: 500px;
//                 padding: 20px;
//                 border: 1px solid red;
//                 margin: 15px;
//             }
//         `);
// // test
// const dimensions = new BoxDimensions();
// dimensions.content.width = 800;
// dimensions.content.height = 600;
// const styleNode: StyleNode = getStyleTree(domTree, cssRules);

// console.log(JSON.stringify(getLayoutTree(styleNode, dimensions), null, 4));
