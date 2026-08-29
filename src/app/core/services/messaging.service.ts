import { Injectable, inject } from '@angular/core';
import { getMessaging, getToken, onMessage } from '@angular/fire/messaging';
import { FirebaseApp } from '@angular/fire/app';

@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  private readonly firebaseApp = inject(FirebaseApp);

  requestPermission(): Promise<string> {
    const messaging = getMessaging(this.firebaseApp);
    return getToken(messaging);
  }

  receiveMessages(): void {
    const messaging = getMessaging(this.firebaseApp);
    onMessage(messaging, () => {
      // console.log('Mensaje recibido:', payload);
      // Aquí puedes manejar la recepción de las notificaciones push y realizar las acciones correspondientes en tu aplicación
    });
  }
}
