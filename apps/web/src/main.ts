import './polyfills';
import '@xterm/xterm/css/xterm.css';
import '../../../packages/frontend/ide-ui/src/styles/index.scss';
import './styles.scss';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
