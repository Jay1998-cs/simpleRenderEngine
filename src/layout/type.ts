// CSS盒子类型
export enum BoxType {
  BlockBox = "BlockBox",
  InlineBox = "InlineBox",
  AnonymousBox = "AnonymousBox",
}

// padding、border和margin的位置信息，例如top表示padding-top的取值(和position中的lrtb无关)
export interface EdegeSizes {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// 定义display属性值(不支持flex等其他属性)
export enum Display {
  Inline = "inline",
  Block = "block",
  None = "none",
}

// 布局关键词
export const KEYS = {
  auto: "auto",

  ml: "margin-left",
  mr: "margin-right",
  mt: "margin-top",
  mb: "margin-bottom",

  pl: "padding-left",
  pr: "padding-right",
  pt: "padding-top",
  pb: "padding-bottom",

  bl: "border-left",
  br: "border-right",
  bt: "border-top",
  bb: "border-bottom",
};
