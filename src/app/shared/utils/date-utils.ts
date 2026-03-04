export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function getWeekId(date: Date): string {
  const monday = getMonday(date);
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const day = String(monday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatWeekRange(dateString: string): string {
  if (!dateString) return '';
  
  let date: Date;
  if (dateString === 'actual') {
    date = new Date();
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // Usar T12:00:00 para evitar problemas de zona horaria que puedan mover la fecha al día anterior
    date = new Date(dateString + 'T12:00:00');
  } else {
    return dateString;
  }

  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  return `${monday.getDate()} de ${months[monday.getMonth()]} al ${sunday.getDate()} de ${months[sunday.getMonth()]}`;
}
