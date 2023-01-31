import { render } from '@testing-library/react'
import * as MapboxGl from 'mapbox-gl'
import React from 'react'

import DebugPanel from './DebugPanel'
import { DebugPanelProps } from './DebugPanel.types'

jest.mock('mapbox-gl/dist/mapbox-gl', () => ({
  Map: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    getCanvas: jest.fn(() => ({
      style: {
        cursor: ''
      }
    })),
    getLayer: jest.fn(() => ({
      id: 'test'
    })),
    getLayoutProperty: jest.fn(() => 'visible'),
    setLayoutProperty: jest.fn(),
    getPaintProperty: jest.fn(() => 'visible'),
    setPaintProperty: jest.fn(),
    getFilter: jest.fn(() => 'visible'),
    setFilter: jest.fn(),
    getBounds: jest.fn(() => ({
      _ne: {
        lng: 1,
        lat: 1
      },
      _sw: {
        lng: 1,
        lat: 1
      }
    })),
    getCenter: jest.fn(() => ({
      lng: 1,
      lat: 1
    })),
    getZoom: jest.fn(() => 1),
    setZoom: jest.fn(),
    setCenter: jest.fn(),
    fitBounds: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    addSource: jest.fn(),
    removeSource: jest.fn(),
    queryRenderedFeatures: jest.fn(() => [
      {
        id: 'test'
      }
    ]),
    querySourceFeatures: jest.fn(() => [
      {
        id: 'test'
      }
    ]),
    getStyle: jest.fn(() => ({
      layers: [
        {
          id: 'test'
        }
      ]
    })),
    setStyle: jest.fn()
  }))
}))

describe('Test Component', () => {
  let props: DebugPanelProps

  const testLayers = [
    {
      name: 'U.S. County Borders',
      config: {
        id: 'counties-borders',
        source: 'counties',
        type: 'line',
        layout: {
          visibility: 'visible'
        }
      }
    }
  ]

  const testUnits = {
    1: {
      name: 'County',
      id: 1,
      type: 'single',
      members: 1,
      color: '#000000',
      hoverColor: '#000000',
      selectedColor: '#000000',
      lockedColor: '#000000',
      disabledColor: '#000000',
      population: 100,
      idealPopulation: 100,
      unitIdealPopulation: 100
    }
  }

  beforeEach(() => {
    props = {
      //@ts-ignore
      layers: testLayers,
      title: 'Test Title',
      units: testUnits,
      activeUnit: 1,
      sumPopulation: 100
    }
  })

  const renderComponent = () => render(<DebugPanel {...props} />)

  it('should render title text correctly', () => {
    props.map = new MapboxGl.Map()
    props.title = 'Test Title'
    const { getByTestId } = renderComponent()

    const component = getByTestId('DebugPanel')

    expect(component).toHaveTextContent('Test Title')
  })
})
