import Rect from "./Rect";
import { EdegeSizes } from "./type";

// CSS盒子
export default class BoxDimensions {
  content: Rect;
  padding: EdegeSizes;
  border: EdegeSizes;
  margin: EdegeSizes;

  // 初始化盒子内容、内边距、边框、外边距
  constructor() {
    const initValue: EdegeSizes = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };

    this.content = new Rect();
    this.padding = { ...initValue };
    this.border = { ...initValue };
    this.margin = { ...initValue };
  }

  paddingBox() {
    return this.content.expandedBy(this.padding);
  }

  borderBox() {
    return this.paddingBox().expandedBy(this.border);
  }

  marginBox() {
    return this.borderBox().expandedBy(this.margin);
  }
}
