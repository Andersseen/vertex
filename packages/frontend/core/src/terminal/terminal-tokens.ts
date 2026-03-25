import { InjectionToken } from '@angular/core';
import { TerminalBackendAdapter } from './terminal-backend-adapter';

/**
 * Token to inject the terminal backend adapter
 */
export const TERMINAL_BACKEND_ADAPTER = new InjectionToken<TerminalBackendAdapter>('TERMINAL_BACKEND_ADAPTER');
