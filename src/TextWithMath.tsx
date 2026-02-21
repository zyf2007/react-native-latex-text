// TextWithMath.tsx
import { RenderResult } from './MathJaxRenderer';
import { MathRenderer } from './GlobalMathRenderer';
import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle
} from 'react-native';
import { SvgXml } from 'react-native-svg';

export interface MathTextProps {
  content: string;
  style?: TextStyle;
  mathStyle?: ViewStyle;
  textColor?: string;
  mathColor?: string;
  baseMathSize?: number;
  lineHeight?: number;      
  textLineHeight?: number;  
  mathLineHeight?: number;  
  delimiters?: {
    inline: { left: string; right: string }[];
    display: { left: string; right: string }[];
  };
}

// 默认支持的公式分隔符
const DEFAULT_DELIMITERS = {
  inline: [
    { left: '\\(', right: '\\)' },
    { left: '$', right: '$' },
  ],
  display: [
    { left: '\\[', right: '\\]' },
    { left: '$$', right: '$$' },
  ],
};

const buildRegex = (delimiters: typeof DEFAULT_DELIMITERS): RegExp => {
  const patterns: string[] = [];
  
  delimiters.display.forEach(d => {
    const left = d.left.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const right = d.right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patterns.push(`(${left})([\\s\\S]*?)(${right})`);
  });
  
  delimiters.inline.forEach(d => {
    const left = d.left.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const right = d.right.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    patterns.push(`(${left})([\\s\\S]*?)(${right})`);
  });
  
  return new RegExp(patterns.join('|'), 'g');
};

type Segment = 
  | { type: 'text'; content: string }
  | { type: 'math'; content: string; display: boolean; delimiter: string };

interface MathItem {
  id: string;
  latex: string;
  display: boolean;
  svg: RenderResult | null;
}

export const MathText: React.FC<MathTextProps> = ({
  content,
  style,
  mathStyle,
  textColor = '#000000',
  mathColor,
  baseMathSize = 10,
  lineHeight = 1.5,
  textLineHeight,
  mathLineHeight,
  delimiters = DEFAULT_DELIMITERS,
}) => {
  const finalMathColor = mathColor || textColor;
  const finalTextLineHeight = textLineHeight || lineHeight;
  const finalMathLineHeight = mathLineHeight || lineHeight;
  
  const [mathItems, setMathItems] = useState<Map<string, MathItem>>(new Map());
  const regex = React.useMemo(() => buildRegex(delimiters), [delimiters]);

  // 获取字体大小（从 style 或默认）
  const fontSize = style?.fontSize || 16;
  
  // 计算实际行高（像素值）
  const textLineHeightValue = fontSize * finalTextLineHeight;
  const mathLineHeightValue = fontSize * finalMathLineHeight;

  const parseContent = useCallback((): Segment[] => {
    const segments: Segment[] = [];
    let lastIndex = 0;
    let match;

    regex.lastIndex = 0;

    while ((match = regex.exec(content)) !== null) {
      let matchedContent: string = '';
      let isDisplay: boolean = false;
      let delimiter: string = '';
      
      let groupIndex = 1;
      let found = false;
      
      for (let i = 0; i < delimiters.display.length; i++) {
        if (match[groupIndex] !== undefined) {
          matchedContent = match[groupIndex + 1];
          isDisplay = true;
          delimiter = delimiters.display[i].left + '...' + delimiters.display[i].right;
          found = true;
          break;
        }
        groupIndex += 3;
      }
      
      if (!found) {
        for (let i = 0; i < delimiters.inline.length; i++) {
          if (match[groupIndex] !== undefined) {
            matchedContent = match[groupIndex + 1];
            isDisplay = false;
            delimiter = delimiters.inline[i].left + '...' + delimiters.inline[i].right;
            found = true;
            break;
          }
          groupIndex += 3;
        }
      }

      if (!found) continue;

      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: content.slice(lastIndex, match.index),
        });
      }

      segments.push({
        type: 'math',
        content: matchedContent.trim(),
        display: isDisplay,
        delimiter,
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      segments.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }

    return segments;
  }, [content, regex, delimiters]);

  const renderMath = useCallback((id: string, latex: string, display: boolean) => {
    MathRenderer.Render(
      latex,
      (result) => {
        setMathItems(prev => {
          const next = new Map(prev);
          next.set(id, { id, latex, display, svg: result });
          return next;
        });
      },
      { color: finalMathColor }
    );
  }, [finalMathColor]);

  const segments = parseContent();
  
  useEffect(() => {
    segments.forEach((seg, index) => {
      if (seg.type === 'math') {
        const id = `${index}::${seg.content}::${finalMathColor}`;
        
        if (!mathItems.has(id)) {
          setMathItems(prev => {
            if (prev.has(id)) return prev;
            const next = new Map(prev);
            next.set(id, { id, latex: seg.content, display: seg.display, svg: null });
            return next;
          });
          
          renderMath(id, seg.content, seg.display);
        }
      }
    });
  }, [segments, finalMathColor, renderMath, mathItems]);

  const renderSegment = (seg: Segment, index: number) => {
    if (seg.type === 'text') {
      return (
        <Text 
          key={`text-${index}`} 
          style={[ 
            { 
              color: textColor, 
              fontSize,
              lineHeight: textLineHeightValue,
            }, 
            style
          ]}
        >
          {seg.content}
        </Text>
      );
    }

    const id = `${index}::${seg.content}::${finalMathColor}`;
    const mathItem = mathItems.get(id);

    if (!mathItem || !mathItem.svg) {
      return (
        <View 
          key={`math-${index}`} 
          style={[
            styles.mathPlaceholder,
            mathStyle,
            !seg.display && { height: fontSize * 0.8 } // 行内占位高度
          ]}
        >
          <Text style={[styles.loadingText, { color: textColor }]}>
            {seg.display ? '[公式加载中...]' : '[公式]'}
          </Text>
        </View>
      );
    }

    const { svg, width, height } = mathItem.svg;
    const scale = seg.display ? baseMathSize * 1.1 : baseMathSize;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;

    return (
      <View 
        key={`math-${index}`}
        style={[
          {    justifyContent: 'center',alignItems: 'center',},
          !seg.display && {height: mathLineHeightValue*height*0.45,},
          mathStyle
        ]}
      >
        <SvgXml
          xml={svg}
          width={scaledWidth}
          height={scaledHeight}
        />
      </View>
    );
  };

  const renderAll = () => {
    const result: React.ReactNode[] = [];
    let currentLine: React.ReactNode[] = [];
    let lineIndex = 0;
    
    const flushLine = () => {
      if (currentLine.length > 0) {
        result.push(
          <View 
            key={`line-${lineIndex}`} 
            style={[
              styles.line,
              { minHeight: textLineHeightValue }  // 确保行高一致
            ]}
          >
            {currentLine}
          </View>
        );
        currentLine = [];
        lineIndex++;
      }
    };

    segments.forEach((seg, index) => {
      if (seg.type === 'math' && seg.display) {
        flushLine();
        result.push(
          <View 
            key={`block-${index}`} 
            style={[
              styles.blockMathContainer,
              { 
                marginVertical: 2,
                minHeight: mathLineHeightValue * 1.2  // 块级公式给更多空间
              }
            ]}
          >
            {renderSegment(seg, index)}
          </View>
        );
      } else {
        // 检查是否需要换行（文本中包含换行符）
        if (seg.type === 'text' && seg.content.includes('\\n')) {
          const parts = seg.content.split('\\n');
          parts.forEach((part, partIndex) => {
            if (partIndex > 0) {
              flushLine(); // 换行符处强制换行
            }
            if (part.length > 0) {
              currentLine.push(
                <Text 
                  key={`text-${index}-${partIndex}`} 
                  style={[
                    { 
                      color: textColor, 
                      fontSize,
                      lineHeight: textLineHeightValue,
                    }, 
                    style
                  ]}
                >
                  {part}
                </Text>
              );
            }
          });
        } else {
          currentLine.push(renderSegment(seg, index));
        }
      }
    });

    flushLine();
    return result;
  };

  return (
    <View style={{flexDirection: 'column'}}>
      {renderAll()}
    </View>
  );
};

const styles = StyleSheet.create({

  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    width: '100%',
  },
  blockMathContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mathPlaceholder: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 20,
    minHeight: 20,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.5,
  },
});

export default MathText;