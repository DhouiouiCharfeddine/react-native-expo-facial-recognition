/**
 * Real-time benchmark display component
 * Shows performance metrics overlay on camera screens
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PerformanceMetrics, performanceMonitor } from '../utils/PerformanceMonitor';

interface BenchmarkDisplayProps {
  visible?: boolean;
  onToggle?: () => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const BenchmarkDisplay: React.FC<BenchmarkDisplayProps> = ({
  visible = true,
  onToggle,
  position = 'top-right',
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      const currentMetrics = performanceMonitor.getMetrics();
      setMetrics(currentMetrics);
      performanceMonitor.updateMemoryUsage();
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || !metrics) {
    return null;
  }

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
    if (onToggle) {
      onToggle();
    }
  };

  const getPositionStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 1000,
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyle, top: 100, left: 10 };
      case 'top-right':
        return { ...baseStyle, top: 100, right: 10 };
      case 'bottom-left':
        return { ...baseStyle, bottom: 100, left: 10 };
      case 'bottom-right':
        return { ...baseStyle, bottom: 100, right: 10 };
      default:
        return { ...baseStyle, top: 100, right: 10 };
    }
  };

  const renderCompactView = () => (
    <TouchableOpacity
      style={[styles.compactContainer, getPositionStyle()]}
      onPress={handleToggleExpanded}
    >
      <Text style={styles.compactText}>📊 {metrics.faceDetectionFPS} FPS</Text>
    </TouchableOpacity>
  );

  const renderExpandedView = () => (
    <TouchableOpacity
      style={[styles.expandedContainer, getPositionStyle()]}
      onPress={handleToggleExpanded}
    >
      <View style={styles.header}>
        <Text style={styles.title}>📊 Performance</Text>
        <Text style={styles.closeHint}>Tap to minimize</Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>FPS:</Text>
          <Text style={[styles.metricValue, getFPSColor(metrics.faceDetectionFPS)]}>
            {metrics.faceDetectionFPS}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Detection:</Text>
          <Text style={styles.metricValue}>{metrics.averageDetectionTime}ms</Text>
        </View>

        {metrics.embeddingGenerationTime > 0 && (
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Embedding:</Text>
            <Text style={styles.metricValue}>{metrics.embeddingGenerationTime}ms</Text>
          </View>
        )}

        {metrics.verificationTime > 0 && (
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Verification:</Text>
            <Text style={styles.metricValue}>{metrics.verificationTime}ms</Text>
          </View>
        )}

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Memory:</Text>
          <Text style={styles.metricValue}>
            {metrics.memoryUsage.used}MB ({metrics.memoryUsage.percentage}%)
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Model:</Text>
          <Text style={styles.metricValue}>{metrics.modelSize}MB</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.logButton}
        onPress={() => performanceMonitor.logPerformanceSummary()}
      >
        <Text style={styles.logButtonText}>📋 Log Summary</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const getFPSColor = (fps: number) => {
    if (fps >= 45) return styles.fpsGood;
    if (fps >= 25) return styles.fpsOk;
    return styles.fpsPoor;
  };

  return isExpanded ? renderExpandedView() : renderCompactView();
};

const styles = StyleSheet.create({
  compactContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  compactText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandedContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 180,
  },
  header: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    paddingBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  closeHint: {
    color: '#aaa',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  metricsGrid: {
    gap: 6,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '500',
  },
  metricValue: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  fpsGood: {
    color: '#4CAF50', // Green
  },
  fpsOk: {
    color: '#FF9800', // Orange
  },
  fpsPoor: {
    color: '#F44336', // Red
  },
  logButton: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logButtonText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
});
