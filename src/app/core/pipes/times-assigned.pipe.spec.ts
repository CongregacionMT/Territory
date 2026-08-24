import { TimesAssigned } from './times-assigned.pipe';
import { Card } from '@core/models/Card';

describe('TimesAssigned Pipe', () => {
  let pipe: TimesAssigned;

  beforeEach(() => {
    pipe = new TimesAssigned();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return 0 for an empty array', () => {
    const result = pipe.transform([], false);
    expect(result).toBe(0);
  });

  it('should filter out cards with no applesData', () => {
    const data = [
      { id: '1' },
      { id: '2', applesData: [] },
      { id: '3', applesData: [{ name: 'A', checked: true }] }
    ] as Card[];

    const result = pipe.transform(data, false);
    
    // Deberia haber 1 tarjeta valida (id: '3')
    expect(result).toBe(1);
  });

  it('should filter out cards with only unchecked applesData', () => {
    const data = [
      { id: '1', applesData: [{ name: 'A', checked: false }] },
      { id: '2', applesData: [{ name: 'B', checked: true }] }
    ] as Card[];

    const result = pipe.transform(data, false);
    
    // Solo id 2 es valido
    expect(result).toBe(1);
  });
});
