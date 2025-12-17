import { Injectable } from '@angular/core';
import { getMessaging, getToken, onMessage, MessagePayload } from '@firebase/messaging';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  constructor() {}

  requestPermission(): Promise<string> {
    const messaging = getMessaging()
    let token = getToken(messaging);
    return token;
  }

  receiveMessages(): void {
    const messaging = getMessaging();
    onMessage(messaging, (payload: MessagePayload) => {
      // console.log('Mensaje recibido:', payload);
      // Aquí puedes manejar la recepción de las notificaciones push y realizar las acciones correspondientes en tu aplicación
    });
  }
}
