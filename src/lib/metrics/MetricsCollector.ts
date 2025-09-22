/**
 * Metrics Collection System
 * Prometheus-compatible metrics collection for monitoring and observability
 */

export interface MetricLabels {
  [key: string]: string;
}

export interface CounterMetric {
  name: string;
  help: string;
  value: number;
  labels: MetricLabels;
}

export interface HistogramMetric {
  name: string;
  help: string;
  buckets: Map<number, number>;
  sum: number;
  count: number;
  labels: MetricLabels;
}

export interface GaugeMetric {
  name: string;
  help: string;
  value: number;
  labels: MetricLabels;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private counters: Map<string, CounterMetric> = new Map();
  private histograms: Map<string, HistogramMetric> = new Map();
  private gauges: Map<string, GaugeMetric> = new Map();
  
  // Default histogram buckets for response times (in milliseconds)
  private readonly defaultBuckets = [
    1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, Infinity
  ];

  static getInstance(): MetricsCollector {
    if (!this.instance) {
      this.instance = new MetricsCollector();
    }
    return this.instance;
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels: MetricLabels = {}, value: number = 1): void {
    const key = this.generateMetricKey(name, labels);
    
    if (this.counters.has(key)) {
      const counter = this.counters.get(key)!;
      counter.value += value;
    } else {
      this.counters.set(key, {
        name,
        help: this.getCounterHelp(name),
        value,
        labels
      });
    }
  }

  /**
   * Record a histogram metric (for measuring durations, sizes, etc.)
   */
  recordHistogram(
    name: string, 
    value: number, 
    labels: MetricLabels = {},
    buckets: number[] = this.defaultBuckets
  ): void {
    const key = this.generateMetricKey(name, labels);
    
    if (this.histograms.has(key)) {
      const histogram = this.histograms.get(key)!;
      histogram.sum += value;
      histogram.count += 1;
      
      // Update buckets
      for (const bucket of buckets) {
        if (value <= bucket) {
          const currentCount = histogram.buckets.get(bucket) || 0;
          histogram.buckets.set(bucket, currentCount + 1);
        }
      }
    } else {
      const bucketMap = new Map<number, number>();
      for (const bucket of buckets) {
        bucketMap.set(bucket, value <= bucket ? 1 : 0);
      }
      
      this.histograms.set(key, {
        name,
        help: this.getHistogramHelp(name),
        buckets: bucketMap,
        sum: value,
        count: 1,
        labels
      });
    }
  }

  /**
   * Set a gauge metric (for measuring current values)
   */
  setGauge(name: string, value: number, labels: MetricLabels = {}): void {
    const key = this.generateMetricKey(name, labels);
    
    this.gauges.set(key, {
      name,
      help: this.getGaugeHelp(name),
      value,
      labels
    });
  }

  /**
   * Increment a gauge metric
   */
  incrementGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
    const key = this.generateMetricKey(name, labels);
    
    if (this.gauges.has(key)) {
      const gauge = this.gauges.get(key)!;
      gauge.value += value;
    } else {
      this.setGauge(name, value, labels);
    }
  }

  /**
   * Decrement a gauge metric
   */
  decrementGauge(name: string, labels: MetricLabels = {}, value: number = 1): void {
    this.incrementGauge(name, labels, -value);
  }

  /**
   * Get current metric values
   */
  getMetrics(): {
    counters: CounterMetric[];
    histograms: HistogramMetric[];
    gauges: GaugeMetric[];
  } {
    return {
      counters: Array.from(this.counters.values()),
      histograms: Array.from(this.histograms.values()),
      gauges: Array.from(this.gauges.values())
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  async exportMetrics(): Promise<string> {
    const lines: string[] = [];
    
    // Export counters
    const countersByName = this.groupMetricsByName(Array.from(this.counters.values()));
    for (const [name, metrics] of countersByName) {
      lines.push(`# HELP ${name} ${metrics[0].help}`);
      lines.push(`# TYPE ${name} counter`);
      
      for (const metric of metrics) {
        const labelsStr = this.formatLabels(metric.labels);
        lines.push(`${name}${labelsStr} ${metric.value}`);
      }
      lines.push('');
    }

    // Export histograms
    const histogramsByName = this.groupMetricsByName(Array.from(this.histograms.values()));
    for (const [name, metrics] of histogramsByName) {
      lines.push(`# HELP ${name} ${metrics[0].help}`);
      lines.push(`# TYPE ${name} histogram`);
      
      for (const metric of metrics) {
        const labelsStr = this.formatLabels(metric.labels);
        
        // Export buckets
        for (const [bucket, count] of metric.buckets) {
          const bucketLabels = { ...metric.labels, le: bucket === Infinity ? '+Inf' : bucket.toString() };
          const bucketLabelsStr = this.formatLabels(bucketLabels);
          lines.push(`${name}_bucket${bucketLabelsStr} ${count}`);
        }
        
        // Export sum and count
        lines.push(`${name}_sum${labelsStr} ${metric.sum}`);
        lines.push(`${name}_count${labelsStr} ${metric.count}`);
      }
      lines.push('');
    }

    // Export gauges
    const gaugesByName = this.groupMetricsByName(Array.from(this.gauges.values()));
    for (const [name, metrics] of gaugesByName) {
      lines.push(`# HELP ${name} ${metrics[0].help}`);
      lines.push(`# TYPE ${name} gauge`);
      
      for (const metric of metrics) {
        const labelsStr = this.formatLabels(metric.labels);
        lines.push(`${name}${labelsStr} ${metric.value}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
  }

  /**
   * Get metrics summary for dashboard
   */
  getSummary(): {
    totalMetrics: number;
    counters: number;
    histograms: number;
    gauges: number;
    lastUpdated: Date;
  } {
    return {
      totalMetrics: this.counters.size + this.histograms.size + this.gauges.size,
      counters: this.counters.size,
      histograms: this.histograms.size,
      gauges: this.gauges.size,
      lastUpdated: new Date()
    };
  }

  // Private helper methods

  private generateMetricKey(name: string, labels: MetricLabels): string {
    const sortedLabels = Object.keys(labels)
      .sort()
      .map(key => `${key}="${labels[key]}"`)
      .join(',');
    
    return `${name}{${sortedLabels}}`;
  }

  private formatLabels(labels: MetricLabels): string {
    const labelPairs = Object.keys(labels)
      .sort()
      .map(key => `${key}="${labels[key]}"`)
      .join(',');
    
    return labelPairs ? `{${labelPairs}}` : '';
  }

  private groupMetricsByName<T extends { name: string }>(metrics: T[]): Map<string, T[]> {
    const grouped = new Map<string, T[]>();
    
    for (const metric of metrics) {
      if (!grouped.has(metric.name)) {
        grouped.set(metric.name, []);
      }
      grouped.get(metric.name)!.push(metric);
    }
    
    return grouped;
  }

  private getCounterHelp(name: string): string {
    const helpTexts: Record<string, string> = {
      'messages_processed_total': 'Total number of messages processed by the system',
      'api_requests_total': 'Total number of API requests received',
      'errors_total': 'Total number of errors encountered',
      'llm_requests_total': 'Total number of LLM API requests made',
      'webhook_requests_total': 'Total number of webhook requests received',
      'document_uploads_total': 'Total number of documents uploaded',
      'vector_searches_total': 'Total number of vector searches performed',
      'cache_hits_total': 'Total number of cache hits',
      'cache_misses_total': 'Total number of cache misses'
    };
    
    return helpTexts[name] || `Counter metric: ${name}`;
  }

  private getHistogramHelp(name: string): string {
    const helpTexts: Record<string, string> = {
      'response_time_ms': 'Response time in milliseconds',
      'llm_latency_ms': 'LLM API response latency in milliseconds',
      'queue_processing_time_ms': 'Queue processing time in milliseconds',
      'document_processing_time_ms': 'Document processing time in milliseconds',
      'vector_search_time_ms': 'Vector search time in milliseconds',
      'embedding_generation_time_ms': 'Embedding generation time in milliseconds',
      'database_query_time_ms': 'Database query time in milliseconds'
    };
    
    return helpTexts[name] || `Histogram metric: ${name}`;
  }

  private getGaugeHelp(name: string): string {
    const helpTexts: Record<string, string> = {
      'active_conversations': 'Number of currently active conversations',
      'queue_depth': 'Current depth of the message queue',
      'agent_count': 'Total number of active agents',
      'connected_users': 'Number of currently connected users',
      'memory_usage_bytes': 'Current memory usage in bytes',
      'cpu_usage_percent': 'Current CPU usage percentage',
      'database_connections': 'Number of active database connections',
      'cache_size_bytes': 'Current cache size in bytes'
    };
    
    return helpTexts[name] || `Gauge metric: ${name}`;
  }
}

// Singleton instance getter
export function getMetricsCollector(): MetricsCollector {
  return MetricsCollector.getInstance();
}
