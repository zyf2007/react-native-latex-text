import { MathJaxRendererRef, RenderOptions, RenderResult } from "./MathJaxRenderer";
import React from "react";

// 调试开关 - 默认关闭
const DEBUG_MATH_RENDERER = false;

export class MathRenderer{
    private static mathJaxRef:React.RefObject<MathJaxRendererRef|null> | null = null;
    public static Init(ref:React.RefObject<MathJaxRendererRef|null>) {
        this.mathJaxRef = ref;
    }   
    public static Render(latex:string, onComplete:(result:RenderResult)=>void, options:RenderOptions){
        if(this.mathJaxRef?.current){
            this.mathJaxRef.current.render(latex, onComplete, options);
        }
    }
    public static ClearCache() {
        if(this.mathJaxRef?.current){
            this.mathJaxRef.current.clearCache();
            if (DEBUG_MATH_RENDERER) {
                console.log('Cache cleared, size:', this.mathJaxRef.current.getCacheSize());
            }
        }
    }
}