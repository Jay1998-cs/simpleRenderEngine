import LayoutBox from "../src/layout/LayoutBox";
import { BoxType, Display } from "../src/layout/type";
import { StyleNode } from "../src/styleTree";

// 删除字符之间多余的空格或换行符，只保留一个，例如removeBetweenSpaces("1  2  3 \n  4 5") 结果得"1 2 3 4 5"
export function removeBetweenSpaces(str: string): string {
  let index: number = 0;
  const len = str.length;
  let hasSpace: boolean = false;
  const symbols = [" ", "\n"];
  let res: string = "";

  while (index < len) {
    let s = str[index];
    if (symbols.includes(s)) {
      // 只要遇到空格或换行符，hasSpace就设为true，并且只添加一个空格
      // （例如，当遇到连续空格或换行符时，hasSpace为true，就不会增加空格）
      if (!hasSpace) {
        hasSpace = true;
        res += " ";
      }
    } else {
      // 只有遇到非空格和换行符时，才修改hasSpace标志
      res += s;
      hasSpace = false;
    }
    ++index;
  }

  return res;
}

// 数组求和
export function sum(...args: (string | number)[]) {
  return args.reduce((prev: number, cur: string | number) => {
    if (cur === "auto") {
      return prev;
    }

    return prev + parseInt(String(cur));
  }, 0) as number;
}

// 将val取值转换为number类型
export function transformValueSafe(val: number | string) {
  if (val === "auto") return 0;
  return parseInt(String(val));
}

// 获取样式节点的display属性值，如果没有则默认设为 Inline Box
export function getDisplayValue(styleNode: StyleNode) {
  return styleNode.values?.display ?? Display.Inline;
}

// 获取盒子的类型：匿名、内联、块
export function getBoxType(styleNode?: StyleNode) {
  if (!styleNode) return BoxType.AnonymousBox;

  const display = getDisplayValue(styleNode);

  if (display === Display.Block) return BoxType.BlockBox;
  return BoxType.InlineBox;
}

// 输入布局节点，获取某个css属性值
export function getStyleValueByLayoutNode(
  layoutNode: LayoutBox,
  key: string
): string {
  return layoutNode.styleNode?.values[key] ?? "";
}
