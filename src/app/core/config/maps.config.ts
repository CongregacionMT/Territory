import { MapConfig, MAP_CONFIG } from './maps.types';
import { environment } from '@environments/environment';
import { mapConfig as mapConfigWheelwright } from './maps.wheelwright';
import { mapConfig as mapConfigMariaTeresa } from './maps.maria-teresa';

export { MapConfig, MAP_CONFIG };

// Dynamic selection based on congregation key
let mapConfig: MapConfig;

switch (environment.congregationKey) {
  case 'wheelwright':
    mapConfig = mapConfigWheelwright;
    break;
  case 'mariaTeresa':
  case 'maria-teresa':
    mapConfig = mapConfigMariaTeresa;
    break;
  default:
    // Fallback to wheelwright if no match found
    console.warn(`No map configuration found for congregation: ${environment.congregationKey}, using wheelwright as fallback`);
    mapConfig = mapConfigWheelwright;
}

export { mapConfig };

