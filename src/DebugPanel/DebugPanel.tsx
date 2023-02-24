import React from 'react'

import LayerControl from '../LayerControl'
import './DebugPanel.css'
import { DebugPanelProps } from './DebugPanel.types'

const DebugPanel: React.FC<DebugPanelProps> = ({ map, layers, title }) => {
  return (
    <div data-testid="DebugPanel" className="d-debug-panel d-debug-panel--scrollable ">
      <div className="d-debug-panel__content">
        <div className="d-debug-panel__section">
          <h4 style={{ marginBottom: 5 }}>{title} - Layers</h4>
          <ul className="d-debug-panel__list">
            {layers &&
              layers.map((layer: { config: any; name: string; interactive: boolean }) => {
                return <LayerControl map={map} key={layer.config.id} layer={layer} />
              })}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default DebugPanel
