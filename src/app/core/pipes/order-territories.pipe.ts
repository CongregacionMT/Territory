import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderTerritories',
  standalone: true
})
export class OrderTerritoriesPipe implements PipeTransform {
  transform(territorios: { nombre: string; porcentaje: number }[]): { nombre: string; porcentaje: number }[] {
    if (!territorios) return [];
    return [...territorios].sort((a, b) => {
      const numA = parseInt(a.nombre.replace('Territorio ', ''), 10);
      const numB = parseInt(b.nombre.replace('Territorio ', ''), 10);
      return numA - numB;
    });
  }
}
