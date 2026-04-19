export type SplitterOrientation = 'horizontal' | 'vertical';

export interface SplitterState {
  position: number;
  orientation: SplitterOrientation;
  isDragging: boolean;
}

export interface SplitterConfig {
  minSize: number;
  maxSize: number;
  step: number;
  defaultPosition: number;
}

export const DEFAULT_SPLITTER_CONFIG: SplitterConfig = {
  minSize: 0,
  maxSize: 100,
  step: 1,
  defaultPosition: 50,
};
