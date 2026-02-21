import { texSvgEncoded } from '../tex-svg';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

// 调试开关 - 默认关闭
const DEBUG_MATH_RENDERER = false;

export interface RenderResult {
  svg: string;
  width: number;
  height: number;
  viewBox: string | null;
}

export interface RenderOptions {
  color?: string; 
}

export interface MathJaxRendererRef {
  render: (latex: string, onComplete: (result: RenderResult) => void, options?: RenderOptions) => void;
  clearCache: (latex?: string, color?: string) => void;
  getCacheSize: () => number;
  isReady: () => boolean;
}

interface MathJaxRendererProps {
  initialCache?: string[];
  initialCacheColor?: string;
  maxCacheSize?: number;
  onRenderComplete?: (result: RenderResult, latex: string, color: string) => void;
  onRenderError?: (error: string, latex: string, color: string) => void;
  onReady?: () => void;
}

interface QueueItem {
  latex: string;
  onComplete: (result: RenderResult) => void;
  color: string;
  cacheKey: string;
}

export const MathJaxRenderer = forwardRef<MathJaxRendererRef, MathJaxRendererProps>(
  (
    {
      initialCache = [],
      initialCacheColor = 'black',
      maxCacheSize = 100,
      onRenderComplete,
      onRenderError,
      onReady,
    },
    ref
  ) => {
    const [ready, setReady] = useState(false);
    const scriptRef = useRef<string | null>(null);
    const webViewRef = useRef<WebView>(null);
    const cacheRef = useRef<Map<string, RenderResult>>(new Map());
    const queueRef = useRef<QueueItem[]>([]);
    const currentRef = useRef<QueueItem | null>(null);
    const [jaxReady, setJaxReady] = useState(false);

    const getCacheKey = useCallback((latex: string, color: string): string => {
      return `${latex}::${color}`;
    }, []);

    const decodeBase64 = (base64: string) => {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    };

    // 加载 MathJax 脚本
    useEffect(() => {
      const load = async () => {
        try {
          let content: string;

          if (Platform.OS === 'android') {
            content = decodeBase64(texSvgEncoded);
          } else if (Platform.OS === 'ios') {
            content = decodeBase64(texSvgEncoded);
          } else {
            throw new Error('Unsupported platform');
          }
          scriptRef.current = content;
          setReady(true);
          onReady?.();
          if (DEBUG_MATH_RENDERER) {
            console.log('[MathJaxRenderer] MathJax Loaded')
          }
        } catch (err) {
          if (DEBUG_MATH_RENDERER) {
            console.error('Failed to load MathJax:', err);
          }
        }
      };
      load();
    }, [onReady]);

    // 预渲染 initialCache
    useEffect(() => {
      if (ready && initialCache.length > 0) {
        initialCache.forEach((latex) => {
          const cacheKey = getCacheKey(latex, initialCacheColor);
          if (!cacheRef.current.has(cacheKey)) {
            setTimeout(() => {
              render(latex, () => { }, { color: initialCacheColor });
            }, 0);
          }
        });
      }
    }, [ready, initialCache, initialCacheColor, getCacheKey]);

    // 生成 HTML
    const generateHTML = useCallback((): string => {
      if (!scriptRef.current) throw new Error('MathJax not loaded');

      return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>
window.MathJax = {
  svg: { fontCache: 'none', scale: 1.2 },
  tex: { inlineMath: [['$','$'], ['\\\\(','\\\\)']] },
  startup: {
    pageReady: () => MathJax.startup.defaultPageReady().then(() => {
      window.render = async (latex, color) => {
        try {
          const svg = await MathJax.tex2svgPromise(latex, {display: true});
          const el = svg.querySelector('svg');
          let html = el.outerHTML.replace(/currentColor/g, color || 'black');
          if (!html.includes('xmlns=')) html = html.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg "');
          return { 
            success: true, 
            svg: html, 
            w: el.getAttribute('width'), 
            h: el.getAttribute('height'),
            vb: el.getAttribute('viewBox')
          };
        } catch(e) {
          return { success: false, error: e.message };
        }
      };
      window.onMathJaxReady && window.onMathJaxReady();
    })
  }
};
</script>
<script>${scriptRef.current}</script>
</head>
<body style="margin:0;padding:0">
<div id="out"></div>
<script>
window.onMathJaxReady = () => {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
};

window.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'render') {
    render(data.latex, data.color).then(r => {
      document.getElementById('out').innerHTML = r.svg || '';
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        type: 'result', 
        ...r 
      }));
    });
  }
});
</script>
</body>
</html>`;
    }, []);

    // 处理队列
    const processQueue = useCallback(() => {
      if (DEBUG_MATH_RENDERER) {
        console.log('[MathJaxRenderer] Process queue:', queueRef.current.length, "currentRef.current", currentRef.current?.cacheKey);
      }
      if (queueRef.current.length === 0) {
        if (DEBUG_MATH_RENDERER) {
          console.log('[MathJaxRenderer] Render Finished - Queue empty, no more items to process.');
        }
        return;
      }

      const next = queueRef.current.shift()!;
      currentRef.current = next;
      if (DEBUG_MATH_RENDERER) {
        console.log('[MathJaxRenderer] Injecting:', 'cacheKey:', next.cacheKey);
      }
      webViewRef.current?.injectJavaScript(`
        window.postMessage(JSON.stringify({
          type: 'render',
          latex: ${JSON.stringify(next.latex)},
          color: ${JSON.stringify(next.color)}
        }));
        true;
      `);
    }, []);

    // 渲染方法
    const render = useCallback((
      latex: string,
      onComplete: (result: RenderResult) => void,
      options?: RenderOptions
    ) => {
      const color = options?.color || 'black';
      const cacheKey = getCacheKey(latex, color);

      if (DEBUG_MATH_RENDERER) {
        console.log('[MathJaxRenderer] Cache check:', 'cacheKey:', cacheKey);
      }

      // 检查缓存
      if (cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey);
        if (DEBUG_MATH_RENDERER) {
          console.log('[MathJaxRenderer] Cache hit:', cacheKey, cached?.svg.slice(0, 25), '...');
        }
        onComplete(cached as RenderResult);
        onRenderComplete?.(cached as RenderResult, latex, color);
        return;
      }

      if (DEBUG_MATH_RENDERER) {
        console.log('[MathJaxRenderer] Cache miss:', cacheKey);
      }

      // 加入队列
      queueRef.current.push({ latex, onComplete, color, cacheKey });
      if (DEBUG_MATH_RENDERER) {
        console.log('[MathJaxRenderer] Queue pushed:', cacheKey);
      }

      // 尝试处理队列
      if (!currentRef.current) {
        if (!jaxReady) {
          if (DEBUG_MATH_RENDERER) {
            console.log('[MathJaxRenderer] Not ready yet, waiting for MathJax to load.');
          }
          return;
        }
        if (DEBUG_MATH_RENDERER) {
          console.log('[MathJaxRenderer] Render Idle, start processing queue.');
        }
        processQueue();
      } else {
        if (DEBUG_MATH_RENDERER) {
          console.log('[MathJaxRenderer] Render Busy, waiting for:', queueRef.current.length);
        }
      }

    }, [onRenderComplete, processQueue, getCacheKey, jaxReady]);

    // 处理队列：MathJax 加载完成后延迟处理
    useEffect(() => {
      if (!currentRef.current && queueRef.current.length > 0 && jaxReady) {
        if (DEBUG_MATH_RENDERER) {
          console.log('[MathJaxRenderer] MathJax Ready, Start Processing queue:', queueRef.current.length);
        }
        setTimeout(() => {
          processQueue();
        }, 5000);
      }
    }, [jaxReady, processQueue]);

    // 处理 WebView 消息
    const handleMessage = useCallback((event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (DEBUG_MATH_RENDERER) {
          console.log('[MathJaxRenderer] Message received:', data.type);
        }
        if (data.type === 'ready') {
          setJaxReady(true);
          return;
        }

        if (data.type === 'result') {
          const current = currentRef.current;
          if (!current) return;

          // 清空当前正在渲染的项
          currentRef.current = null;

          if (data.success) {
            const result: RenderResult = {
              svg: data.svg,
              width: Number(data.w.replace('ex', '')),
              height: Number(data.h.replace('ex', '')),
              viewBox: data.vb || null,
            };

            // 存入缓存，控制缓存大小
            if (cacheRef.current.size >= maxCacheSize) {
              const firstKey = cacheRef.current.keys().next().value;
              cacheRef.current.delete(firstKey as string);
            }
            cacheRef.current.set(current.cacheKey, result);
            if (DEBUG_MATH_RENDERER) {
              console.log('[MathJaxRenderer] RenderFinished - Cache stored:', current.cacheKey, result.svg.slice(0, 15), '...');
            }
            current.onComplete(result);
            onRenderComplete?.(result, current.latex, current.color);
          } else {
            if (DEBUG_MATH_RENDERER) {
              console.error('[MathJaxRenderer] RenderFailed:', data.error, current.latex, current.color);
            }
            onRenderError?.(data.error, current.latex, current.color);
          }

          // 继续处理队列中的下一个
          setTimeout(() => {
            processQueue();
          }, 2);

        }
      } catch (e) {
        if (DEBUG_MATH_RENDERER) {
          console.error('Failed to handle message:', e);
        }
        currentRef.current = null;
        processQueue();
      }
    }, [maxCacheSize, onRenderComplete, onRenderError, processQueue]);

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
      render,
      clearCache: (latex?: string, color?: string) => {
        if (latex) {
          if (color) {
            // 清除指定公式和颜色的缓存
            const cacheKey = getCacheKey(latex, color);
            cacheRef.current.delete(cacheKey);
            if (DEBUG_MATH_RENDERER) {
              console.log('[MathJaxRenderer] Cache cleared for:', cacheKey);
            }
          } else {
            // 清除该公式所有颜色的缓存
            const keysToDelete: string[] = [];
            for (const key of cacheRef.current.keys()) {
              if (key.startsWith(`${latex}::`)) {
                keysToDelete.push(key);
              }
            }
            keysToDelete.forEach(key => cacheRef.current.delete(key));
            if (DEBUG_MATH_RENDERER) {
              console.log('[MathJaxRenderer] Cache cleared for all colors of:', latex, 'count:', keysToDelete.length);
            }
          }
        } else {
          // 清除所有缓存
          cacheRef.current.clear();
          if (DEBUG_MATH_RENDERER) {
            console.log('[MathJaxRenderer] All cache cleared');
          }
        }
      },
      getCacheSize: () => cacheRef.current.size,
      isReady: () => ready,
    }), [render, ready, getCacheKey]);

    if (!ready) {
      return null;
    }

    return (
      <View style={styles.hidden}>
        <WebView
          ref={webViewRef}
          source={{ html: generateHTML() }}
          onMessage={handleMessage}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={{ width: 1, height: 1, opacity: 0 }}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden',
    opacity: 0,
  },
});

MathJaxRenderer.displayName = 'MathJaxRenderer';
export default MathJaxRenderer;