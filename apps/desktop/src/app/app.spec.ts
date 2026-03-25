import { describe, it, expect } from 'bun:test';
import { App } from './app';

describe('App', () => {
  it('should create the app', () => {
    const app = new App();
    expect(app).toBeTruthy();
  });

  it('should have the correct title', () => {
    const app = new App();
    // title is a signal
    expect((app as any).title()).toContain('Vertex IDE');
  });
});
