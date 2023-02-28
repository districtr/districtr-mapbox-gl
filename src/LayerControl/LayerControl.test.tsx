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
      //@ts-ignore
      layer: {
        id: 'test',
        metadata: {
          'mapbox:group': 'test'
        }
      }
    }
  })

  const renderComponent = () => render(<LayerControl {...props} />)

  it('should render layer name correctly', () => {
    props.map = new Map()
    const { getByTestId } = renderComponent()

    const component = getByTestId('LayerControl')

    expect(component).toHaveTextContent(props.layer.id)
  })
})
