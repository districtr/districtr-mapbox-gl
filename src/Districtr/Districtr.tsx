import mapboxgl, { MapLayerMouseEvent, MapboxGeoJSONFeature, Map as MapboxMap, Point, PointLike } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import React, { useEffect, useRef, useState } from 'react'

import Button from '../Button'
import Cursor from '../Cursor'
import DebugPanel from '../DebugPanel'
import Toolbar from '../Toolbar'
import UnitProperties from '../UnitProperties'
import { getUnitColorProperty, getUnitOutlineColor } from '../utils/colors'
import { convertBrushSizeToPixels, getBoxAroundPoint } from '../utils/geometry'
import { generateUnits } from '../utils/units'
import './Districtr.css'
import {
  ActiveToolProps,
  DistrictrProps,
  LayerProps,
  SourceProps,
  ToolsConfigProps,
  UnitConfigProps,
  ViewStateChangeEvent
} from './Districtr.types'

const Districtr: React.FC<DistrictrProps> = ({
  mapboxContainerId = 'districtr-mapbox',
  title = 'Districtr Map',
  mapboxAccessToken,
  initialViewState = {
    longitude: -95.0,
    latitude: 36.5,
    zoom: 10,
    pitch: 0,
    bearing: 0,
    bounds: [
      [-125, 24],
      [-67, 50]
    ],
    padding: { top: 20, bottom: 20, left: 20, right: 20 },
    fitBoundsOptions: { padding: 20 }
  },
  mapStyle = 'light-v11',
  sources,
  layers,
  interactiveLayerIds,
  unitsConfig,
  unitCount = 1,
  totalMembers = 1,
  unitName = 'District',
  unitNamePlural = 'Districts',
  unitType = 'single',
  columnSets = {},
  toolsConfig = {
    brush: {
      name: 'brush',
      icon: 'B',
      tooltip: 'Brush Tool',
      cursor: 'brush',
      shortcut: 'b',
      enabled: true,
      size: 50,
      options: {
        inputs: [
          {
            type: 'colorPicker',
            name: 'Brush Color',
            property: 'color',
            config: {
              color: '#000000',
              defaultUnitCount: 1
            }
          },
          {
            type: 'rangeSlider',
            name: 'Brush Size',
            property: 'size',
            config: {
              align: 'vertical',
              min: 1,
              max: 100
            }
          }
        ]
      }
    },
    pan: {
      name: 'pan',
      icon: 'P',
      tooltip: 'Pan Tool',
      cursor: 'pan',
      shortcut: 'p',
      enabled: true
    },
    eraser: {
      name: 'eraser',
      icon: 'E',
      tooltip: 'Eraser Tool',
      cursor: 'eraser',
      shortcut: 'e',
      enabled: true,
      size: 50,
      options: {
        inputs: [
          {
            type: 'rangeSlider',
            name: 'Eraser Size',
            property: 'size',
            config: {
              align: 'vertical',
              min: 1,
              max: 100
            }
          }
        ]
      }
    }
  }
}) => {
  const mapStyleOptions = useRef({
    'streets-v12': {
      name: 'Streets',
      url: 'mapbox://styles/mapbox/streets-v12'
    },
    'outdoors-v12': {
      name: 'Outdoors',
      url: 'mapbox://styles/mapbox/outdoors-v12'
    },
    'light-v11': {
      name: 'Light',
      url: 'mapbox://styles/mapbox/light-v11'
    },
    'dark-v11': {
      name: 'Dark',
      url: 'mapbox://styles/mapbox/dark-v11'
    },
    'satellite-v9': {
      name: 'Satellite',
      url: 'mapbox://styles/mapbox/satellite-v9'
    },
    'satellite-streets-v12': {
      name: 'Satellite Streets',
      url: 'mapbox://styles/mapbox/satellite-streets-v12'
    },
    'navigation-day-v1': {
      name: 'Navigation Preview Day',
      url: 'mapbox://styles/mapbox/navigation-preview-day-v4'
    },
    'navigation-night-v1': {
      name: 'Navigation Preview Night',
      url: 'mapbox://styles/mapbox/navigation-preview-night-v4'
    }
  })

  const defaultUnits = {
    1: {
      id: 1,
      name: 'District',
      type: 'single',
      members: 1,
      color: '#FFFFFF',
      hoverColor: '#FFFFFF',
      selectedColor: '#FFFFFF',
      lockedColor: '#FFFFFF',
      disabledColor: '#FFFFFF',
      population: 1,
      idealPopulation: 1,
      unitIdealPopulation: 1
    }
  }

  const [map, setMap] = useState<MapboxMap>(null)
  const [drawingMode, setDrawingMode] = useState<boolean>(true)
  const [units, setUnits] = useState<UnitConfigProps>(defaultUnits)
  const [activeTool, setActiveTool] = useState<ActiveToolProps>({
    name: 'brush'
  })
  const [tools, setTools] = useState<ToolsConfigProps>(toolsConfig)
  const [mapStyleName, setMapStyleName] = useState<string>(mapStyle)
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
  const [currentZoom, setCurrentZoom] = useState<number>(initialViewState.zoom)
  const [cursorVisible, setCursorVisible] = useState<boolean>(true)

  const [columnKeys, setColumnKeys] = useState<string[]>([])
  const [unitColumnPopulations, setUnitColumnPopulations] = useState(new Map())

  const [debug, setDebug] = useState<boolean>(false)
  const [rightPanel, setRightPanel] = useState<string>('unit')
  const [colorScheme, setColorScheme] = useState<string[]>([])

  const mapboxContainerRef = useRef(null)

  const prevPoint = useRef<Point>(null)
  const brushSize = useRef<number>(50)

  const mousePosition = useRef<{ x: number; y: number }>(null)

  useEffect(() => {
    mapboxgl.accessToken = mapboxAccessToken
    const map = new mapboxgl.Map({
      container: mapboxContainerRef.current,
      style: mapStyleOptions.current[mapStyleName].url,
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
      preserveDrawingBuffer: true,
      dragPan: true,
      boxZoom: false,
      touchZoomRotate: true,
      transformRequest: (url, resourceType) => {
        if (resourceType === 'Source' && url.startsWith('http://api.districtr.org')) {
          return {
            url: url,
            headers: {
              Authorization: 'Token *FUTURE TOKEN*',
              'Access-Control-Allow-Origin': '*'
            }
          }
        }
      }
    })

    map.setPadding(initialViewState.padding)

    setMap(map)

    if (units === defaultUnits) {
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

    const datasets = {
      'layer-id': [
        {
          name: 'Total Population',
          source: '2020 Census',
          type: 'population',
          totalKey: 'TOTPOP',
          subgroupKeys: ['NH_WHITE'],
          totalName: 'Total Population',
          subgroupName: 'Demographics',
          metadata: {
            TOTPOP: { sum: 1000, min: 0, max: 1000, name: 'Total Population' },
            NH_WHITE: { sum: 1000, min: 0, max: 1000, name: 'White' }
          },
          TOTPOP: 1000,
          NH_WHITE: 1000
        }
      ]
    }

    // for every column set, for the interactive layer, get the column keys
    const sourceColumnSets: [] = columnSets[interactiveLayerIds[activeInteractiveLayer]].columnSets

    const columnKeySets: string[] = []
    const newPopulationSets = []
    //for each item in source column sets, if the type is population
    //then get the key and set it as the feature key
    sourceColumnSets.forEach((columnSet: any) => {
      if (columnSet.total !== null) {
        if (columnSet.type === 'population') {
          if (columnSet.total.key === featureKey) {
            setSumPopulation(columnSet.total.sum)
          }
          columnKeySets.push(columnSet.total.key)
          columnSet.subgroups.forEach((subgroup: any) => {
            columnKeySets.push(subgroup.key)
          })
        }
      }
    })

    setColumnKeys(columnKeySets)
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
    map.on('mouseenter', onMouseEnter)
    map.on('mouseleave', onMouseLeave)
    map.on('mouseover', onMouseOver)
    map.on('mouseout', onMouseOut)
    map.on('mousedown', onMouseDown)
    map.on('mouseup', onMouseUp)
    map.on('touchstart', onMouseDown)
    map.on('touchmove', onMouseMove)
    map.on('touchend', onMouseUp)
    map.on('zoom', onZoom)

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

    if (activeTool.name === 'pan') {
      setDrawingMode(false)
      setColoring(false)
    } else {
      setDrawingMode(true)
    }
  }, [activeTool])

  useEffect(() => {
    if (!map) {
      return
    }

    //update the map style
    map.setStyle(mapStyleOptions.current[mapStyleName].url)
  }, [mapStyleName])

  useEffect(() => {}, [unitPopulations])

  useEffect(() => {
    const populations = {}
    const columnPopulations = {}

    Object.keys(unitAssignments).forEach((geoid) => {
      const unit = unitAssignments[geoid]
      if (populations[unit]) {
        populations[unit] += unitPopulations[geoid]
      } else {
        populations[unit] = unitPopulations[geoid]
      }

      columnKeys.forEach((columnKey) => {
        if (!columnPopulations[unit]) {
          columnPopulations[unit] = {}
        }

        const recordKey = `${columnKey}-${geoid}`

        if (columnPopulations[unit][columnKey]) {
          columnPopulations[unit][columnKey] += unitColumnPopulations.get(recordKey)
        } else {
          columnPopulations[unit][columnKey] = unitColumnPopulations.get(recordKey)
        }
      })
    })

    if (units && Object.keys(units).length != 0) {
      let newUnits = JSON.parse(JSON.stringify(units))

      Object.keys(populations).forEach((unit) => {
        newUnits[unit].population = populations[unit]
        newUnits[unit].columnPopulations = columnPopulations[unit]
      })

      Object.keys(units).every((unit) => {
        if (units[unit].population !== newUnits[unit].population) {
          setUnits({ ...newUnits })
          return false
        }
        return true
      })
    }
  }, [unitAssignments])

  useEffect(() => {
    if (!map) {
      return
    }

    const layer = map.getLayer(interactiveLayerIds[activeInteractiveLayer])
    if (!layer) {
      return
    }

    // query all rendered features and set the feature state
    //@ts-ignore
    const features = map.queryRenderedFeatures({ layers: [layer.id] })
    features.forEach((feature) => {
      // if the feature state unit equals the active unit, set the feature state to active
      if (feature.state.unit === activeUnit) {
        map.setFeatureState(
          {
            //@ts-ignore
            source: layer.source,
            //@ts-ignore
            sourceLayer: layer.sourceLayer,
            id: feature.id
          },
          {
            ...feature.state,
            active: true
          }
        )
      } else {
        map.setFeatureState(
          {
            //@ts-ignore
            source: layer.source,
            //@ts-ignore
            sourceLayer: layer.sourceLayer,
            id: feature.id
          },
          {
            ...feature.state,
            active: false
          }
        )
      }
    })
  }, [activeUnit])

  useEffect(() => {
    if (!map || !units) {
      return
    }

    const layer = map.getLayer(interactiveLayerIds[activeInteractiveLayer])
    if (!layer) {
      return
    }

    const assignments = { ...unitAssignments }
    let populations = {}
    let cpops = new Map()

    hoveredFeatures.forEach((feature) => {
      if (coloring) {
        populations[feature.properties[geometryKey]] = feature.properties[featureKey]

        columnKeys.forEach((columnKey) => {
          const cpop_key = `${columnKey}-${feature.properties[geometryKey]}`
          const cpop_value = feature.properties[columnKey]
          cpops.set(cpop_key, cpop_value)
        })

        let paintUnit = activeUnit

        if (activeTool.name === 'eraser') {
          delete assignments[feature.properties[geometryKey]]
          paintUnit = 0
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
            active: true
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

    if (JSON.stringify(unitAssignments) !== JSON.stringify(assignments)) {
      setUnitAssignments(assignments)
      setUnitPopulations({ ...unitPopulations, ...populations })
      setUnitColumnPopulations(new Map([...unitColumnPopulations, ...cpops]))
    }

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

  useEffect(() => {
    if (!map) {
      return
    }

    if (drawingMode && cursorVisible) {
      map.getCanvas().style.cursor = 'crosshair'
    } else {
      map.getCanvas().style.cursor = ''
    }
  }, [cursorVisible])

  useEffect(() => {
    if (!map) {
      return
    }

    if ('size' in tools[activeTool.name]) {
      brushSize.current = convertBrushSizeToPixels(currentZoom, tools[activeTool.name].size)
    } else {
      brushSize.current = 0
    }
  }, [currentZoom])

  useEffect(() => {
    if (!map) {
      return
    }

    if ('size' in tools[activeTool.name]) {
      brushSize.current = convertBrushSizeToPixels(currentZoom, tools[activeTool.name].size)
    } else {
      brushSize.current = 0
    }
  }, [tools])

  useEffect(() => {
    if (!map) {
      return
    }
    const newColorScheme = []

    // for each key in units add the color to the color scheme
    Object.keys(units).forEach((unit) => {
      newColorScheme.push(units[unit].color)
    })

    if (colorScheme.toString() !== newColorScheme.toString()) {
      setColorScheme(newColorScheme)
      const defaultInteractiveColorScheme = getUnitColorProperty(units)
      const defaultInteractiveOutlineColorScheme = getUnitOutlineColor(units)

      // check if the active interactive layer is in the map and the style is loaded
      if (!map.getLayer(interactiveLayerIds[activeInteractiveLayer]) || !map.isStyleLoaded()) {
        return
      }

      // set the paint property for the interactive layer that is currently active

      map.setPaintProperty(interactiveLayerIds[activeInteractiveLayer], 'fill-color', defaultInteractiveColorScheme)
      map.setPaintProperty(interactiveLayerIds[activeInteractiveLayer], 'fill-opacity', 0.8)
      // set a paint proerty that set the fill-outline-color if the feature is active
      map.setPaintProperty(
        interactiveLayerIds[activeInteractiveLayer],
        'fill-outline-color',
        defaultInteractiveOutlineColorScheme
      )
    }
  }, [units])

  const onZoom = (e: ViewStateChangeEvent) => {
    if (currentZoom !== map.getZoom()) {
      setCurrentZoom(map.getZoom())
    }
  }

  const onMove = (e: ViewStateChangeEvent) => {
    //console.log("dragPan", map.dragPan.isEnabled())
  }

  const onLoad = () => {
    addSources(map, sources)
    addLayers(map, layers)
    addInteractiveLayers(map, interactiveLayerIds)
  }

  const onMouseUp = (e: MapLayerMouseEvent) => {
    setColoring(false)
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
    mousePosition.current = { x: e.point.x, y: e.point.y }
    const cPoint = e.point
    let pPoint = prevPoint.current
    let offsetPoint

    if (!pPoint) {
      prevPoint.current = cPoint
      pPoint = prevPoint.current
    }

    // @ts-ignore
    const dist = Math.sqrt(Math.pow(cPoint.x - pPoint.x, 2) + Math.pow(cPoint.y - pPoint.y, 2))
    const rads = Math.atan2(cPoint.y - pPoint.y, cPoint.x - pPoint.x)

    if (dist < brushSize.current / 2) {
      // returning here prevents the brush from being drawn and could save memory but results in a jittery brush
      // alternately, tweaking this value could result in a smoother brush for denser areas that slow the unrestrained brush down.
      //return
    }

    if (activeTool.name === 'brush' || activeTool.name === 'eraser') {
      const interactiveLayer = map.getLayer(interactiveLayerIds[activeInteractiveLayer])
      if (!interactiveLayer) {
        return
      }

      const box: [PointLike, PointLike] = getBoxAroundPoint(cPoint, brushSize.current)
      const features = map.queryRenderedFeatures(box, {
        layers: [interactiveLayerIds[activeInteractiveLayer]]
      })

      if (features.length > 0) {
        setHoveredFeatures(features)
      } else {
        setHoveredFeatures([])
      }
      prevPoint.current = cPoint
    }
  }

  const onMouseEnter = (e: MapLayerMouseEvent) => {
    setCursorVisible(true)
  }

  const onMouseOver = (e: MapLayerMouseEvent) => {
    setCursorVisible(true)
  }

  const onMouseLeave = (e: MapLayerMouseEvent) => {
    if (activeTool.name === 'brush' || activeTool.name === 'eraser') {
      setColoring(false)
      setHoveredFeatures([])
    }
    setCursorVisible(false)
  }

  const onMouseOut = (e: MapLayerMouseEvent) => {
    if (activeTool.name === 'brush' || activeTool.name === 'eraser') {
      setHoveredFeatures([])
      setColoring(false)
    }
    setCursorVisible(false)
  }

  const addSources = (map: MapboxMap, sources: SourceProps[]) => {
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

  const addLayers = (map: MapboxMap, layers: LayerProps[]) => {
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

  const addInteractiveLayers = (map: MapboxMap, interactiveLayerIds: string[]) => {
    if (!interactiveLayerIds || !map || !units) {
      return
    }

    for (const layerId of interactiveLayerIds) {
      if (layerId === interactiveLayerIds[activeInteractiveLayer]) {
        const defaultInteractiveColorScheme = getUnitColorProperty(units)
        const defaultInteractiveOutlineColorScheme = getUnitOutlineColor(units)
        map.setPaintProperty(layerId, 'fill-outline-color', defaultInteractiveOutlineColorScheme)
        map.setPaintProperty(layerId, 'fill-color', defaultInteractiveColorScheme)
        map.setPaintProperty(layerId, 'fill-opacity', 0.8)
      } else {
        map.setPaintProperty(layerId, 'fill-color', 'rgba(0,0,0,0)')
        map.setPaintProperty(layerId, 'fill-opacity', 0)
        map.setPaintProperty(layerId, 'fill-outline-color', 'rgba(0,0,0,0)')
      }
    }
  }

  return (
    <div
      data-testid="Districtr"
      className={`districtr d-cursor-visible-${cursorVisible} d-cursor-drawing-${drawingMode}`}
    >
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
        </ul>
      </div>
      <Toolbar
        position={'left'}
        tools={tools}
        setTools={setTools}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        units={units}
        setUnits={setUnits}
        activeUnit={activeUnit}
      >
        <ul className="d-toolbar-group d-toolbar-group--bottom">
          <li className="d-toolbar-item"></li>
        </ul>
      </Toolbar>
      <div id={mapboxContainerId} className="districtr-mapbox" ref={mapboxContainerRef}>
        {rightPanel === 'debug' && (
          <DebugPanel
            map={map}
            layers={layers}
            units={units}
            activeUnit={activeUnit}
            sumPopulation={sumPopulation}
            title={title}
          />
        )}

        {rightPanel === 'unit' && (
          <UnitProperties
            units={units}
            activeUnit={activeUnit}
            setUnits={setUnits}
            setActiveUnit={setActiveUnit}
            columnSets={columnSets[interactiveLayerIds[activeInteractiveLayer]]}
            columnKeys={columnKeys}
          ></UnitProperties>
        )}
        <Cursor
          visible={cursorVisible}
          size={brushSize.current}
          tool={activeTool.name}
          position={mousePosition.current}
        />
      </div>
      <Toolbar position={'right'} units={units} setUnits={setUnits}>
        <ul className="d-toolbar-group d-toolbar-group--top">
          <li className="d-toolbar-item">
            <Button accessibilityLabel="Zoom In" variant="toolbar" onClick={() => map.zoomIn({ duration: 200 })}>
              +
            </Button>
          </li>
          <li className="d-toolbar-item">
            <Button accessibilityLabel="Zoom Out" variant="toolbar" onClick={() => map.zoomOut({ duration: 200 })}>
              -
            </Button>
          </li>
          <li className="d-toolbar-item">
            <Button
              disabled={true}
              accessibilityLabel="Streets Layer"
              variant="toolbar"
              onClick={() => setMapStyleName('light-v11')}
            >
              P
            </Button>
          </li>
          <li className="d-toolbar-item">
            <Button
              disabled={true}
              accessibilityLabel="Satellite Layer"
              variant="toolbar"
              onClick={() => setMapStyleName('satellite-streets-v12')}
            >
              S
            </Button>
          </li>
          <li>
            <Button
              disabled={true}
              accessibilityLabel="Dark Mode"
              variant="toolbar"
              onClick={() => setMapStyleName('navigation-night-v1')}
            >
              N
            </Button>
          </li>
        </ul>

        <ul className="d-toolbar-group d-toolbar-group--bottom">
          <li className="districtr-toolbar-item">
            <Button
              variant="toolbar"
              pressed={rightPanel === 'unit'}
              onClick={() => (rightPanel === 'unit' ? setRightPanel('') : setRightPanel('unit'))}
            >
              d
            </Button>
          </li>
          <li className="districtr-toolbar-item">
            <Button
              variant="toolbar"
              pressed={rightPanel === 'debug'}
              onClick={() => (rightPanel === 'debug' ? setRightPanel('') : setRightPanel('debug'))}
            >
              L
            </Button>
          </li>
        </ul>

        <ul className="d-toolbar-group d-toolbar-group--bottom">
          <li className="districtr-toolbar-item">
            <Button>T</Button>
          </li>
        </ul>
      </Toolbar>
    </div>
  )
}

export default Districtr
