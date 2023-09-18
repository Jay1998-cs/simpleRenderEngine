import { EdegeSizes } from "./type";

// 内容盒子
export default class Rect {
  x: number;
  y: number;
  width: number;
  height: number;

  // 初始化【内容盒子】左上角位置(x,y)及整个CSS盒模型的宽高(因为子元素相对于内容盒子定位)
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
  }

  // 计算内容盒子位置及整个盒模型的宽高(edege可为padding、border和margin)
  expandedBy(edge: EdegeSizes) {
    const rect = new Rect();
    // 内容盒子的左上角坐标 = 盒子坐标 - padding - border - margin
    rect.x = this.x - edge.left;
    rect.y = this.y - edge.top;
    // 盒子宽高 = 内容宽高 + padding + border + margin
    rect.width = this.width + edge.left + edge.right;
    rect.height = this.height + edge.top + edge.bottom;
    // 返回
    return rect;
  }
}
