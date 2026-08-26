import { Injectable, NgZone, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UserLocationService {
  private compassHandler: ((event: DeviceOrientationEvent) => void) | null = null;
  private watchPositionId: number | null = null;
  private ngZone = inject(NgZone);

  enableCompassMode(onHeadingUpdate: (heading: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('DeviceOrientationEvent' in window)) {
        reject(new Error('DeviceOrientationEvent not supported'));
        return;
      }

      const startListening = (): void => {
        this.compassHandler = (event: DeviceOrientationEvent): void => {
          if (event.alpha !== null) {
            const heading = 360 - event.alpha;
            // Ensure UI updates are handled properly
            this.ngZone.run(() => onHeadingUpdate(heading));
          }
        };
        window.addEventListener('deviceorientation', this.compassHandler);
        resolve();
      };

      const deviceOrientationWithPermission = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };

      if (typeof deviceOrientationWithPermission.requestPermission === 'function') {
        deviceOrientationWithPermission
          .requestPermission()
          .then((permissionState: string) => {
            if (permissionState === 'granted') {
              startListening();
            } else {
              reject(new Error('Permission denied for device orientation'));
            }
          })
          .catch(() => reject(new Error('Permission request failed')));
      } else {
        startListening();
      }
    });
  }

  disableCompassMode(): void {
    if (this.compassHandler !== null) {
      window.removeEventListener('deviceorientation', this.compassHandler);
      this.compassHandler = null;
    }
  }

  trackUserLocation(
    onUpdate: (lat: number, lng: number) => void,
    onError?: (error: GeolocationPositionError) => void,
  ): void {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    this.watchPositionId = navigator.geolocation.watchPosition(
      (position) => {
        this.ngZone.run(() => onUpdate(position.coords.latitude, position.coords.longitude));
      },
      (error) => {
        console.error('Error obtaining user location:', error);
        if (onError) {
          this.ngZone.run(() => onError(error));
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      },
    );
  }

  getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  destroy(): void {
    this.disableCompassMode();
    if (this.watchPositionId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchPositionId);
      this.watchPositionId = null;
    }
  }
}
