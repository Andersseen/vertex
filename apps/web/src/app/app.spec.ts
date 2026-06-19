import { describe, it, expect } from 'bun:test';
import { App } from './app';

describe('App', () => {
  it('should create the app component instance', () => {
    const app = new App();

    expect(app).toBeTruthy();
  });

  it('should export a valid component class', () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe('function');
    expect(App.prototype).toBeDefined();
  });
});
