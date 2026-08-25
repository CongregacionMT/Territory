import { OrderTerritoriesPipe } from './order-territories.pipe';

describe('OrderTerritoriesPipe', () => {
  let pipe: OrderTerritoriesPipe;

  beforeEach(() => {
    pipe = new OrderTerritoriesPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return an empty array if input is falsy', () => {
    expect(pipe.transform(null as any)).toEqual([]);
    expect(pipe.transform(undefined as any)).toEqual([]);
  });

  it('should sort territories by the number in their name correctly', () => {
    const data = [
      { nombre: 'Territorio 10', porcentaje: 50 },
      { nombre: 'Territorio 2', porcentaje: 30 },
      { nombre: 'Territorio 1', porcentaje: 80 }
    ];

    const result = pipe.transform(data);

    expect(result).toEqual([
      { nombre: 'Territorio 1', porcentaje: 80 },
      { nombre: 'Territorio 2', porcentaje: 30 },
      { nombre: 'Territorio 10', porcentaje: 50 }
    ]);
  });
});
