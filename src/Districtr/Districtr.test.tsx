import { render } from '@testing-library/react'
import React from 'react'

import Districtr from './Districtr'
import { DistrictrProps } from './Districtr.types'

jest.mock('mapbox-gl', () => ({
  Map: jest.fn(() => ({
    remove: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    setPadding: jest.fn(),
    fitBounds: jest.fn(),
    queryRenderedFeatures: jest.fn(() => [
      {
        id: 'counties-draw'
      }
    ]),
    querySourceFeatures: jest.fn(() => [
      {
        id: 'counties-draw'
      }
    ]),
    getStyle: jest.fn(() => ({
      layers: [
        {
          id: 'counties-draw'
        }
      ]
    })),
    setStyle: jest.fn(),
    preWarm: jest.fn(),
    dragPan: {
      enable: jest.fn(),
      disable: jest.fn()
    },
    touchZoomRotate: {
      enable: jest.fn(),
      disable: jest.fn()
    },
    doubleClickZoom: {
      enable: jest.fn(),
      disable: jest.fn()
    },
    getLayer: jest.fn(() => ({
      id: 'counties-draw'
    })),
    isStyleLoaded: jest.fn(() => true),
    setPaintProperty: jest.fn()
  }))
}))

describe('Test Component', () => {
  let props: DistrictrProps

  const columnSets = {
    'counties-draw': {
      geometryKey: 'GEOID',
      columnSets: [
        {
          name: 'Population',
          type: 'population',
          total: {
            key: 'POP100',
            max: 100,
            min: 0,
            sum: 360000000,
            name: 'Total Population'
          },
          subgroups: [{ key: 'POP100', max: 100, min: 0, sum: 360000000, name: 'Total Population' }]
        }
      ]
    }
  }

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
      title: 'Test Title',
      mapboxAccessToken: 'abcdefgh',
      initialViewState: {
        longitude: -95.0,
        latitude: 36.5,
        zoom: 5,
        bearing: 0,
        pitch: 0,
        padding: { top: 20, bottom: 20, left: 20, right: 20 },
        fitBoundsOptions: { padding: 20 }
      },
      sources: [
        {
          id: 'counties',
          config: {
            type: 'geojson',
            data: '/data/national/national-county-pl-5m.geojson',
            generateId: true
          }
        }
      ],
      layers: [
        {
          name: 'U.S. County Borders Interactive',
          interactive: true,
          config: {
            id: 'counties-draw',
            source: 'counties',
            type: 'fill',
            layout: {
              visibility: 'visible'
            }
          }
        },
        {
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
        },
        {
          name: 'U.S. County Names',
          interactive: false,
          config: {
            id: 'counties-labels',
            source: 'counties',
            type: 'symbol',
            layout: {
              visibility: 'none',
              'text-field': ['format', ['get', 'basename'], { 'font-scale': 0.8 }]
            },
            paint: {
              'text-halo-color': '#ffffff',
              'text-halo-width': 2,
              'text-halo-blur': 1
            }
          }
        }
      ],
      unitCount: 1,
      totalMembers: 1,
      unitName: 'District',
      unitNamePlural: 'Districts',
      unitType: 'single',
      interactiveLayerIds: ['counties-draw'],
      columnSets: columnSets,
      unitsConfig: testUnits
    }
  })

  const renderComponent = () => render(<Districtr {...props} />)

  it('should render title text correctly', () => {
    props.title = 'Test Title'
    const { getByTestId } = renderComponent()

    const component = getByTestId('Districtr')

    expect(component).toHaveTextContent('Test Title')
  })
})
