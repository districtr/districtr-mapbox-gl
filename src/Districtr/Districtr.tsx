import mapboxgl, { Map, MapLayerMouseEvent, MapboxGeoJSONFeature, PointLike } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import React, { useEffect, useRef, useState } from 'react'

import Button from '../Button'
import DebugPanel from '../DebugPanel'
import { getUnitColorProperty } from '../utils/colors'
import { getBoxAroundPoint } from '../utils/geometry'
import { generateUnits } from '../utils/units'
import './Districtr.css'
import { ActiveToolProps, DistrictrProps, LayerProps, SourceProps, ViewStateChangeEvent } from './Districtr.types'

const Districtr: React.FC<DistrictrProps> = ({
  mapboxContainerId = 'districtr-mapbox',
  title = 'Districtr Map',
  mapboxAccessToken,
  initialViewState = {
    longitude: -95.0,
    latitude: 36.5,
    zoom: 5,
    pitch: 0,
    bearing: 0,
    bounds: [
      [-125, 24],
      [-67, 50]
    ],
    padding: { top: 20, bottom: 20, left: 20, right: 20 },
    fitBoundsOptions: { padding: 20 }
  },
  mapStyle = 'mapbox://styles/mapbox/light-v11',
  sources,
  layers,
  interactiveLayerIds,
  unitsConfig,
  unitCount = 1,
  totalMembers = 1,
  unitName = 'District',
  unitNamePlural = 'Districts',
  unitType = 'single',
  columnSets = {}
}) => {
  const [map, setMap] = useState<Map>(null)
  const [cursor, setCursor] = useState<'pointer' | 'grab' | 'grabbing' | 'crosshair'>('grab')
  const [drawingMode, setDrawingMode] = useState<boolean>(true)
  const [units, setUnits] = useState(null)
  const [activeTool, setActiveTool] = useState<ActiveToolProps>({
    name: 'brush'
  })
  const [brushSize, setBrushSize] = useState<number>(20)
  const [hoveredFeatures, setHoveredFeatures] = useState<MapboxGeoJSONFeature[]>([])
  const [coloring, setColoring] = useState<boolean>(false)
  const [activeUnit, setActiveUnit] = useState<number>(1)
  const [unitAssignments, setUnitAssignments] = useState<{
    [key: string]: number
  }>({})
  const [unitPopulations, setUnitPopulations] = useState<{
    [key: string]: number
  }>({})
  const [activeInteractiveLayer, setActiveInteractiveLayer] = useState<number>(0)
  const [geometryKey, setGeometryKey] = useState<string>(
    columnSets[interactiveLayerIds[activeInteractiveLayer]].geometryKey
  )
  const [featureKey, setFeatureKey] = useState<string>(
    columnSets[interactiveLayerIds[activeInteractiveLayer]].columnSets[0].total.key
  )
  const [sumPopulation, setSumPopulation] = useState<number>(
    columnSets[interactiveLayerIds[activeInteractiveLayer]].columnSets[0].total.sum
  )

  const [debug, setDebug] = useState<boolean>(false)

  const mapboxContainerRef = useRef(null)

  useEffect(() => {
    mapboxgl.accessToken = mapboxAccessToken
    const map = new mapboxgl.Map({
      container: mapboxContainerRef.current,
      style: mapStyle,
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
      preserveDrawingBuffer: true,
      dragPan: true,
      touchZoomRotate: true
    })

    map.setPadding(initialViewState.padding)

    setMap(map)

    if (!units) {
      const initialUnits = generateUnits(
        unitsConfig,
        unitCount,
        totalMembers,
        unitName,
        unitNamePlural,
        unitType,
        +sumPopulation
      )
      setUnits(initialUnits)
    }
  }, [])

  useEffect(() => {
    if (map) {
      if (drawingMode) {
        map.dragPan.disable()
        map.touchZoomRotate.disable()
      } else {
        map.dragPan.enable()
        map.doubleClickZoom.enable()
        map.touchZoomRotate.enable()
      }
    }
  }, [drawingMode])

  useEffect(() => {
    if (!map) {
      return
    }

    const center = map.getCenter()
    const panOffset = 150

    if (debug) {
      map.panTo(center, { offset: [-panOffset, 0] })
    } else {
      map.panTo(center, { offset: [panOffset, 0] })
    }
  }, [debug])

  useEffect(() => {
    if (!map) {
      return
    }

    map.fitBounds(initialViewState.bounds, initialViewState.fitBoundsOptions)

    // TODO: These bindings can be condensed using the pointerEvents a la react-map-gl or a similar bindAll function
    map.on('load', onLoad)
    map.on('move', onMove)
    map.on('mousemove', onMouseMove)
    map.on('mouseleave', onMouseLeave)
    map.on('mousedown', onMouseDown)
    map.on('mouseup', onMouseUp)
    map.on('touchstart', onMouseDown)
    map.on('touchmove', onMouseMove)
    map.on('touchend', onMouseUp)

    if (drawingMode) {
      map.dragPan.disable()
      map.touchZoomRotate.disable()
      map.doubleClickZoom.disable()
    } else {
      map.dragPan.enable()
      map.doubleClickZoom.enable()
      map.touchZoomRotate.enable()
    }
    return () => {
      map.remove()
    }
  }, [map])

  useEffect(() => {
    if (!map) {
      return
    }
    /* TODO: Add SVG styles and animations to the mapbox container */
    map.getCanvas().style.cursor = cursor
  }, [cursor])

  useEffect(() => {
    if (!map) {
      return
    }

    if (activeTool.name === 'pan') {
      setCursor('pointer')
      setDrawingMode(false)
      setColoring(false)
    } else {
      setCursor('crosshair')
      setDrawingMode(true)
    }
  }, [activeTool])

  useEffect(() => {}, [unitPopulations])

  useEffect(() => {
    const populations = {}

    Object.keys(unitAssignments).forEach((geoid) => {
      const unit = unitAssignments[geoid]
      if (populations[unit]) {
        populations[unit] += unitPopulations[geoid]
      } else {
        populations[unit] = unitPopulations[geoid]
      }
    })

    // for every key in populations, setUnits with new units with the population
    if (units && Object.keys(units).length != 0) {
      const newUnits = { ...units }
      Object.keys(populations).forEach((unit) => {
        newUnits[unit].population = populations[unit]
      })
      setUnits(newUnits)
    }
  }, [unitAssignments])

  useEffect(() => {
    if (!map || !units) {
      return
    }

    const layer = map.getLayer(interactiveLayerIds[activeInteractiveLayer])
    if (!layer) {
      return
    }

    const assignments = unitAssignments
    let populations = {}

    hoveredFeatures.forEach((feature) => {
      if (coloring) {
        populations[feature.properties[geometryKey]] = feature.properties[featureKey]

        let paintUnit = activeUnit
        let paintColor = units[activeUnit].color

        if (activeTool.name === 'eraser') {
          delete assignments[feature.properties[geometryKey]]
          paintUnit = 0
          paintColor = false
        } else {
          assignments[feature.properties[geometryKey]] = activeUnit
        }

        // @ts-ignore
        map.setFeatureState(
          {
            // @ts-ignore
            source: layer.source,
            // @ts-ignore
            sourceLayer: layer.sourceLayer,
            id: feature.id
          },
          {
            ...feature.state,
            hover: true,
            unit: paintUnit,
            color: paintColor
          }
        )
      } else {
        // @ts-ignore
        map.setFeatureState(
          {
            // @ts-ignore
            source: layer.source,
            // @ts-ignore
            sourceLayer: layer.sourceLayer,
            id: feature.id
          },
          {
            ...feature.state,
            hover: true
          }
        )
      }
    })

    setUnitAssignments({ ...assignments })
    setUnitPopulations({ ...unitPopulations, ...populations })

    return () => {
      hoveredFeatures.forEach((feature) => {
        // @ts-ignore
        map.setFeatureState(
          {
            // @ts-ignore
            source: layer.source,
            // @ts-ignore
            sourceLayer: layer.sourceLayer,
            id: feature.id
          },
          {
            ...feature.state,
            hover: false
          }
        )
      })
    }
  }, [hoveredFeatures])

  const onMove = (e: ViewStateChangeEvent) => {
    //console.log("dragPan", map.dragPan.isEnabled())
  }

  const onLoad = () => {
    addSources(map, sources)
    addLayers(map, layers)
    addInteractiveLayers(map, interactiveLayerIds)
  }

  const onMouseUp = (e: MapLayerMouseEvent) => {
    if (activeTool.name === 'brush' || activeTool.name === 'eraser') {
      setColoring(false)
    }
  }

  const onMouseDown = (e: MapLayerMouseEvent) => {
    if (activeTool.name === 'brush' || activeTool.name === 'eraser') {
      setColoring(true)
    }
  }

  const onMouseMove = (e: MapLayerMouseEvent) => {
    if (!map) {
      return
    }

    if (activeTool.name === 'brush' || activeTool.name === 'eraser') {
      const interactiveLayer = map.getLayer(interactiveLayerIds[activeInteractiveLayer])
      if (!interactiveLayer) {
        return
      }

      const box: [PointLike, PointLike] = getBoxAroundPoint(e.point, brushSize)
      const features = map.queryRenderedFeatures(box, {
        layers: [interactiveLayerIds[activeInteractiveLayer]]
      })

      if (features.length > 0) {
        setHoveredFeatures(features)
      } else {
        setHoveredFeatures([])
      }
    }
  }

  const onMouseLeave = (e: MapLayerMouseEvent) => {
    if (activeTool.name === 'brush' || activeTool.name === 'eraser') {
      setHoveredFeatures([])
    }
  }

  const addSources = (map: Map, sources: SourceProps[]) => {
    if (sources.length === 0 || !map) {
      return
    }

    sources.forEach((source) => {
      if (!map.getSource(source.id)) {
        map.addSource(source.id, source.config)
      }
    })

    return
  }

  const addLayers = (map: Map, layers: LayerProps[]) => {
    if (layers.length === 0 || !map) {
      return
    }

    layers.forEach((layer) => {
      if (map.getLayer(layer.config.id)) {
        map.removeLayer(layer.config.id)
      }
      map.addLayer(layer.config)
    })

    return
  }

  const addInteractiveLayers = (map: Map, interactiveLayerIds: string[]) => {
    if (!interactiveLayerIds || !map || !units) {
      return
    }

    for (const layerId of interactiveLayerIds) {
      const defaultInteractiveColorScheme = getUnitColorProperty(units)

      map.setPaintProperty(layerId, 'fill-outline-color', 'rgba(0, 0, 0, 0.5)')
      map.setPaintProperty(layerId, 'fill-color', defaultInteractiveColorScheme)
      map.setPaintProperty(layerId, 'fill-opacity', 0.8)
    }
  }

  const changeActiveUnit = (unitId: string | number) => {
    const numUnits = Object.keys(units).length

    if (numUnits === 0) {
      return
    }

    if (unitId === 'next') {
      if (activeUnit === numUnits) {
        setActiveUnit(1)
      } else {
        setActiveUnit(activeUnit + 1)
      }
    } else if (unitId === 'previous') {
      if (activeUnit === 1) {
        setActiveUnit(numUnits)
      } else {
        setActiveUnit(activeUnit - 1)
      }
    } else {
      setActiveUnit(unitId as number)
    }
    return
  }

  return (
    <div data-testid="Districtr" className="districtr">
      <div className="districtr-toolbar">
        <ul className="districtr-toolbar-items">
          <li className="districtr-toolbar-item">
            <p>{title}</p>
          </li>
        </ul>
        <ul className="districtr-toolbar-items">
          <li className="districtr-toolbar-item">
            <Button href="/states/">Back</Button>
          </li>
          <li className="districtr-toolbar-item">
            <Button pressed={activeTool.name === 'pan' && true} onClick={() => setActiveTool({ name: 'pan' })}>
              Pan
            </Button>
          </li>
          <li className="districtr-toolbar-item">
            <Button pressed={activeTool.name === 'brush' && true} onClick={() => setActiveTool({ name: 'brush' })}>
              Brush
            </Button>
          </li>
          <li className="districtr-toolbar-item">
            <Button pressed={activeTool.name === 'eraser' && true} onClick={() => setActiveTool({ name: 'eraser' })}>
              Eraser
            </Button>
          </li>
          <li className="districtr-toolbar-item">
            <Button onClick={() => changeActiveUnit('previous')}>Previous</Button>
          </li>
          <li className="districtr-toolbar-item">
            <Button onClick={() => changeActiveUnit('next')}>Next</Button>
          </li>
          <li className="districtr-toolbar-item">
            <Button onClick={() => map.zoomOut({ duration: 200 })}>Zoom -</Button>
          </li>
          <li className="districtr-toolbar-item">
            <Button onClick={() => map.zoomIn({ duration: 200 })}>Zoom +</Button>
          </li>
          <li className="districtr-toolbar-item">
            <Button onClick={() => setDebug(!debug)}>{debug ? 'Hide' : 'Show'} Debug</Button>
          </li>
        </ul>
      </div>
      <div id={mapboxContainerId} className="districtr-mapbox" ref={mapboxContainerRef}>
        {debug && (
          <DebugPanel
            map={map}
            layers={layers}
            units={units}
            activeUnit={activeUnit}
            sumPopulation={sumPopulation}
            title={title}
          />
        )}
      </div>
    </div>
  )
}

export default Districtr
