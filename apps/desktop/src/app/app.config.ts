import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { TERMINAL_BACKEND_ADAPTER, WebTerminalService } from '@vertex/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideAnimationsAsync(),
    {
      provide: TERMINAL_BACKEND_ADAPTER,
      useClass: WebTerminalService
    }
  ],
};
