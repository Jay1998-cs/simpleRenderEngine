import Parser from "./Parser";
import { removeBetweenSpaces } from "../utils/utils";

// 规定只能解析的节点类型：DOM元素 或 纯文本
export enum NodeType {
  Element = 1,
  Text = 3,
}

export type Node = Element | Text;

// DOM元素解析接口
export interface Element {
  tagName: string;
  attributes: Record<string, string>;
  children: Node[];
  nodeType: NodeType.Element;
}

// 文本解析接口
export interface Text {
  nodeValue: string;
  nodeType: NodeType.Text;
}

// DOM元素的初始解析对象(类似空壳/初始模板)
export function element(tagName: string) {
  return {
    tagName,
    attributes: {},
    children: [],
    nodeType: NodeType.Element,
  } as Element;
}

// 文本的解析对象
export function text(str: string) {
  return {
    nodeValue: str,
    nodeType: NodeType.Text,
  } as Text;
}

////////////////////////////////////////////////////////
// * HTML解析器
export default class HTMLParser extends Parser {
  private stack: string[] = [];

  // 0.解析程序入口
  parse(rawText: string) {
    if (typeof rawText !== "string") {
      throw Error("arguments[0] must be type of string");
    }
    // 初始化
    this.rawText = rawText.trim();
    this.len = rawText.length;
    this.index = 0;
    this.stack = [];

    // 创建解析对象的根节点，以保存解析结果
    const root = element("root");

    // 判断是文本还是元素，以选择对应的解析方法
    while (this.index < this.len) {
      this.removeSpaces(); // 删除前导空格' '与换行符'\n'
      if (this.rawText[this.index].startsWith("<")) {
        this.index++; // 跳过标签的开符号"<"，即 div> 再进行后续解析
        this.parseElement(root); // 以"<"开头即标签形式，解析元素
      } else {
        this.parseText(root); // 不以"<"开头，解析文本
      }
    }

    // if (root.children.length) {
    //   return root.children;
    // }
    // 返回解析结果，即保存在root的children属性中的第一个对象(最外层解析节点root)
    return root.children[0]; // children[0]即最外层节点，如html元素
  }

  // 1.解析Text文本，如<p>html<p>会遍历字符直到遇上标签的闭合符号"<",得到"html"
  // -> 问题：如果文本里面包含"<"、">"符号怎么办?
  private parseText(parent: Element) {
    let str: string = "";
    // -> ? 要求字符不能为 < 或 / \
    while (
      this.index < this.len &&
      !(
        this.rawText[this.index] === "<" &&
        /\w|\//.test(this.rawText[this.index + 1])
      )
    ) {
      str += this.rawText[this.index]; // 更新文本
      this.index++; // 更新已遍历过的字符索引
    }
    this.sliceText(); // 删除已遍历过的字符
    str = removeBetweenSpaces(str); // 删除字符之间连续的空格和换行符(最多有一个空格)
    parent.children.push(text(str)); // 保存解析的文本对象到父节点
  }

  // 2.解析DOM元素，先依次解析标签名和属性，再递归解析子节点，直到遍历完所有的HTML文本(rawText)
  private parseElement(parent: Element) {
    const tagName = this.parseTagName(); // 解析标签名
    const elem = element(tagName); // 创建解析对象

    this.stack.push(tagName); // 保存解析的标签名(用于检查前后<name></name>标签名是否一致)

    parent.children.push(elem); //保存解析对象到根节点
    this.parseAttrs(elem); // 解析标签的所有属性

    // 标签形如 <div class='btn show' data-id='text'> hello: <b> JayZ </b> </div>
    // 当解析完标签名、属性、文本之后，下一步【继续解析子元素】，例如 " <b> JayZ </b> "
    while (this.index < this.len) {
      this.removeSpaces();
      // 以"<"开头，可能是一个标签的开始<p>或结束</p>
      if (this.rawText[this.index].startsWith("<")) {
        this.index++; // 跳过"<"
        this.removeSpaces();
        // 遇到标签闭合符号，类似</p>中的/，即当前标签准备解析完成
        if (this.rawText[this.index].startsWith("/")) {
          this.index++; // 跳过"/"
          // 判断左右标签名是否一致
          const startTag = this.stack[this.stack.length - 1];
          const endTag = this.parseTagName(); // 解析闭合部分的标签名，如 b>得到b
          if (startTag !== endTag) {
            // 标签名不一致，抛出错误
            throw Error(
              `The end tagName ${endTag} not euqal to the start tagName ${startTag}`
            );
          }
          // 该标签有误，其解析对象弹栈(丢弃)
          this.stack.pop();
          // 遍历至闭合标签">"，表示当前标签解析完毕<..>xx<../>，后续会删除遍历过的字符
          while (this.index < this.len && this.rawText[this.index] !== ">") {
            this.index++;
          }
          break;
        } else {
          // 遇到标签开始符号 < 且下一个字符不是 /，类似<p>，即解析该元素
          this.parseElement(elem);
        }
      } else {
        // 非"<"开头，遇到文本，解析文本
        this.parseText(elem);
      }
    }

    // ? 当解析对象是标签时，跳过">"，表示当前元素解析完毕；如果是本文时表示跳过"<"；
    this.index++;
  }

  // 3.解析标签名，如 <p>nihao<p> 得到标签名p
  private parseTagName() {
    let tagName: string = ""; // 标签名
    this.removeSpaces(); // 删除前导空格与换行符
    const pattern = new RegExp(/^[0-9a-zA-Z]+$/); // 正则:判断是否为数字或英文字母(大小写)

    // 遍历字符串，获取"<"(解析前已经跳过<符号)与">"之间的内容
    while (
      this.index < this.len &&
      this.rawText[this.index] !== " " &&
      this.rawText[this.index] !== ">"
    ) {
      let s: string = this.rawText[this.index].toLowerCase(); // 统一转为英文小写
      let isValid = pattern.test(s);
      // 意外情况：<di#v>仍然会解析得到标签名div，会跳过非法字符(但不能有空格)，可以增加else语句抛出错误
      if (isValid) {
        tagName += s; // 记录组成标签名的合法字符(英文字母或数字)
      } // else { throw Error('error tagName') }
      this.index++; // 已遍历过当前字符，索引递增
    }

    // 删除已解析过的字符串、返回标签名
    this.sliceText();
    return tagName;
  }

  // 4.遍历标签的所有属性，并依次解析各属性，提取键值对保存到元素的attributes对象中
  private parseAttrs(elem: Element) {
    // 例如，<p id="root" class='show'>xx</p>，遍历字符串直到遇上闭合符号">"
    while (this.index < this.len && this.rawText[this.index] !== ">") {
      this.removeSpaces();
      this.parseAttr(elem); // 解析单个属性及属性值，结束后返回若未终止(没遇到">")则继续往后解析
      this.removeSpaces();
    }
    // 此时index指向闭合符号">"，跳过">"(表示属性解析已完成)，取下一个字符(正常情况下是标签包裹的内容)
    this.index++;
  }

  // 5.解析单个属性，用一个对象保存其属性及属性值，如<p id="root">xx</p>解析为{id: "root"}
  private parseAttr(elem: Element) {
    let attr: string = ""; // 属性名
    let value: string = ""; // 属性值

    // 提取属性名，如class、id等
    while (
      this.index < this.len &&
      this.rawText[this.index] !== "=" &&
      this.rawText[this.index] !== ">"
    ) {
      attr += this.rawText[this.index];
      this.index++;
    }
    this.sliceText(); // 删除已遍历的字符

    // 处理拿到的属性名
    attr = attr.trim(); // 删除前后空格，如" id" -> "id"
    if (!attr) {
      return; // 无属性，结束
    }
    this.index++; // 跳过"="，遍历下一个字符（正常情况下是引号）

    // 获取包裹属性值的引号类型，即单或双引号，作为属性值遍历结束的终点标志 "xx" 或 'yy'
    let mark: string = ""; // 包裹属性值的标志：单或双引号
    let markTypes = ["'", '"']; // 单或双引号
    if (markTypes.includes(this.rawText[this.index])) {
      mark = this.rawText[this.index]; // 获取最后一个单/双引号，后面即为属性值
      this.index++; // 取下一个字符，即属性值的起始字符，如"btn btn-delete" 中的第一个b
    }

    // 提取属性值，如 class="btn btn-delete" 中的 btn btn-delete，即遍历第一个字符b直到遇上闭合引号mark
    while (this.index < this.len && this.rawText[this.index] !== mark) {
      value += this.rawText[this.index];
      this.index++;
    }

    // 处理结果
    this.index++; // 标记属性值的闭合引号为已遍历
    this.sliceText(); // 删除已遍历的字符
    elem.attributes[attr] = value.trim(); // 解析的属性以键值对形式保存到对应元素的attributes对象中
  }
}

/* usage */
// function parse(html: string) {
//   const parser = new HTMLParser();
//   return JSON.stringify(parser.parse(html), null, 4);
// }
/* examples */
// // (1)
// console.log(parse("<html><body><div>test!</div></body></html>"));
// // (2)
// console.log(
//   parse(`
//   <div class="lightblue test" id=" div " data-index="1">test!</div>
// `)
// );
// // (3)
// console.log(
//   parse(`
//   <html>
//       <body id=" body " data-index="1" style="color: red; background: yellow;">
//           <div class="lightblue test">test!</div>
//       </body>
//   </html>
// `)
// );
// // (4)
// console.log(
//   parse(`
//   <html>
//       <body id=" body " data-index="1" style="color: red; background: yellow;">
//           <div class="lightblue test">test!</div>
//           <h1> Hello,<b>JayZ</b> </h1>
//       </body>
//   </html>
// `)
// );
