/**
 * Performance monitoring utility for AI Equipment flow
 * Tracks key metrics and sends to analytics
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private enabled: boolean = true;

  constructor() {
    // Disable in production unless explicitly enabled
    this.enabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_PERF_MONITORING === 'true';
  }

  /**
   * Start tracking a metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata
    });

    console.log(`[Performance] Started tracking: ${name}`, metadata);
  }

  /**
   * End tracking a metric and log the duration
   */
  end(name: string, additionalMetadata?: Record<string, any>): number | null {
    if (!this.enabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`[Performance] No metric found for: ${name}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }

    console.log(`[Performance] ${name}: ${metric.duration.toFixed(2)}ms`, metric.metadata);

    // Send to analytics if available
    this.sendToAnalytics(metric);

    // Clean up
    this.metrics.delete(name);

    return metric.duration;
  }

  /**
   * Log a single point-in-time metric
   */
  log(name: string, value: number, metadata?: Record<string, any>): void {
    if (!this.enabled) return;

    console.log(`[Performance] ${name}: ${value}`, metadata);

    this.sendToAnalytics({
      name,
      startTime: performance.now(),
      duration: value,
      metadata
    });
  }

  /**
   * Send metrics to analytics service
   */
  private sendToAnalytics(metric: PerformanceMetric): void {
    // Only send in production
    if (import.meta.env.DEV) return;

    // Check if analytics is available
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Performance Metric', {
        metric_name: metric.name,
        duration_ms: metric.duration,
        ...metric.metadata
      });
    }
  }

  /**
   * Mark important milestones
   */
  mark(name: string): void {
    if (!this.enabled || typeof window === 'undefined') return;

    performance.mark(name);
    console.log(`[Performance] Marked: ${name}`);
  }

  /**
   * Measure between two marks
   */
  measure(name: string, startMark: string, endMark: string): void {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
    } catch (error) {
      console.error(`[Performance] Failed to measure ${name}:`, error);
    }
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

// Export singleton instance
export const perfMonitor = new PerformanceMonitor();

// Export specific monitoring functions for AI flow
export const aiFlowMetrics = {
  // Track method dialog open
  trackMethodDialogOpen: () => {
    perfMonitor.start('ai_flow.method_dialog_open');
  },

  // Track method selection
  trackMethodSelected: (method: 'ai' | 'manual') => {
    perfMonitor.end('ai_flow.method_dialog_open', { method });
  },

  // Track AI analyzer open
  trackAIAnalyzerOpen: () => {
    perfMonitor.start('ai_flow.analyzer_open');
  },

  // Track image upload
  trackImageUpload: (fileSize: number) => {
    perfMonitor.start('ai_flow.image_upload', { file_size: fileSize });
  },

  // Track upload complete
  trackUploadComplete: () => {
    perfMonitor.end('ai_flow.image_upload');
  },

  // Track AI analysis
  trackAnalysisStart: () => {
    perfMonitor.start('ai_flow.analysis');
  },

  // Track analysis complete
  trackAnalysisComplete: (clubsDetected: number, confidence: number) => {
    perfMonitor.end('ai_flow.analysis', { 
      clubs_detected: clubsDetected,
      confidence 
    });
  },

  // Track results dialog
  trackResultsDialogOpen: (matchedCount: number, unmatchedCount: number) => {
    perfMonitor.log('ai_flow.results_shown', matchedCount + unmatchedCount, {
      matched: matchedCount,
      unmatched: unmatchedCount
    });
  },

  // Track equipment added
  trackEquipmentAdded: (count: number, method: 'ai' | 'manual') => {
    perfMonitor.log('ai_flow.equipment_added', count, { method });
  },

  // Track errors
  trackError: (error: string, context: string) => {
    console.error(`[AI-Flow-Error] ${context}:`, error);
    perfMonitor.log('ai_flow.error', 1, { error, context });
  }
};