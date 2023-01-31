import React from 'react'

import Button from '../Button'
import './LayerControl.css'
import { LayerControlProps } from './LayerControl.types'

const LayerControl: React.FC<LayerControlProps> = ({ map, layer }) => {
  const [visible, setVisible] = React.useState(
    // @ts-ignore
    layer.config.layout.visibility === 'visible'
      ? true
      : // @ts-ignore
      layer.config.layout.visibility === 'none'
      ? false
      : false
  )

  const toggleVisibility = () => {
    if (visible) {
      map.setLayoutProperty(layer.config.id, 'visibility', 'none')
    } else {
      map.setLayoutProperty(layer.config.id, 'visibility', 'visible')
    }
    setVisible(!visible)
  }

  return (
    <li data-testid="LayerControl" className="layer-control-panel">
      <Button pressed={visible} fullWidth={true} onClick={toggleVisibility}>
        {visible ? 'hide' : 'show'} {layer.name}
      </Button>
    </li>
  )
}

export default LayerControl
