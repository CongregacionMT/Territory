import { SortBy } from './sort-by.pipe';

describe('SortBy Pipe', () => {
  let pipe: SortBy;

  beforeEach(() => {
    pipe = new SortBy();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should sort an array of objects by a string property in ascending order', () => {
    const data = [{ name: 'Zebra' }, { name: 'Apple' }, { name: 'Monkey' }];
    const result = pipe.transform(data, 'name', 1);
    expect(result[0].name).toBe('Apple');
    expect(result[1].name).toBe('Monkey');
    expect(result[2].name).toBe('Zebra');
  });

  it('should sort an array of objects by a string property in descending order', () => {
    const data = [{ name: 'Zebra' }, { name: 'Apple' }, { name: 'Monkey' }];
    const result = pipe.transform(data, 'name', -1);
    expect(result[0].name).toBe('Zebra');
    expect(result[1].name).toBe('Monkey');
    expect(result[2].name).toBe('Apple');
  });

  it('should sort an array of objects by a number property', () => {
    const data = [{ id: 5 }, { id: 1 }, { id: 10 }];
    const result = pipe.transform(data, 'id', 1);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(5);
    expect(result[2].id).toBe(10);
  });

  it('should sort correctly by territory number parsing strings to integers', () => {
    const data = [{ numberTerritory: '10' }, { numberTerritory: '2' }, { numberTerritory: '1' }];
    const result = pipe.transform(data, 'numberTerritory', 1);
    expect(result[0].numberTerritory).toBe('1');
    expect(result[1].numberTerritory).toBe('2');
    expect(result[2].numberTerritory).toBe('10');
  });

  it('should extract start and end dates from nested array and sort correctly', () => {
    const data = [[{ start: '2023-12-01' }], [{ start: '2024-01-01' }], [{ start: '2023-05-01' }]];
    const result = pipe.transform(data, 'start', 1);
    expect(result[0][0].start).toBe('2023-05-01');
    expect(result[1][0].start).toBe('2023-12-01');
    expect(result[2][0].start).toBe('2024-01-01');
  });

  it('should fallback to 0 if date property is missing', () => {
    const data = [[{ start: '2024-01-01' }], [{}]];
    const result = pipe.transform(data, 'start', 1);
    expect(result[0][0].start).toBeUndefined();
    expect(result[1][0].start).toBe('2024-01-01');
  });
});
