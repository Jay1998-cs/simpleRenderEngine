import BoxDimensions from "./BoxDimensions";
import { BoxType, KEYS } from "./type";
import { StyleNode } from "../styleTree";
import { getBoxType, sum, transformValueSafe } from "../../utils/utils";

// 构建布局树
export default class LayoutBox {
  // 布局节点组成：盒子类型、盒子尺寸信息、后代布局信息、样式节点
  boxType: BoxType;
  boxDimensions: BoxDimensions; // css盒子尺寸信息，即盒子的content、padding、border和margin
  children: LayoutBox[];
  styleNode: StyleNode | undefined;

  // 构造函数，接收一个参数：样式树
  constructor(styleNode?: StyleNode) {
    this.boxType = getBoxType(styleNode);
    this.boxDimensions = new BoxDimensions();
    this.children = [];
    this.styleNode = styleNode;
  }

  ////////////////////////////////////////////////
  // 计算布局
  layout(parentBox: BoxDimensions) {
    // 非内联盒子
    if (this.boxType !== BoxType.InlineBox) {
      // 计算块级盒子的宽度
      this.calculateBoxWidth(parentBox);
      // 计算块级盒子的位置
      this.calculateBoxPosition(parentBox);
      // 计算块级盒子后代的布局，以及更新父内容盒子的高度(加上子元素的盒模型高)
      this.calculateChildrenLayout();
      // 如果设置了height值，则采用其值作为盒高，否则盒高由内容(后代)撑开
      this.setBlockBoxHeightIfDefined();
    }
  }

  // * 计算块级盒子的宽度(取决于父节点,故自上而下遍历树以获取父节点宽度来设置子节点宽度)、包括计算左右外边距
  protected calculateBoxWidth(parentBox: BoxDimensions) {
    const parentContentWidth = parentBox.content.width; // 父容器内容宽度即后代元素可占宽度
    const styleValues = this.styleNode?.values || {}; // 当前布局节点的样式

    // 获取布局节点的width、padding、border、margin
    let width = styleValues.width ?? KEYS.auto; // 无wdith值，默认为auto
    const isWidthAuto = width === KEYS.auto;

    let paddingLeft = styleValues[KEYS.pl] || styleValues.padding || 0;
    let paddingRight = styleValues[KEYS.pr] || styleValues.padding || 0;

    let borderLeft = styleValues[KEYS.bl] || styleValues.border || 0;
    let borderRight = styleValues[KEYS.br] || styleValues.border || 0;

    let marginLeft = styleValues[KEYS.ml] || styleValues.margin || 0;
    let marginRight = styleValues[KEYS.mr] || styleValues.margin || 0;
    const isMarginLeftAuto = marginLeft === KEYS.auto;
    const isMarginRightAuto = marginRight === KEYS.auto;

    // 布局节点的总宽度
    let nodeTotalWidth = sum(
      width,
      paddingLeft,
      paddingRight,
      borderLeft,
      borderRight,
      marginLeft,
      marginRight
    );

    // 布局节点的宽度超过父容器宽度，将其外边距设为0
    if (!isWidthAuto && nodeTotalWidth > parentContentWidth) {
      if (isMarginLeftAuto) {
        marginLeft = 0;
      }
      if (isMarginRightAuto) {
        marginRight = 0;
      }
    }

    // 根据父子元素宽度的差值来调整当前布局节点的宽度和外边距，以适应父节点的宽度【块级元素独占一行】
    const undeflow = parentContentWidth - nodeTotalWidth;
    if (!isWidthAuto && !isMarginLeftAuto && !isMarginRightAuto) {
      // 布局节点的宽度固定、左右外边距固定，则将差值填充到右外边距(因为从左到右进行布局)
      marginRight += undeflow;
    } else if (!isWidthAuto && !isMarginLeftAuto && isMarginRightAuto) {
      // 宽度和左外边距固定、右外边距自适应，则右外边距撑满父容器宽度
      marginRight = undeflow;
    } else if (!isWidthAuto && isMarginLeftAuto && !isMarginRightAuto) {
      // 宽度和右外边距固定、左外边距自适应，则左外边距撑满父容器宽度
      marginLeft = undeflow;
    } else if (isWidthAuto) {
      // 宽度自适应，左右外边距固定，先外边距设为0以防止溢出
      if (isMarginLeftAuto) {
        marginLeft = 0;
      }
      if (isMarginRightAuto) {
        marginRight = 0;
      }
      // 判断是否超过父容器宽度，以重新设置布局节点宽度和外边距
      if (undeflow > 0) {
        // 父容器宽度大于布局节点宽度，拓展布局节点宽度等于父容器宽度(且margin为0)
        width = undeflow;
      } else {
        // 父容器宽度小于布局节点宽度，即溢出，宽度设为0、用右边距填充父容器全部宽度
        width = 0;
        marginRight += undeflow;
      }
    } else if (!isWidthAuto && isMarginLeftAuto && isMarginRightAuto) {
      // 宽度固定，左右外边距自适应(设为差值的一半，类似margin:auto居中)
      marginLeft = undeflow / 2;
      marginRight = undeflow / 2;
    }

    // 更新布局节点的宽度信息
    this.boxDimensions.content.width = parseInt(width);

    this.boxDimensions.padding.left = parseInt(paddingLeft);
    this.boxDimensions.padding.right = parseInt(paddingRight);

    this.boxDimensions.border.left = parseInt(borderLeft);
    this.boxDimensions.border.right = parseInt(borderRight);

    this.boxDimensions.margin.left = parseInt(marginLeft);
    this.boxDimensions.margin.right = parseInt(marginRight);
  }

  // * 计算块级盒子的位置和高度(计算内容盒子的左下角坐标(x, y)和各top、bottom)
  protected calculateBoxPosition(parentBox: BoxDimensions) {
    const { x, y, height } = parentBox.content; // 父节点内容盒子的位置及高度，如(0,0)，800
    const styleValues = this.styleNode?.values || {}; // 布局节点的样式

    // 上下padding
    this.boxDimensions.padding.top = transformValueSafe(
      styleValues[KEYS.pt] || styleValues.padding || 0
    );
    this.boxDimensions.padding.bottom = transformValueSafe(
      styleValues[KEYS.pb] || styleValues.padding || 0
    );
    // 上下border
    this.boxDimensions.border.top = transformValueSafe(
      styleValues[KEYS.bt] || styleValues.border || 0
    );
    this.boxDimensions.border.bottom = transformValueSafe(
      styleValues[KEYS.bb] || styleValues.border || 0
    );
    // 上下margin
    this.boxDimensions.margin.top = transformValueSafe(
      styleValues[KEYS.mt] || styleValues.margin || 0
    );
    this.boxDimensions.margin.bottom = transformValueSafe(
      styleValues[KEYS.mb] || styleValues.margin || 0
    );

    // 布局节点的内容盒子的左上角坐标(x, y)
    this.boxDimensions.content.x =
      x +
      this.boxDimensions.padding.left +
      this.boxDimensions.border.left +
      this.boxDimensions.margin.left;
    this.boxDimensions.content.y =
      y +
      height +
      this.boxDimensions.padding.top +
      this.boxDimensions.border.top +
      this.boxDimensions.margin.top;
  }

  // * 计算块级盒子后代的布局，并更新其父容器高度
  protected calculateChildrenLayout() {
    // 遍历子节点
    for (const child of this.children) {
      // 计算子节点的布局
      child.layout(this.boxDimensions);
      // 更细父容器内容的默认高度 = 父内容高 + 子外边距盒子(即节点的整个CSS盒模型)的高度
      this.boxDimensions.content.height +=
        child.boxDimensions.marginBox().height;
    }
  }

  // * 如果CSS声明了布局节点height的高度，则使用其值作为盒子高度，否则由子元素撑起的高度作为其height
  protected setBlockBoxHeightIfDefined() {
    // 默认由子元素撑起高度(即在calculateChildrenLayout()计算出来的父节点的高度)
    const height = this.styleNode?.values.height;
    if (height) {
      this.boxDimensions.content.height = parseInt(height); // 【注意：需要将字符串"400px"解析为数值400】
    }
  }
}
