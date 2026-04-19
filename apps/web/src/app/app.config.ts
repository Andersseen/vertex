import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { TERMINAL_BACKEND_ADAPTER } from '@vertex/core';
import { VirtualTerminalService } from '@vertex/core/web';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideHttpClient(),
    provideAnimationsAsync(),
    {
      provide: TERMINAL_BACKEND_ADAPTER,
      useClass: VirtualTerminalService,
    },
  ],
};
