import { onCLS, onINP, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vital]', metric.name, metric.value);
  }

  // Send to analytics endpoint in production
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(metric),
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => {});
  }
}

export function initWebVitals() {
  onCLS(sendToAnalytics);
  onINP(sendToAnalytics); // FID was replaced by INP in web-vitals v3
  onFCP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
