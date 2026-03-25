// Core types for Vertex IDE
export interface VertexFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export interface VertexFolder {
  id: string;
  name: string;
  path: string;
  children: (VertexFile | VertexFolder)[];
  isExpanded: boolean;
}

export interface EditorConfig {
  theme: 'dark' | 'light';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
}

export interface VertexConfig {
  editor: EditorConfig;
  keybindings: Record<string, string>;
  lastOpenedFiles: string[];
  workspacePath: string;
}

export interface PanelPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Panel {
  id: string;
  type: 'editor' | 'terminal' | 'explorer' | 'search';
  position: PanelPosition;
  isActive: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  path: string;
  files: VertexFolder;
  panels: Panel[];
  activePanel?: string;
}
