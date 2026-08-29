import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import confetti from 'canvas-confetti';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  private readonly router = inject(Router);

  isOpen = signal<boolean>(false);
  currentMessage = signal<string>('¡Muchas gracias por tu trabajo!');
  currentAnimation = signal<'confetti' | 'check' | 'levelup'>('check');

  private readonly encouragingMessages = [
    '¡Tarjeta recibida! Jehová no olvida tu labor (Heb. 6:10).',
    '¡Tu trabajo relacionado con el Señor no es en vano! (1 Cor. 15:58).',
    '¡Qué lindo servir hombro a hombro! Gracias por tu ayuda.',
    '¡Gracias por tu espíritu dispuesto en cada salida!',
    '¡Territorio listo! Gracias por tu valioso trabajo.',
    '¡No te canses de hacer lo bueno! (Gál. 6:9).',
    '¡Excelente! Un gusto contar siempre con tu ayuda.',
    '¡Anotada con éxito! Gran ejemplo de constancia.',
    '¡Tarjeta enviada! Jehová recompensará tu esfuerzo.',
    '¡Gran trabajo hoy! Gracias por tomarte el tiempo de enviar la tarjeta.',
    '¡Hermosa labor! Un verdadero placer trabajar juntos.',
    '¡Gracias por animar y guiar al grupo con amor!',
    '¡Misión cumplida! Descansa bien tras tu esfuerzo.',
    '¡Territorio entregado! Tu empeño marca la diferencia.',
    '¡Gracias por tu servicio leal y desinteresado!',
    '¡Excelente salida! Gracias por tu buena disposición.',
    '¡Tarjeta recibida! Que Jehová bendiga tu constancia.',
    '¡Qué gran ánimo das a todos en cada salida!',
    '¡Gracias por tu paciencia y dedicación de siempre!',
    '¡Todo anotado! Valoro mucho tu valiosa ayuda.',
    '¡Gran gestión del grupo! Jehová ve todo tu amor.',
    '¡Un paso más en la predicación! Gracias por tu ayuda.',
    '¡Territorio cubierto con éxito! Excelente trabajo.',
    '¡Gracias por estar siempre firme y bien dispuesto!',
    '¡Tarjeta en orden! Qué gusto tenerte al frente.',
    '¡Tu tiempo y esfuerzo son un gran regalo para todos!',
    '¡Buenísima salida! Gracias por cuidarnos tan bien.',
    '¡Jehová bendiga ricamente tu espíritu de servicio!',
    '¡Una tarjeta más lista! Gran labor la de hoy.',
    '¡Gracias por sembrar la semilla con tanto esmero!',
    '¡Territorio al día! Tu constancia edifica a todos.',
    '¡Excelente trabajo! Gracias por tu dedicación.',
    '¡Todo registrado! Un fuerte abrazo.',
    '¡Qué lindo ver tu fidelidad en cada salida!',
    '¡Tarjeta recibida impecable! Muchas gracias.',
    '¡Gracias por cuidar los detalles con tanto cariño!',
    '¡Tu labor como conductor es muy apreciada!',
    '¡Un conductor ejemplar! Gracias por tu paciencia.',
    '¡Territorio listo y anotado! Muy buen trabajo.',
    '¡Gracias por tu apoyo incondicional en el campo!',
    '¡Salida exitosa! Que descanses tras tu labor.',
    '¡Gracias por reflejar tanto amor en la predicación!',
    '¡Tarjeta al día! Es un placer colaborar juntos.',
    '¡Siempre al pie del cañón! Muchísimas gracias.',
    '¡Hermosa gestión! Gracias por tu valioso tiempo.',
    '¡Labor cumplida con creces! Que tengas buen día.',
    '¡Todo en orden! Gracias por tu fiel servicio.',
    '¡Gracias por animar a los publicadores hoy!',
  ];

  openModal(): void {
    const randomIndex = Math.floor(Math.random() * this.encouragingMessages.length);
    this.currentMessage.set(this.encouragingMessages[randomIndex]);

    const animations: Array<'confetti' | 'check' | 'levelup'> = ['confetti', 'check', 'levelup'];
    const randomAnim = animations[Math.floor(Math.random() * animations.length)];
    this.currentAnimation.set(randomAnim);

    if (randomAnim === 'confetti') {
      setTimeout(() => {
        void confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 1060,
        });
      }, 150);
    }

    this.isOpen.set(true);
    // Prevenir el scroll en el body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
  }

  async hideModal(): Promise<void> {
    this.isOpen.set(false);
    document.body.style.overflow = '';
    // Redirigir como lo hacía el evento hidden.bs.modal original
    await this.router.navigate(['home']);
  }
}
