import { version } from '../../../../package.json';

// Injected by scripts/deploy.js through `ng build --define`; absent in local builds.
declare const APP_BUILD_DATE: string | undefined;

const buildDate = typeof APP_BUILD_DATE === 'string' ? APP_BUILD_DATE : '';

export const APP_VERSION = buildDate ? `${version} · ${buildDate}` : version;
