import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/utils';

describe('Project Setup & Environment', () => {
  it('should run tests successfully in vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('should merge class names correctly with cn utility', () => {
    const result = cn('text-white', 'bg-black', { 'p-4': true, 'm-2': false });
    expect(result).toBe('text-white bg-black p-4');
  });

  it('should resolve tailwind conflict overrides properly', () => {
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });
});
