import { Injectable } from '@angular/core';
import { getMessaging, getToken, onMessage } from '@angular/fire/messaging';

@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  constructor() {}

  requestPermission(): Promise<string> {
    const messaging = getMessaging();
    const token = getToken(messaging);
    return token;
  }

  receiveMessages(): void {
    const messaging = getMessaging();
    onMessage(messaging, () => {
      // console.log('Mensaje recibido:', payload);
      // Aquí puedes manejar la recepción de las notificaciones push y realizar las acciones correspondientes en tu aplicación
    });
  }
}
