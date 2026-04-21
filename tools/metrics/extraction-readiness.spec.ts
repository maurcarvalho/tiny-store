import { computeExtractionReadiness } from './extraction-readiness';

describe('Extraction Readiness Calculator', () => {
  it('should return 5 checks', () => {
    const { checks } = computeExtractionReadiness('orders');
    expect(checks).toHaveLength(5);
  });

  it('should return epsilon as 0 or 1', () => {
    const { epsilon } = computeExtractionReadiness('orders');
    expect([0, 1]).toContain(epsilon);
  });

  it('each check should have pass boolean and detail string', () => {
    const { checks } = computeExtractionReadiness('orders');
    for (const check of checks) {
      expect(typeof check.pass).toBe('boolean');
      expect(typeof check.detail).toBe('string');
      expect(typeof check.name).toBe('string');
    }
  });

  it('epsilon should be 1 only when all checks pass', () => {
    const { checks, epsilon } = computeExtractionReadiness('orders');
    const allPass = checks.every((c) => c.pass);
    if (allPass) {
      expect(epsilon).toBe(1);
    } else {
      expect(epsilon).toBe(0);
    }
  });

  it('should handle non-existent module gracefully', () => {
    const { epsilon, checks } = computeExtractionReadiness('nonexistent');
    expect(epsilon).toBe(0);
    expect(checks).toHaveLength(5);
  });
});
