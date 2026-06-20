import { describe, it, expect } from 'bun:test';
import { ConfigService } from '../services/config.service';

describe('@vertex/core', () => {
  it('should create ConfigService with default config', () => {
    const service = new ConfigService();

    expect(service).toBeTruthy();

    const config = service.getConfig();
    expect(config.editor.theme).toBe('dark');
    expect(config.editor.fontSize).toBe(14);
    expect(config.editor.tabSize).toBe(2);
  });

  it('should update editor config', () => {
    const service = new ConfigService();

    service.updateEditorConfig({ fontSize: 16 });

    expect(service.editorConfig().fontSize).toBe(16);
    expect(service.editorConfig().theme).toBe('dark');
  });
});
