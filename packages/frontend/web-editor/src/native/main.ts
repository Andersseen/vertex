import { VertexEditorLiteElement } from './lite-editor'

if (!customElements.get('vertex-editor-lite')) {
  customElements.define('vertex-editor-lite', VertexEditorLiteElement)
}

export { VertexEditorLiteElement }
