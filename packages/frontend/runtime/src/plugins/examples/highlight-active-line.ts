import { highlightActiveLine } from '@codemirror/view'
import type { VertexPlugin } from '../types'

/**
 * Example Vertex plugin that adds CodeMirror's active line highlighting.
 */
export function createHighlightActiveLinePlugin(): VertexPlugin {
  return {
    id: 'vertex.highlight-active-line',
    name: 'Highlight Active Line',
    version: '0.1.0',
    description: 'Highlights the line currently under the cursor.',
    activate(context) {
      context.log('[HighlightActiveLine] activated')
    },
    editorContributions: [
      {
        id: 'highlight-active-line',
        getExtensions: () => [highlightActiveLine()],
      },
    ],
  }
}
