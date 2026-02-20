import { computeExtractionReadiness } from './extraction-readiness';

describe('Extraction Readiness Calculator', () => {
  it('should return 5 checks', () => {
    const { checks } = computeExtractionReadiness('orders');
    expect(checks).toHaveLength(5);
  });

  it('should compute a normalized score between 0 and 1', () => {
    const { normalized } = computeExtractionReadiness('orders');
    expect(normalized).toBeGreaterThanOrEqual(0);
    expect(normalized).toBeLessThanOrEqual(1);
  });

  it('should score high for well-structured modules', () => {
    const { normalized } = computeExtractionReadiness('orders');
    // orders module should score >= 0.7 given it has events, listeners, ACL
    expect(normalized).toBeGreaterThanOrEqual(0.7);
  });

  it('should sum check scores to total', () => {
    const { checks, total } = computeExtractionReadiness('orders');
    const sum = checks.reduce((s, c) => s + c.score, 0);
    expect(sum).toBe(total);
  });

  it('should handle non-existent module gracefully', () => {
    const { normalized } = computeExtractionReadiness('nonexistent');
    expect(normalized).toBeGreaterThanOrEqual(0);
  });
});
