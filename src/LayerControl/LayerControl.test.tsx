import { render } from '@testing-library/react'
import { Map } from 'mapbox-gl'
import React from 'react'

import LayerControl from './LayerControl'
import { LayerControlProps } from './LayerControl.types'

jest.mock('mapbox-gl', () => ({
  Map: jest.fn()
}))

describe('Test Component', () => {
  let props: LayerControlProps

  beforeEach(() => {
    //@ts-ignore
    props = {
      layer: {
        name: 'U.S. County Borders',
        interactive: false,
        config: {
          id: 'counties-borders',
          source: 'counties',
          type: 'line',
          layout: {
            visibility: 'visible'
          },
          paint: {
            'line-color': '#777777',
            'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0, 7, 1],
            'line-opacity': 0.8
          }
        }
      }
    }
  })

  const renderComponent = () => render(<LayerControl {...props} />)

  it('should render layer name correctly', () => {
    props.map = new Map()
    const { getByTestId } = renderComponent()

    const component = getByTestId('LayerControl')

    expect(component).toHaveTextContent(props.layer.name)
  })
})
