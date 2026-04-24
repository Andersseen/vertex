import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { TERMINAL_BACKEND_ADAPTER } from '@vertex/core';
import { VirtualTerminalService } from '@vertex/core/web';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideAnimationsAsync(),
    provideRouter(routes, withComponentInputBinding()),
    {
      provide: TERMINAL_BACKEND_ADAPTER,
      useExisting: VirtualTerminalService,
    },
  ],
};
