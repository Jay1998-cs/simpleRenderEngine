import Parser from "./Parser";

// 选择器，只考虑三种常用选择器：#id、.class、tagName(包括*)，或者它们的组合
export interface Selector {
  tagName: string;
  id: string;
  class: string;
}

// 声明，即CSS样式，如 color: red，由键值对表示CSS样式属性
export interface Declaration {
  name: string;
  value: string | number;
}

// CSS规则，包含两个属性，即选择器数组、声明数组
export interface Rule {
  selectors: Selector[];
  declarations: Declaration[];
}

////////////////////////////////////////////////////////
// * CSS解析器
export default class CSSParser extends Parser {
  private indentifierReg = /\w|-|_/; // 检验选择器名称是否合法(数字、字母、-、_)的正则
  private symbols = ["*", ".", "#"]; // 支持的选择器前缀（通配符、id、class）

  // CSS解析程序入口
  parse(rawText: string) {
    if (typeof rawText !== "string") {
      throw Error("arguments[0] must be typeof string");
    }

    this.rawText = rawText.trim();
    this.len = rawText.length;
    this.index = 0;

    return this.parseRules();
  }

  // 遍历CSS文本，依次解析每一条CSS规则，直到CSS文本即rawText遍历结束
  private parseRules(): Rule[] {
    const rules: Rule[] = []; // 解析的规则结果

    while (this.index < this.len) {
      this.removeSpaces(); // 移除前导空格或换行符
      rules.push(this.parseRule()); // 解析当前规则，直到碰到CSS规则的结束符"}"
      this.index++; // 跳过上条规则的结束符"}"，解析下一条规则
    }

    return rules;
  }

  // 解析一条CSS规则，如 #root, .box { color: red; font-size: 1rem; }
  private parseRule(): Rule {
    const rule: Rule = {
      selectors: [], // 选择器对象数组
      declarations: [], // 声明(CSS样式键值对)数组
    };

    rule.selectors = this.parseSelectors(); // 解析应用当前规则的所有选择器
    rule.declarations = this.parseDeclarations(); // 解析当前规则的所有声明

    return rule;
  }

  // 解析一条CSS规则的所有选择器，如 #root, .box
  private parseSelectors(): Selector[] {
    const selectors: Selector[] = [];

    // 依次解析每一个选择器，直到遇上结束标志即"{"
    while (this.index < this.len) {
      this.removeSpaces();
      const s = this.rawText[this.index]; // 获取选择器的第一个字符

      // 根据第一个字符进入不同的处理函数
      if (this.indentifierReg.test(s) || this.symbols.includes(s)) {
        // 合法且支持解析的选择器前缀
        selectors.push(this.parseSelector()); // 解析、获取选择器（直到遇上","终止）
        this.index++; // 跳过已获取的选择器的分隔符","，解析下一个选择器名
      } else if (s === "{") {
        // 声明的起始符号，表示选择器已解析完毕
        this.index++; // 跳过“{”，进入CSS声明的解析
        break; // 结束
      }
    }

    return selectors;
  }

  // 解析不同类型的CSS选择器
  private parseSelector(): Selector {
    const selector: Selector = {
      tagName: "",
      id: "",
      class: "",
    };

    // 根据首字符即选择器的前缀，判断是哪一种选择器，并保存对应值
    const prefix = this.rawText[this.index];
    switch (prefix) {
      case "*":
        this.index++; // 跳过"*" (表示已遍历，后续会删除)
        selector.tagName = "*"; // 标记为“通配符选择器”
        break;
      case ".":
        this.index++; // 跳过"."，如".btn"得到"btn"
        selector.class = this.parseIdentifier(); // class选择器
        break;
      case "#":
        this.index++; // 跳过"#"，如"#root"得到"root"
        selector.id = this.parseIdentifier(); // id选择器
        break;
      default:
        selector.tagName = this.parseIdentifier(); // 选择器名等于标签名，如"div"
        break;
    }

    return selector;
  }

  // 解析一个标识符(选择器名，或属性名)
  private parseIdentifier(): string {
    let name: string = "";

    // 提取一个标识符(由数字、字母、-、_组成)，直到遇上其他字符，如分隔符","、";"、"{"
    while (
      this.index < this.len &&
      this.indentifierReg.test(this.rawText[this.index])
    ) {
      name += this.rawText[this.index];
      this.index++; // 取下一个字符
    }

    this.sliceText(); // 删除已遍历过的字符
    return name;
  }

  // 解析一条CSS规则的所有CSS属性声明，如 { color: red; font-size: 1rem; }
  private parseDeclarations(): Declaration[] {
    const declarations: Declaration[] = [];
    // 解析 { ...若干声明... } 中的每一条声明，直到遇到结束符"}" (注: "{" 已在parseSelectors()中跳过)
    while (this.index < this.len && this.rawText[this.index] !== "}") {
      declarations.push(this.parseDeclaration());
    }
    return declarations; // 返回一条CSS规则的声明，后面还剩下规则的结束符"}"，在parseRules()处删除
  }

  // 解析一条CSS属性声明，例如 color: red;
  private parseDeclaration(): Declaration {
    const declaration: Declaration = {
      name: "",
      value: "",
    };
    this.removeSpaces();
    // 获取属性名
    declaration.name = this.parseIdentifier(); // 如 color
    // 寻找并跳过属性名和属性值的分隔符":"
    while (this.index < this.len && this.rawText[this.index] !== ":") {
      this.index++;
    }
    this.index++; // 跳过":"
    this.removeSpaces(); // 删除属性值之前的空格或换行符
    // 获取属性值
    declaration.value = this.parseValue();
    this.removeSpaces();
    // 返回一条声明
    return declaration;
  }

  // 解析CSS属性值
  private parseValue(): string {
    let val: string = "";

    // 提取属性值，直到遇上结束符号";"
    while (this.index < this.len && this.rawText[this.index] !== ";") {
      val += this.rawText[this.index];
      this.index++;
    }
    this.index++; // 跳过";"，属性值已提取完毕，删除该条属性的分隔符

    this.sliceText(); // 删除已遍历过的字符
    return val.trim(); // 返回属性值，例如 "red"
  }
}

/* usage */
// function parse(css: string) {
//   const parser = new CSSParser();
//   return JSON.stringify(parser.parse(css), null, 4);
// }

/* example */
// (1)
// console.log(
//   parse(`
//     .class-div,
//     .class-div2 {
//         font-size: 14px;
//     }
// `)
// );
// (2);
// console.log(
//   parse(`
//     div,
//     *,
//     .class-div,
//     #id-div {
//         font-size: 14px;
//         position: relative;
//         width: 100%;
//         height: 100%;
//         background: rgba(0, 0, 0, 1);
//         margin-bottom: 20px;
//         padding: 20px;
//         border: 1px;
//         margin: 15px;
//     }

//     div {
//         font-size: 16px;
//     }

//     body {
//         font-size: 88px;
//         color: #000;
//         padding: 20px;
//         border: 1px solid red;
//         margin: 15px;
//     }
// `)
// );
