# react-native-latex-text
[English](./README.en.md) | [中文](./README.md)

一个轻量、高性能的 React Native 组件，支持文字与 Latex 公式混排/自定义公式分隔符，自动计算公式行高，基于 MathJax SVG，内置缓存，无原生依赖（可直接在 Expo Go 中运行）。

# How It Works?
MathJaxRenderer 组件会在根节点创建一个隐藏的 1*1 的 WebView 组件，用于加载 MathJax 库和渲染公式，并通过 postMessage 将 svg-xml 字符串返回给 React Native，并使用原生组件实现高性能渲染。
因此，这种渲染方式不依赖任何原生组件，可以直接在 Expo Go 中运行。  

MathText 组件通过正则表达式将文本中的公式部分提取出来，分别渲染并计算行高，最后将普通文本与渲染后的公式拼接起来。

# 使用方法
## 初始化：
在项目的根节点（比如最外层的 _layout.tsx）中引入 MathJaxRenderer 组件，并用其 ref 初始化全局 MathRenderer：
```tsx
// _layout.tsx
import React, { useRef } from 'react';
import { View } from 'react-native';
import { MathJaxRenderer, MathJaxRendererRef, MathRenderer, MathText } from 'react-native-latex-text';

export default function App() {
  // 1. 创建 MathJaxRenderer 引用
  const mathJaxRef = useRef<MathJaxRendererRef>(null);
  
  // 2. 初始化全局渲染器
  MathRenderer.Init(mathJaxRef);

  return (
    <View style={{ flex: 1, padding: 20 }}>
       {/* 3. 渲染器核心组件（隐藏式） */}
      <MathJaxRenderer 
        ref={mathJaxRef} 
        maxCacheSize={50} 
      />
    </View>
  );
}
```
## 渲染公式：
在项目的任意位置，直接使用 MathText 组件渲染带公式的文本：
```tsx
import { MathText } from 'react-native-latex-text';



<MathText
  content='块级公式：求以下定积分的结果：\[\int_0^2 x^3 dx\] 行内公式：计算电场强度\(\vec{E} = \frac{\vec{F}}{q}\)，若试探电荷\(q = 2×10^{-6}C\)，受到的电场力\(\vec{F} = 4×10^{-3}N\)，则电场强度的大小为？'
  textColor='#FFFFFF'
/>
```
![渲染效果](./mathrender.gif)

## 特性
- 🚀 **高性能**：内置公式缓存机制，避免重复渲染
- 🎨 **自定义样式**：支持公式颜色、大小、行高自定义
- ✨ **混合渲染**：公式与普通文本无缝混合显示
- 🎯 **灵活配置**：支持自定义公式分隔符、缓存大小等

## 安装

### 前提依赖
确保你的项目已安装以下依赖：
```bash
npm install react-native-svg react-native-webview
# 或使用 yarn
yarn add react-native-svg react-native-webview
```

### 安装主包
```bash
npm install react-native-latex-text
# 或使用 yarn
yarn add react-native-latex-text
```

### 额外配置（Android/iOS）
- **iOS**：执行 `pod install`
```bash
  cd ios && pod install && cd ..
 ```
- **Android**：无需额外配置

## 快速开始

### 基础用法


## API 文档

### 1. MathJaxRenderer（核心渲染器）
必须在应用根组件中引入，负责公式的底层渲染（隐藏式组件）。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `initialCache` | `string[]` | `[]` | 初始化时预渲染的公式列表（提升首次渲染速度） |
| `initialCacheColor` | `string` | `black` | 预渲染公式的默认颜色 |
| `maxCacheSize` | `number` | `100` | 公式缓存最大数量（超出自动清除最早缓存） |
| `onRenderComplete` | `(result: RenderResult, latex: string, color: string) => void` | - | 公式渲染完成回调 |
| `onRenderError` | `(error: string, latex: string, color: string) => void` | - | 公式渲染失败回调 |
| `onReady` | `() => void` | - | 渲染器初始化完成回调 |

#### 暴露的方法（通过 ref 调用）
| 方法 | 参数 | 说明 |
|------|------|------|
| `render` | `(latex: string, onComplete, options?)` | 手动渲染单个公式 |
| `clearCache` | `(latex?: string, color?: string)` | 清除缓存（不传参清除所有，传 latex 清除该公式所有颜色，传 latex+color 清除指定缓存） |
| `getCacheSize` | - | 获取当前缓存数量 |
| `isReady` | - | 判断渲染器是否就绪 |

### 2. MathText（文本+公式渲染组件）
用于显示混合了普通文本和数学公式的内容。

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `content` | `string` | - | 包含公式的文本内容（必填） |
| `style` | `TextStyle` | - | 普通文本样式 |
| `mathStyle` | `ViewStyle` | - | 公式容器样式 |
| `textColor` | `string` | `#000000` | 普通文本颜色 |
| `mathColor` | `string` | 同 textColor | 公式颜色 |
| `baseMathSize` | `number` | `10` | 公式渲染大小放大倍率 |
| `lineHeight` | `number` | `1.5` | 全局行高（文本+公式） |
| `textLineHeight` | `number` | 同 lineHeight | 文本单独行高 |
| `mathLineHeight` | `number` | 同 lineHeight | 公式单独行高 |
| `delimiters` | `{ inline: {left, right}[], display: {left, right}[] }` | 见下方默认值 | 公式分隔符配置 |

#### 默认分隔符
```ts
{
  inline: [ // 行内公式分隔符
    { left: '\\(', right: '\\)' },
    { left: '$', right: '$' },
  ],
  display: [ // 块级公式分隔符
    { left: '\\[', right: '\\]' },
    { left: '$$', right: '$$' },
  ],
}
```

### 3. MathRenderer（全局渲染工具类）
提供全局公式渲染方法。

| 静态方法 | 参数 | 说明 |
|----------|------|------|
| `Init` | `ref: React.RefObject<MathJaxRendererRef>` | 初始化全局渲染器 |
| `Render` | `(latex: string, onComplete, options)` | 全局渲染公式 |
| `ClearCache` | - | 清除所有公式缓存 |

## 高级用法

### 1. 自定义公式分隔符
```tsx
<MathText
  content="自定义分隔符示例：%a^2+b^2=c^2% 或 %%\\int_{0}^{1}x^2dx%%"
  delimiters={{
    inline: [{ left: '%', right: '%' }],
    display: [{ left: '%%', right: '%%' }],
  }}
/>
```

### 2. 手动控制缓存
```tsx
// 清除指定公式的缓存
mathJaxRef.current?.clearCache('a^2 + b^2 = c^2', '#0066cc');

// 清除所有缓存
MathRenderer.ClearCache();

// 获取当前缓存大小
console.log('缓存数量：', mathJaxRef.current?.getCacheSize());
```

### 3. 调试模式
开启调试日志（修改源码中 `DEBUG_MATH_RENDERER` 为 `true`）：
```ts
// 在对应文件顶部修改
const DEBUG_MATH_RENDERER = true;
```

## 注意事项
1. `MathJaxRenderer` 必须在 `MathText` 之前渲染，建议放在应用根组件
2. 首次渲染可能有轻微延迟（一打开应用可能会看到 [公式加载中] ，为 MathJax 脚本加载时间），建议使用 `initialCache` 预渲染常用公式
3. 确保 `react-native-webview` 和 `react-native-svg` 版本与 React Native 兼容
4. 块级公式会独占一行，行内公式与文本同行显示

## 许可证
MIT

## 贡献
欢迎提交 Issue 和 PR。
```