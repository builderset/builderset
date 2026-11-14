import { describe, expect, it } from 'vitest';
import { themeVariables, TOKEN_NAMES } from './theme';

describe('themeVariables', () => {
  it('writes each token as its public variable', () => {
    expect(
      themeVariables({ primary: '#da6c1e', 'muted-foreground': 'gray', radius: '0.5rem' }),
    ).toEqual({
      '--builderset-primary': '#da6c1e',
      '--builderset-muted-foreground': 'gray',
      '--builderset-radius': '0.5rem',
    });
  });

  it('leaves out unknown names and empty values', () => {
    const tokens = { primary: ' ', brand: 'red' } as unknown as Parameters<
      typeof themeVariables
    >[0];
    expect(themeVariables(tokens)).toEqual({});
    expect(themeVariables(undefined)).toEqual({});
  });

  it('has the sixteen public variables', () => {
    expect(TOKEN_NAMES).toHaveLength(16);
  });
});
