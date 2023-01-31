import React from 'react'

import LayerControl from '../LayerControl'
import './DebugPanel.css'
import { DebugPanelProps } from './DebugPanel.types'

const DebugPanel: React.FC<DebugPanelProps> = ({ map, layers, title, units, activeUnit, sumPopulation }) => {
  const currentUnit = units[activeUnit]
  let unitColor = '#FFFFFF'

  // if current unit color is a string set it to unitColor
  if (typeof currentUnit.color === 'string') {
    unitColor = currentUnit.color
  }

  return (
    <div data-testid="DebugPanel" className="d-debug-panel d-debug-panel--scrollable ">
      <div className="d-debug-panel__content">
        <div className="d-debug-panel__section">
          <h4 style={{ margin: 0 }}>{title}</h4>

          <div className="d-debug-panel__section-content">
            <div>TotalPopulation: {sumPopulation.toLocaleString()} </div>
            <div
              style={{
                backgroundColor: unitColor,
                padding: '5px',
                color: '#ffffff'
              }}
            >
              <strong>{currentUnit.name}</strong>
            </div>
            <div>Unit Pop.: {currentUnit.population.toLocaleString()}</div>
            <div>Pop/Ideal: {currentUnit.idealPopulation.toLocaleString()}</div>
          </div>
        </div>

        <div className="d-debug-panel__section">
          {units &&
            Object.keys(units).map((key) => {
              const unit = units[key]
              // Add positive and neagtive sign to unitDeviation
              const unitDeviation = unit.population - unit.unitIdealPopulation
              const unitDeviationSign = unitDeviation > 0 ? '+' : ''

              // Check if this is the active unit
              const is_active = parseInt(key) === activeUnit

              // format unitDeviationPercentage to 2 decimal places
              const unitDeviationPercentage = ((unitDeviation / unit.unitIdealPopulation) * 100).toFixed(0)

              return (
                <div key={key} className={is_active ? 'd-debug-panel-unit active' : 'd-debug-panel-unit inactive'}>
                  <div className="unit-name">
                    {unit.name} ({unit.members})
                  </div>
                  <div className="unit-population">
                    {unit.population.toLocaleString()} | {unit.unitIdealPopulation.toLocaleString()} |{' '}
                    {unitDeviationSign}
                    {unitDeviationPercentage.toLocaleString()}%
                  </div>
                </div>
              )
            })}
        </div>
        <div className="d-debug-panel__section">
          <h4 style={{ marginBottom: 5 }}>Layers</h4>
          <ul className="d-debug-panel__list">
            {layers &&
              layers.map((layer: { config: any; name: string; interactive: boolean }) => {
                console.log(layer)
                if (layer.interactive) {
                  return null
                }

                return <LayerControl map={map} key={layer.config.id} layer={layer} />
              })}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default DebugPanel
