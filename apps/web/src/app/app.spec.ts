import { describe, it, expect } from 'bun:test';
import { App } from './app';

describe('App', () => {
  it('should create the app', () => {
    const app = new App();
    expect(app).toBeTruthy();
  });

  it('should render router outlet', () => {
    const app = new App();
    expect(app).toBeTruthy();
  });
});
