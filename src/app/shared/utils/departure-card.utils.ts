export function getCardStatusLabel(status: string | undefined): string {
  switch (status) {
    case 'received':
      return 'Recibida';
    case 'canceled':
      return 'No se hizo';
    case 'not_required':
      return 'No requiere';
    default:
      return 'Pendiente';
  }
}
