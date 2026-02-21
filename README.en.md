# react-native-latex-text

[English](./README.en.md) | [中文](./README.md)

A lightweight, high-performance React Native component supporting mixed text and LaTeX rendering. It features custom delimiters, automatic line height calculation, and is based on MathJax SVG with built-in caching and zero native dependencies (available in Expo Go).

---

## How It Works?

The `MathJaxRenderer` component creates a hidden 1x1 WebView at the root level to load the MathJax library and render formulas. It sends the SVG-XML string back to React Native via `postMessage`, using native components for high-performance display.

Since this approach doesn't rely on custom native code, it runs out-of-the-box in **Expo Go**.

The `MathText` component uses regular expressions to extract LaTeX parts, renders them individually, calculates dimensions, and stitches them back together with regular text seamlessly.

---

## Getting Started

### 1. Initialization

Import `MathJaxRenderer` at your project's root (e.g., `_layout.tsx` or `App.tsx`) and initialize the global `MathRenderer` using its ref:

```tsx
// _layout.tsx
import React, { useRef } from 'react';
import { View } from 'react-native';
import { MathJaxRenderer, MathJaxRendererRef, MathRenderer, MathText } from 'react-native-latex-text';

export default function App() {
  // 1. Create a ref for MathJaxRenderer
  const mathJaxRef = useRef<MathJaxRendererRef>(null);
  
  // 2. Initialize the global renderer
  MathRenderer.Init(mathJaxRef);

  return (
    <View style={{ flex: 1, padding: 20 }}>
       {/* 3. Core renderer component (Hidden) */}
      <MathJaxRenderer 
        ref={mathJaxRef} 
        maxCacheSize={50} 
      />
      
      {/* Your App Content */}
      <MathText content="Welcome to $\LaTeX$!" />
    </View>
  );
}

```

### 2. Rendering Formulas

Use the `MathText` component anywhere in your project to render text mixed with formulas:

```tsx
import { MathText } from 'react-native-latex-text';

<MathText
  content='Block Formula: \[\int_0^2 x^3 dx\] Inline Formula: Calculate $E = \frac{F}{q}$. If $q = 2×10^{-6}C$ and $F = 4×10^{-3}N$, what is $E$?'
  textColor='#FFFFFF'
/>

```

---

## Features

* 🚀 **High Performance**: Built-in formula caching to prevent redundant rendering.
* 🎨 **Custom Styling**: Supports custom colors, sizes, and line heights for formulas.
* ✨ **Hybrid Rendering**: Seamlessly mixes LaTeX formulas with standard text.
* 🎯 **Flexible Config**: Supports custom delimiters and adjustable cache sizes.

---

## Installation

### Prerequisites

Ensure your project has the following peer dependencies installed:

```bash
npm install react-native-svg react-native-webview
# or
yarn add react-native-svg react-native-webview

```

### Main Package

```bash
npm install react-native-latex-text
# or
yarn add react-native-latex-text

```

### Additional Setup (iOS)

For iOS, you need to install the cocoapods for the dependencies:

```bash
cd ios && pod install && cd ..

```

*No additional configuration is required for Android.*

---

## API Documentation

### 1. MathJaxRenderer

Must be included in the root component. It handles the underlying rendering logic.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `initialCache` | `string[]` | `[]` | List of formulas to pre-render (improves first-load speed). |
| `initialCacheColor` | `string` | `black` | Default color for pre-rendered formulas. |
| `maxCacheSize` | `number` | `100` | Max number of cached formulas (LRU logic). |
| `onRenderComplete` | `Function` | - | Callback when a formula finishes rendering. |
| `onReady` | `() => void` | - | Callback when the renderer is initialized. |

### 2. MathText

The component used to display mixed content.

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `string` | - | Text containing LaTeX (Required). |
| `style` | `TextStyle` | - | Style for the regular text. |
| `mathStyle` | `ViewStyle` | - | Container style for the formulas. |
| `textColor` | `string` | `#000000` | Text color. |
| `mathColor` | `string` | `textColor` | Formula color. |
| `baseMathSize` | `number` | `10` | Scale multiplier for formula rendering. |
| `lineHeight` | `number` | `1.5` | Global line height. |
| `delimiters` | `Object` | (See below) | Custom formula delimiters. |

#### Default Delimiters

```ts
{
  inline: [
    { left: '\\(', right: '\\)' },
    { left: '$', right: '$' },
  ],
  display: [
    { left: '\\[', right: '\\]' },
    { left: '$$', right: '$$' },
  ],
}

```

---

## Advanced Usage

### Custom Delimiters

```tsx
<MathText
  content="Custom: %a^2+b^2=c^2% or %%\\int x dx%%"
  delimiters={{
    inline: [{ left: '%', right: '%' }],
    display: [{ left: '%%', right: '%%' }],
  }}
/>

```

### Manual Cache Control

```tsx
// Clear cache for a specific formula
mathJaxRef.current?.clearCache('a^2 + b^2 = c^2', '#0066cc');

// Clear all cache
MathRenderer.ClearCache();

```

---

## Important Notes

1. `MathJaxRenderer` **must** be rendered before `MathText`.
2. There might be a slight delay during the very first render while MathJax loads; use `initialCache` for common formulas to mitigate this.
3. Block formulas (`\[...\]`) will take up a full line, while inline formulas (`$...$`) stay within the text flow.

## License

MIT

---

**Would you like me to generate a specific TypeScript example for a complex layout using this library?**