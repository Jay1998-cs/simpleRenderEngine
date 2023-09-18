import { Canvas, CanvasRenderingContext2D, createCanvas } from "canvas";
import { getStyleValueByLayoutNode } from "../utils/utils";
import LayoutBox from "./layout/LayoutBox";
import { NodeType } from "./HTMLParser";
import { createWriteStream } from "fs";

//////////////
// 程序入口
export default function painting(layoutBox: LayoutBox, outputPath = "") {
  const { x, y, width, height } = layoutBox.boxDimensions.content;
  // 创建二维画布
  const canvas = createCanvas(width, height) as Canvas;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(x, y, width, height);
  // 绘制布局元素
  renderlayoutElem(layoutBox, ctx);
  // 输出绘制结果PNG图片
  createPNG(canvas, outputPath);
}

// * 遍历布局树，迭代绘制每一个布局元素
function renderlayoutElem(
  layoutBox: LayoutBox,
  ctx: CanvasRenderingContext2D,
  parent?: LayoutBox
) {
  // 绘制当前元素
  renderBackground(layoutBox, ctx);
  renderBorder(layoutBox, ctx);
  renderText(layoutBox, ctx, parent);
  // 绘制后代
  if (!layoutBox.children || layoutBox.children.length === 0) {
    return;
  }
  for (const child of layoutBox.children) {
    renderlayoutElem(child, ctx, layoutBox);
  }
}

// 绘制背景颜色
function renderBackground(layoutBox: LayoutBox, ctx: CanvasRenderingContext2D) {
  const { x, y, width, height } = layoutBox.boxDimensions.borderBox();
  const bgColor1 = getStyleValueByLayoutNode(layoutBox, "background-color");
  const bgColor2 = getStyleValueByLayoutNode(layoutBox, "background").split(
    " "
  )[0];
  ctx.fillStyle = bgColor1 || bgColor2 || "#fff"; // 默认背景色白色
  ctx.fillRect(x, y, width, height);
}

// 绘制边框
function renderBorder(layoutBox: LayoutBox, ctx: CanvasRenderingContext2D) {
  const { x, y, width, height } = layoutBox.boxDimensions.borderBox();
  const { top, right, bottom, left } = layoutBox.boxDimensions.border;
  const borderColor1 = getStyleValueByLayoutNode(layoutBox, "border-color");
  const borderColor2 = getStyleValueByLayoutNode(layoutBox, "border").split(
    " "
  )[0];
  if (!borderColor1 || !borderColor2) {
    return;
  }

  ctx.fillStyle = borderColor1 || borderColor2;
  // left
  ctx.fillRect(x, y, left, height);
  // top
  ctx.fillRect(x, y, width, top);
  // right
  ctx.fillRect(x + width - right, y, right, height);
  // bottom
  ctx.fillRect(x, y + height - bottom, width, bottom);
}

// 绘制文本
function renderText(
  layoutBox: LayoutBox,
  ctx: CanvasRenderingContext2D,
  parent?: LayoutBox
) {
  if (layoutBox.styleNode?.node?.nodeType === NodeType.Text) {
    const { x = 0, y = 0, width } = parent?.boxDimensions.content || {};
    const styles = layoutBox.styleNode?.values || {};
    const fontSize = styles["font-size"] || "14px";
    const fontFamily = styles["font-family"] || "serif";
    const fontWeight = styles["font-weight"] || "normal";
    const fontStyle = styles["font-style"] || "normal";

    ctx.fillStyle = styles.color || "#000"; // 默认黑色字体
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`;
    ctx.fillText(
      layoutBox.styleNode?.node?.nodeValue,
      x,
      y + parseInt(fontSize),
      width
    );
  }
}

// 输出渲染结果图
function createPNG(canvas: Canvas, outputPath: string) {
  canvas.createPNGStream().pipe(createWriteStream(outputPath));
}
