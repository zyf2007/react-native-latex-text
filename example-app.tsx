import React, { useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MathJaxRenderer, MathJaxRendererRef, MathRenderer, MathText } from './src';

export default function App() {
  const mathJaxRef = useRef<MathJaxRendererRef>(null);
  MathRenderer.Init(mathJaxRef);
  return (
    <View style={styles.container}>
      <MathJaxRenderer
        ref={mathJaxRef}
        initialCache={[]}
        maxCacheSize={50}
        onRenderError={(error, sourceLatex) => {
        console.error('Render error:', error, 'for:', sourceLatex);
        }}
      />

      <View style={styles.content}>
        <Text style={styles.title}>MathJax Demo</Text>

        <MathText
          content="Hello \(a^2 + b^2 = c^2\)"
        />

        <MathText
          content="The integral \( \int_{0}^{1} x^2 dx \) equals \( \frac{1}{3} \)"
        />

        <MathText
          content="Linear equation: \(3x + 4y = 12\)"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  }
});
