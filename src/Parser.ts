// 解析器父类
export default class Parser {
  protected rawText = "";
  protected index = 0;
  protected len = 0;

  // 寻找第一个非空、非换行的字符
  protected removeSpaces() {
    while (
      this.index < this.len &&
      (this.rawText[this.index] === " " || this.rawText[this.index] === "\n")
    ) {
      this.index++; // 寻找第一个非空和换行的字符的下标
    }
    this.sliceText(); // 删除空格和换行符，保留剩余字符
  }

  // 分割文本，保留index起到末尾的的字符(未遍历/解析过的字符串)
  protected sliceText() {
    this.rawText = this.rawText.slice(this.index); // 分割字符串
    this.len = this.rawText.length; // 更新分割后的字符串长度
    this.index = 0; // 初始化索引
  }
}
