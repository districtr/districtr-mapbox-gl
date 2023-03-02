import mapboxgl, {
  MapDataEvent,
  MapLayerMouseEvent,
  MapboxGeoJSONFeature,
  Map as MapboxMap,
  Point,
  PointLike
} from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import React, { useEffect, useRef, useState } from 'react'
import {
  BiChevronDown,
  BiChevronUp,
  BiCloudUpload,
  BiDownload,
  BiExport,
  BiHelpCircle,
  BiImport,
  BiSave,
  BiUpload,
  BiZoomIn,
  BiZoomOut
} from 'react-icons/bi'
import { GrSatellite } from 'react-icons/gr'
import { HiArrowsExpand } from 'react-icons/hi'
import { RxBorderSplit, RxGroup, RxLayers } from 'react-icons/rx'
import { TbMountain } from 'react-icons/tb'

import Button from '../Button'
import Cursor from '../Cursor'
import DebugPanel from '../DebugPanel'
import Toolbar from '../Toolbar'
import UnitProperties from '../UnitProperties'
import { getUnitColorProperty } from '../utils/colors'
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
  mapStyle = 'districtr-v1',
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
    },
    'districtr-v1': {
      name: 'Districtr Light',
      url: 'mapbox://styles/districtr/clek2rian000701o4m5zm294j'
    },
    'districtr-md-v1': {
      name: 'Districtr Maryland Light',
      url: 'mapbox://styles/districtr/cleos4lys000t01mgngsue9zw'
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
  const [unitAssignments, setUnitAssignments] = useState<Map<string, number>>(new Map())
  const [unitPopulations, setUnitPopulations] = useState<Map<string, number>>(new Map())
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

  const [showTerrainOption, setShowTerrainOption] = useState<boolean>(false)
  const [showTerrain, setShowTerrain] = useState<boolean>(true)

  const [showSatelliteOption, setShowSatelliteOption] = useState<boolean>(false)
  const [showSatellite, setShowSatellite] = useState<boolean>(false)

  const [userMapTitle, setUserMapTitle] = useState<string>(title)
  const [menuOpen, setMenuOpen] = useState<boolean>(false)

  const mapboxContainerRef = useRef(null)

  const prevPoint = useRef<Point>(null)
  const brushSize = useRef<number>(5000)
  const titleRef = useRef<HTMLInputElement>(null)

  const mousePosition = useRef<{ x: number; y: number }>(null)

  useEffect(() => {
    // https://docs.mapbox.com/mapbox-gl-js/api/properties/#prewarm
    mapboxgl.prewarm

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

    const sourceColumnSets: [] = columnSets[interactiveLayerIds[activeInteractiveLayer]].columnSets

    const columnKeySets: string[] = []

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
    map.on('idle', onIdle)
    map.on('render', onRender)
    map.on('error', onError)
    map.on('data', onData)
    map.on('styledata', onStyleData)
    map.on('sourcedata', onSourceData)
    map.on('dataloading', onDataLoading)
    map.on('styledataloading', onStyleDataLoading)
    map.on('sourcedataloading', onSourceDataLoading)

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

    map.setStyle(mapStyleOptions.current[mapStyleName].url)
  }, [mapStyleName])

  useEffect(() => {}, [unitPopulations])

  useEffect(() => {
    if (!map) {
      return
    }
    const populations = new Map()
    const columnPopulations = new Map()

    if (unitAssignments.size === 0) {
      Object.keys(units).every((unit) => {
        populations.set(unit, 0)

        columnKeys.forEach((columnKey) => {
          if (!columnPopulations.has(unit)) {
            columnPopulations.set(unit, {})
          }

          const column = columnPopulations.get(unit)
          column[columnKey] = 0
          columnPopulations.set(unit, column)
        })

        return true
      })
    }

    for (let geoid of unitAssignments.keys()) {
      const unit = unitAssignments.get(geoid)

      if (populations.has(unit)) {
        populations.set(unit, populations.get(unit) + unitPopulations.get(geoid))
      } else {
        populations.set(unit, unitPopulations.get(geoid))
      }

      columnKeys.forEach((columnKey) => {
        if (!columnPopulations.has(unit)) {
          columnPopulations.set(unit, {})
        }

        const recordKey = `${columnKey}-${geoid}`

        const column = columnPopulations.get(unit)

        if (column[columnKey]) {
          column[columnKey] += unitColumnPopulations.get(recordKey)
        } else {
          column[columnKey] = unitColumnPopulations.get(recordKey)
        }

        columnPopulations.set(unit, column)
      })
    }

    if (units && Object.keys(units).length != 0) {
      let newUnits = JSON.parse(JSON.stringify(units))

      for (let unit of populations.keys()) {
        newUnits[unit].population = populations.get(unit)
        newUnits[unit].columnPopulations = columnPopulations.get(unit)
      }

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

    //const assignments = { ...unitAssignments }
    const assignments = new Map([...unitAssignments])
    let pops = new Map()
    let cpops = new Map()

    hoveredFeatures.forEach((feature) => {
      if (coloring) {
        pops.set(feature.properties[geometryKey], feature.properties[featureKey])

        columnKeys.forEach((columnKey) => {
          const cpop_key = `${columnKey}-${feature.properties[geometryKey]}`
          const cpop_value = feature.properties[columnKey]
          cpops.set(cpop_key, cpop_value)
        })

        let paintUnit = activeUnit

        if (activeTool.name === 'eraser') {
          assignments.delete(feature.properties[geometryKey])
          paintUnit = 0
        } else {
          assignments.set(feature.properties[geometryKey], activeUnit)
        }

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

    const mapsAreEqual = (m1, m2) =>
      m1.size === m2.size && Array.from(m1.keys()).every((key) => m1.get(key) === m2.get(key))

    if (!mapsAreEqual(unitAssignments, assignments)) {
      setUnitAssignments(new Map([...assignments]))
      setUnitPopulations(new Map([...unitPopulations, ...pops]))
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

      if (!map.getLayer(interactiveLayerIds[activeInteractiveLayer]) || !map.isStyleLoaded()) {
        return
      }

      map.setPaintProperty(interactiveLayerIds[activeInteractiveLayer], 'fill-color', defaultInteractiveColorScheme)
      map.setPaintProperty(interactiveLayerIds[activeInteractiveLayer], 'fill-opacity', 0.8)
    }
  }, [units])

  useEffect(() => {
    if (!map) {
      return
    }

    if (!showTerrain) {
      map.setLayoutProperty('terrain-option', 'visibility', 'none')
    } else {
      map.setLayoutProperty('terrain-option', 'visibility', 'visible')
    }
  }, [showTerrain])

  useEffect(() => {
    if (!map) {
      return
    }

    if (!showSatellite) {
      map.setLayoutProperty('satellite-option', 'visibility', 'none')
    } else {
      map.setLayoutProperty('satellite-option', 'visibility', 'visible')
    }
  }, [showSatellite])

  const onZoom = (e: ViewStateChangeEvent) => {
    if (currentZoom !== map.getZoom()) {
      setCurrentZoom(map.getZoom())
    }
    // console.log(map.getZoom())
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

  const getInteractiveLayer = () => {
    if (!map) {
      return
    }
    return map.getLayer(interactiveLayerIds[activeInteractiveLayer])
  }

  const getHoveredFeatures = (cPoint) => {
    if (!map) {
      return
    }
    const box: [PointLike, PointLike] = getBoxAroundPoint(cPoint, brushSize.current)

    return map.queryRenderedFeatures(box, {
      layers: [interactiveLayerIds[activeInteractiveLayer]]
    })
  }

  const onMouseMove = (e: MapLayerMouseEvent) => {
    if (!map) {
      return
    }
    mousePosition.current = { x: e.point.x, y: e.point.y }
    const cPoint = e.point
    let pPoint = prevPoint.current

    if (!pPoint) {
      prevPoint.current = cPoint
      pPoint = prevPoint.current
    }

    // @ts-ignore
    const dist = Math.sqrt(Math.pow(cPoint.x - pPoint.x, 2) + Math.pow(cPoint.y - pPoint.y, 2))
    const rads = Math.atan2(cPoint.y - pPoint.y, cPoint.x - pPoint.x)

    const offsetFactor = 15
    const threshold = convertBrushSizeToPixels(currentZoom, brushSize.current) / offsetFactor

    if (dist < threshold) {
      // returning here prevents the brush from being drawn and could save memory but results in a jittery brush
      // alternately, tweaking this value could result in a smoother brush for denser areas that slow the unrestrained brush down.
      return
    }

    if (activeTool.name === 'brush' || activeTool.name === 'eraser') {
      const interactiveLayer = getInteractiveLayer()
      if (!interactiveLayer) {
        return
      }

      const features = getHoveredFeatures(cPoint)

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

  const onIdle = (e) => {
    //console.log('idle', e)
  }

  const onRender = (e) => {
    //console.log('render', e)
  }

  const onError = (e) => {
    //console.log('error', e.message)
  }

  const onData = (e: MapDataEvent) => {
    //console.log('data', e)
  }

  const onStyleData = (e: MapDataEvent) => {
    console.log('style data', e)
  }

  const onSourceData = (e: MapDataEvent) => {
    //console.log('source data', e)
  }

  const onDataLoading = (e: MapDataEvent) => {
    //console.log('data loading', e)
  }

  const onSourceDataLoading = (e: MapDataEvent) => {
    //console.log('source data loading', e)
  }

  const onStyleDataLoading = (e: MapDataEvent) => {
    console.log('style data loading', e)
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

    const terrain = map.getLayer('terrain-option')
    const satellite = map.getLayer('satellite-option')

    if (terrain) {
      setShowTerrainOption(true)
      if (map.getLayoutProperty('terrain-option', 'visibility') === 'visible') {
        setShowTerrain(true)
      } else {
        setShowTerrain(false)
      }
    }
    if (map.getLayer('satellite-option')) {
      setShowSatelliteOption(true)
      if (map.getLayoutProperty('satelitte-option', 'visibility') === 'visible') {
        setShowTerrain(true)
      } else {
        setShowTerrain(false)
      }
    }

    return
  }

  const addInteractiveLayers = (map: MapboxMap, interactiveLayerIds: string[]) => {
    if (!interactiveLayerIds || !map || !units) {
      return
    }

    for (const layerId of interactiveLayerIds) {
      const defaultInteractiveColorScheme = getUnitColorProperty(units)

      if (layerId === interactiveLayerIds[activeInteractiveLayer]) {
        map.setPaintProperty(layerId, 'fill-color', defaultInteractiveColorScheme)
        map.setPaintProperty(layerId, 'fill-opacity', 1)
      } else {
        map.setPaintProperty(layerId, 'fill-opacity', 0)
      }
    }

    console.log(map.getStyle().layers)
    console.log(map.getStyle().sources)
    console.log(map.getStyle())
  }

  return (
    <div
      data-testid="Districtr"
      className={`districtr d-cursor-visible-${cursorVisible} d-cursor-drawing-${drawingMode}`}
    >
      <div className="districtr-menu">
        <ul className="districtr-menu-items">
          <li className="districtr-menu-item">
            <div className="districtr-logo">
              <svg width="143" height="43" viewBox="0 0 143 43" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M17.8318 22.7623L11.7288 30.4589L16.1204 35.997C16.1738 35.969 16.2253 35.9411 16.2808 35.9151C16.7483 35.6972 17.2693 35.5753 17.8199 35.5753C18.3706 35.5753 18.9233 35.7072 19.4027 35.9391C19.4561 35.965 19.5096 35.993 19.5631 36.021L23.7566 30.7307L17.8318 22.7603V22.7623Z"
                  fill="#FF5001"
                />
                <path
                  d="M27.6331 21.691C27.6331 20.6557 28.057 19.7183 28.7365 19.0448L24.6658 13.9104L20.4723 19.5525L18.947 21.605L21.4885 25.0246L24.6658 29.2997L28.6612 24.2592C28.0254 23.5916 27.6331 22.6863 27.6331 21.691Z"
                  fill="#8FBE2A"
                />
                <path
                  d="M17.9289 7.4329C17.3941 7.4329 16.887 7.31699 16.4274 7.10913L11.9526 12.7532L13.9117 15.2235L17.8279 20.162L23.5348 12.4854L22.9663 11.7679L19.3136 7.1611C18.8857 7.33697 18.4202 7.4329 17.9309 7.4329H17.9289Z"
                  fill="#FDCF00"
                />
                <path
                  d="M10.8295 14.1702L6.62012 19.4805C7.08562 20.102 7.36492 20.8755 7.36492 21.7129C7.36492 22.5024 7.1193 23.2338 6.70133 23.8354L10.8314 29.0438L11.8714 27.7307L16.7285 21.607L10.8314 14.1702H10.8295Z"
                  fill="#5AEBEB"
                />
                <path
                  d="M25.7533 12.4494L29.0118 16.5585L27.5915 10.8245C27.4152 10.7846 27.2429 10.7326 27.0765 10.6707L26.9874 10.7886L25.7533 12.4494Z"
                  fill="#B5EEC5"
                />
                <path
                  d="M25.6324 9.66126C25.2026 9.1736 24.8955 8.57202 24.7668 7.90449L21.1992 6.70532L24.6222 11.0223L25.6324 9.66326V9.66126Z"
                  fill="#B5EEC5"
                />
                <path
                  d="M15.0447 6.01982C14.9139 5.85394 14.7971 5.67806 14.696 5.49219H6.96272C6.86566 5.68206 6.75275 5.86193 6.62598 6.03181L10.8314 11.3341L15.0467 6.01982H15.0447Z"
                  fill="#B5EEC5"
                />
                <path
                  d="M25.7533 30.7627L26.9339 32.3516C27.1637 32.2537 27.4034 32.1757 27.6549 32.1257L29.0118 26.6536L26.9299 29.2797L25.7553 30.7627H25.7533Z"
                  fill="#B5EEC5"
                />
                <path
                  d="M21.1973 36.5086L24.7113 35.3275C24.7965 34.606 25.0897 33.9464 25.5274 33.4128L24.6202 32.1917L21.1973 36.5086Z"
                  fill="#B5EEC5"
                />
                <path
                  d="M7.36683 36.2447L6.72107 37.0601C6.86171 37.266 6.98453 37.4858 7.08159 37.7197H14.4841C14.599 37.4698 14.7436 37.236 14.908 37.0201L10.8294 31.8757L7.36683 36.2427V36.2447Z"
                  fill="#B5EEC5"
                />
                <path d="M9.70624 12.7531L5.38794 7.30688V18.1973L6.74087 16.4925L9.70624 12.7531Z" fill="#B5EEC5" />
                <path
                  d="M5.38794 25.0166V35.861C5.38794 35.861 5.40379 35.871 5.41171 35.875L9.70426 30.4608L5.38794 25.0166Z"
                  fill="#B5EEC5"
                />
                <path
                  d="M5.38008 25.0066C5.1602 25.1225 4.92844 25.2144 4.68678 25.2844C4.36786 25.3763 4.03111 25.4263 3.68247 25.4263C3.16745 25.4263 2.67619 25.3184 2.22852 25.1245V35.7391C2.67421 35.5452 3.16547 35.4373 3.68247 35.4373C4.03111 35.4373 4.36588 35.4873 4.68678 35.5792C4.9324 35.6492 5.16813 35.7431 5.388 35.861V25.0166L5.38008 25.0066Z"
                  fill="#333333"
                />
                <path
                  d="M30.6679 10.103C30.0399 10.6087 29.2436 10.9105 28.38 10.9105C28.3641 10.9105 28.3503 10.9105 28.3344 10.9105C28.0789 10.9065 27.8293 10.8785 27.5896 10.8245L29.0099 16.5585L30.0617 17.8856L30.2598 18.1334C30.5946 18.0315 30.9472 17.9775 31.3136 17.9775C31.799 17.9775 32.2605 18.0735 32.6844 18.2453L30.6679 10.103Z"
                  fill="#333333"
                />
                <path
                  d="M6.96082 5.49217H14.6941C14.5733 5.26833 14.4762 5.0325 14.4029 4.78467C14.3019 4.4469 14.2465 4.08915 14.2465 3.71941C14.2465 3.22176 14.3455 2.74609 14.5218 2.31039L7.04797 2.3064C7.25002 2.76608 7.36293 3.27172 7.36293 3.80535C7.36293 4.14312 7.31539 4.47089 7.23219 4.78267C7.16484 5.0305 7.07373 5.26633 6.96082 5.49018V5.49217Z"
                  fill="#333333"
                />
                <path
                  d="M24.6995 7.13494C24.7133 6.25156 25.0342 5.44212 25.5611 4.81056L21.6014 3.47949C21.6073 3.55744 21.6093 3.63738 21.6093 3.71733C21.6093 4.51677 21.3558 5.25825 20.9279 5.86583C20.8665 5.95177 20.8011 6.03571 20.7338 6.11765L21.1993 6.70324L24.7668 7.90241C24.7232 7.67257 24.6995 7.43673 24.6995 7.1949C24.6995 7.17491 24.6995 7.15293 24.6995 7.13294V7.13494Z"
                  fill="#333333"
                />
                <path
                  d="M14.504 40.9075C14.2683 40.4178 14.1356 39.8702 14.1356 39.2906C14.1356 38.9928 14.1712 38.705 14.2366 38.4292C14.296 38.1834 14.3772 37.9455 14.4822 37.7217H7.07971C7.17281 37.9475 7.2461 38.1854 7.29364 38.4292C7.3392 38.663 7.36297 38.9049 7.36297 39.1507C7.36297 39.7862 7.2045 40.3838 6.92322 40.9075H14.502H14.504Z"
                  fill="#333333"
                />
                <path
                  d="M30.0954 25.1944C29.8834 25.1184 29.6814 25.0265 29.4892 24.9146L29.4179 25.0045L29.0099 26.6533L27.653 32.1255C27.8827 32.0796 28.1204 32.0556 28.3641 32.0556C28.374 32.0556 28.3839 32.0556 28.3938 32.0556C29.2753 32.0636 30.0835 32.3833 30.7134 32.913L32.6348 25.1544C32.2228 25.3143 31.7771 25.4042 31.3116 25.4042C30.9055 25.4042 30.5153 25.3363 30.1508 25.2123C30.131 25.2063 30.1132 25.1984 30.0954 25.1924"
                  fill="#333333"
                />
                <path
                  d="M25.7177 38.3473C25.1452 37.7477 24.7689 36.9563 24.6975 36.0769C24.6896 35.975 24.6837 35.8731 24.6837 35.7711C24.6837 35.6212 24.6936 35.4733 24.7114 35.3254L21.1974 36.5066L20.4941 36.7424C20.5872 36.8424 20.6764 36.9483 20.7576 37.0602C20.8249 37.1502 20.8864 37.2421 20.9458 37.338C21.2944 37.9056 21.4984 38.5732 21.4984 39.2907C21.4984 39.4566 21.4866 39.6184 21.4667 39.7783L25.7177 38.3493V38.3473Z"
                  fill="#333333"
                />
                <path
                  d="M5.26717 7.15494C5.08097 7.24488 4.88684 7.31882 4.68678 7.37678C4.36786 7.46872 4.03111 7.51868 3.68247 7.51868C3.16745 7.51868 2.67619 7.39423 2.22852 7.20037V18.2992C2.67421 18.1053 3.16547 17.9974 3.68247 17.9974C4.03111 17.9974 4.36588 18.0473 4.68678 18.1393C4.88486 18.1972 5.07701 18.2692 5.26123 18.3571L5.38999 18.1952V7.30683L5.26915 7.15494H5.26717Z"
                  fill="#333333"
                />
                <path
                  d="M5.388 7.09497C5.34838 7.11496 5.30679 7.13495 5.26717 7.15494L5.388 7.30682V7.09497Z"
                  fill="#333333"
                />
                <path
                  d="M5.38803 18.1973L5.25928 18.3592C5.30286 18.3792 5.34644 18.3992 5.38803 18.4231V18.1973Z"
                  fill="#333333"
                />
                <path
                  d="M30.1351 18.1753C30.1767 18.1613 30.2183 18.1473 30.2598 18.1353L30.0618 17.8875L30.1331 18.1773L30.1351 18.1753Z"
                  fill="#333333"
                />
                <path
                  d="M24.6659 13.9123L28.7366 19.0447C28.9881 18.7969 29.2714 18.5811 29.5844 18.4132C29.7607 18.3192 29.9449 18.2393 30.1351 18.1733L30.0638 17.8835L25.7534 12.4473L26.9875 10.7865L27.0766 10.6686C26.516 10.4547 26.0228 10.105 25.6325 9.66128L24.6223 11.0203L20.7358 6.11775C20.6388 6.23167 20.5377 6.3416 20.4268 6.44353C20.1039 6.74531 19.7276 6.98914 19.3136 7.15903L23.5348 12.4833L17.8279 20.16L11.9526 12.7511L16.4274 7.10706C15.8827 6.86123 15.4093 6.4855 15.0428 6.01782L10.8275 11.3321L6.62212 6.02981C6.2933 6.46951 5.87336 6.83525 5.38606 7.09307V7.30492L9.70238 12.7491L5.38606 18.1953V18.4212C5.86939 18.677 6.28934 19.0407 6.61618 19.4784L10.8255 14.1681L16.7226 21.6049L10.8255 29.0418L6.69542 23.8334C6.35867 24.3191 5.90901 24.7228 5.38408 25.0006V25.0146L9.7004 30.4588L5.40785 35.873C5.93278 36.1568 6.38046 36.5645 6.71523 37.0582L10.8236 31.8758L14.9022 37.0202C15.227 36.5965 15.641 36.2467 16.1145 35.9969L11.7229 30.4588L17.8259 22.7621L23.7507 30.7326L19.5572 36.0229C19.9058 36.2128 20.2208 36.4566 20.4902 36.7464L21.1934 36.5105L24.6164 32.1936L25.5236 33.4147C25.898 32.957 26.3793 32.5913 26.93 32.3554L25.7494 30.7666L29.006 26.6574L29.414 25.0086L29.4853 24.9186C29.1783 24.7408 28.901 24.5189 28.6573 24.2631L24.6619 29.3036L18.9431 21.6089L24.6619 13.9143L24.6659 13.9123Z"
                  fill="#333333"
                />
                <path
                  d="M4.1955 2.30425C4.03505 2.24829 3.86272 2.21631 3.68246 2.21631C2.81286 2.21631 2.10767 2.92981 2.10767 3.8052C2.10767 4.02105 2.15125 4.2289 2.2285 4.41677C2.4662 4.99037 3.02877 5.39409 3.68246 5.39409C3.74387 5.39409 3.80329 5.39009 3.86272 5.3821C4.11825 5.35212 4.35397 5.26218 4.558 5.12428C4.60356 5.0943 4.64516 5.06032 4.68676 5.02635C4.73628 4.98438 4.78184 4.94241 4.82542 4.89444C4.8591 4.85847 4.89079 4.82049 4.92248 4.78052C5.04728 4.61863 5.14236 4.43276 5.19981 4.2309C5.23744 4.095 5.25923 3.9511 5.25923 3.8032C5.25923 3.10769 4.81354 2.5181 4.19748 2.30225L4.1955 2.30425Z"
                  fill="white"
                />
                <path
                  d="M19.0739 2.63007C18.7866 2.32228 18.3806 2.12842 17.9289 2.12842C17.6655 2.12842 17.4179 2.19437 17.2 2.31029C16.6968 2.57611 16.3541 3.10773 16.3541 3.71731C16.3541 3.90518 16.3878 4.08305 16.4472 4.24894C16.5185 4.4488 16.6275 4.62867 16.7661 4.78257C16.7939 4.81255 16.8216 4.84452 16.8533 4.8725C17.1148 5.12033 17.4595 5.28022 17.8418 5.3022C17.8477 5.3022 17.8536 5.3022 17.8616 5.3022C17.8853 5.3022 17.9071 5.3062 17.9309 5.3062C18.2043 5.3062 18.4618 5.23425 18.6856 5.11034C18.7609 5.06837 18.8342 5.0204 18.9015 4.96644C19.0976 4.81255 19.2541 4.61069 19.3591 4.38085C19.4522 4.17899 19.5057 3.95514 19.5057 3.71731C19.5057 3.2956 19.3413 2.91387 19.0758 2.62807L19.0739 2.63007Z"
                  fill="white"
                />
                <path
                  d="M28.38 5.60796C28.2631 5.60796 28.1502 5.62195 28.0412 5.64593C27.3361 5.80382 26.8052 6.43738 26.8052 7.19685C26.8052 7.44068 26.8606 7.67052 26.9597 7.87637C26.9636 7.88237 26.9656 7.89036 26.9696 7.89836C27.0746 8.11421 27.2271 8.30208 27.4133 8.44797C27.5064 8.51992 27.6054 8.58388 27.7144 8.63385C27.7362 8.64384 27.758 8.65183 27.7817 8.66183C27.9679 8.73977 28.17 8.78574 28.3839 8.78574C28.4176 8.78574 28.4513 8.78374 28.483 8.77974C29.2971 8.72778 29.9449 8.05025 29.9567 7.21883C29.9567 7.21084 29.9567 7.20284 29.9567 7.19485C29.9567 6.31746 29.2496 5.60596 28.3819 5.60596L28.38 5.60796Z"
                  fill="white"
                />
                <path
                  d="M32.8626 21.4029C32.7656 20.8693 32.4031 20.4296 31.9197 20.2257C31.7335 20.1478 31.5295 20.1018 31.3136 20.1018C31.1908 20.1018 31.0719 20.1178 30.9551 20.1438C30.8481 20.1698 30.7471 20.2057 30.648 20.2517C30.4182 20.3596 30.2182 20.5215 30.0656 20.7234C29.8596 20.9912 29.7368 21.327 29.7368 21.6907C29.7368 22.0145 29.8339 22.3163 30.0003 22.5681C30.1528 22.7979 30.3628 22.9878 30.6084 23.1117C30.6817 23.1477 30.757 23.1797 30.8362 23.2056C30.9867 23.2536 31.1452 23.2796 31.3116 23.2796C31.4562 23.2796 31.5969 23.2596 31.7296 23.2216C32.3615 23.0458 32.8349 22.4801 32.8805 21.7986C32.8824 21.7626 32.8864 21.7267 32.8864 21.6907C32.8864 21.5928 32.8765 21.4968 32.8587 21.4029H32.8626Z"
                  fill="white"
                />
                <path
                  d="M28.3661 34.1822C28.3424 34.1822 28.3206 34.1862 28.2988 34.1862C28.1403 34.1922 27.9898 34.2241 27.8472 34.2741C27.7541 34.3081 27.6629 34.3461 27.5778 34.396C27.4767 34.456 27.3817 34.5259 27.2965 34.6079C27.1142 34.7798 26.9716 34.9936 26.8864 35.2354C26.8726 35.2734 26.8607 35.3134 26.8508 35.3534C26.8151 35.4873 26.7933 35.6252 26.7933 35.7691C26.7933 36.6465 27.5005 37.358 28.3681 37.358C28.5444 37.358 28.7128 37.328 28.8713 37.274C29.3328 37.1161 29.6973 36.7504 29.8558 36.2847C29.9112 36.1228 29.9429 35.9489 29.9429 35.7691C29.9429 34.8917 29.2357 34.1802 28.3681 34.1802L28.3661 34.1822Z"
                  fill="white"
                />
                <path
                  d="M19.3333 38.8589C19.262 38.607 19.1333 38.3812 18.9589 38.1973C18.9114 38.1473 18.8599 38.1014 18.8084 38.0574C18.6301 37.9115 18.4221 37.8036 18.1923 37.7476C18.129 37.7316 18.0636 37.7196 17.9962 37.7117C17.9388 37.7057 17.8794 37.7017 17.818 37.7017C17.7783 37.7017 17.7387 37.7057 17.6991 37.7077C17.6298 37.7137 17.5624 37.7216 17.4971 37.7356C17.194 37.7996 16.9246 37.9515 16.7126 38.1613C16.6314 38.2413 16.5601 38.3312 16.4987 38.4292C16.4254 38.5451 16.364 38.669 16.3204 38.8029C16.2709 38.9568 16.2432 39.1207 16.2432 39.2906C16.2432 40.1659 16.9503 40.8794 17.818 40.8794C17.8279 40.8794 17.8378 40.8794 17.8477 40.8794C18.022 40.8754 18.1904 40.8435 18.3468 40.7875C18.955 40.5677 19.3927 39.9821 19.3927 39.2926C19.3927 39.1427 19.371 38.9988 19.3333 38.8609V38.8589Z"
                  fill="white"
                />
                <path
                  d="M5.24135 38.9247C5.2156 38.7488 5.16211 38.5809 5.08486 38.427C5.04128 38.3411 4.98978 38.2591 4.93233 38.1812C4.86102 38.0872 4.77981 37.9993 4.68869 37.9234C4.50446 37.7695 4.28459 37.6595 4.0449 37.6016C3.93001 37.5736 3.80918 37.5576 3.68636 37.5576C3.03268 37.5576 2.47011 37.9613 2.23241 38.5349C2.15515 38.7228 2.11157 38.9307 2.11157 39.1465C2.11157 40.0239 2.81874 40.7354 3.68636 40.7354C3.72796 40.7354 3.76956 40.7314 3.81314 40.7294C4.62332 40.6634 5.26314 39.9799 5.26314 39.1465C5.26314 39.0706 5.2572 38.9946 5.24531 38.9207L5.24135 38.9247Z"
                  fill="white"
                />
                <path
                  d="M5.19582 21.275C5.10668 20.9632 4.9284 20.6914 4.68673 20.4895C4.64513 20.4535 4.60155 20.4196 4.55599 20.3896C4.34998 20.2517 4.11228 20.1618 3.85477 20.1338C3.7993 20.1278 3.74186 20.1238 3.68441 20.1238C3.03072 20.1238 2.46816 20.5275 2.23045 21.1011C2.1532 21.289 2.10962 21.4968 2.10962 21.7127C2.10962 21.9285 2.1532 22.1364 2.23045 22.3242C2.46816 22.8978 3.03072 23.3016 3.68441 23.3016C3.79336 23.3016 3.90033 23.2896 4.00333 23.2676C4.24698 23.2156 4.46884 23.1097 4.659 22.9598C4.6689 22.9518 4.67881 22.9418 4.68871 22.9338C4.97 22.698 5.16808 22.3642 5.23345 21.9865C5.2493 21.8985 5.2592 21.8066 5.2592 21.7147C5.2592 21.5628 5.23543 21.4169 5.19582 21.277V21.275Z"
                  fill="white"
                />
                <path
                  d="M20.9477 37.338C20.8883 37.2421 20.8269 37.1501 20.7595 37.0602C20.6763 36.9503 20.5891 36.8444 20.496 36.7424C20.2266 36.4546 19.9117 36.2088 19.5631 36.0189C19.5096 35.9909 19.4581 35.963 19.4026 35.937C18.9232 35.7051 18.3864 35.5732 17.8199 35.5732C17.2534 35.5732 16.7502 35.6952 16.2808 35.913C16.2273 35.939 16.1738 35.967 16.1203 35.9949C15.6469 36.2448 15.2329 36.5945 14.908 37.0182C14.7416 37.2341 14.599 37.4679 14.4841 37.7177C14.3791 37.9416 14.2979 38.1794 14.2385 38.4252C14.1731 38.7011 14.1375 38.9909 14.1375 39.2867C14.1375 39.8662 14.2702 40.4139 14.5059 40.9035C15.1021 42.1447 16.3639 43.0001 17.8199 43.0001C19.6859 43.0001 21.231 41.591 21.4687 39.7723C21.4885 39.6124 21.5003 39.4505 21.5003 39.2847C21.5003 38.5691 21.2983 37.8996 20.9477 37.332V37.338ZM18.3468 40.7856C18.1903 40.8416 18.0239 40.8755 17.8476 40.8775C17.8377 40.8775 17.8278 40.8775 17.8179 40.8775C16.9503 40.8775 16.2431 40.164 16.2431 39.2886C16.2431 39.1188 16.2708 38.9549 16.3204 38.801C16.3639 38.6671 16.4234 38.5432 16.4986 38.4273C16.5601 38.3313 16.6314 38.2414 16.7126 38.1594C16.9245 37.9476 17.1959 37.7977 17.497 37.7337C17.5624 37.7197 17.6317 37.7117 17.6991 37.7058C17.7387 37.7038 17.7783 37.6998 17.8179 37.6998C17.8773 37.6998 17.9368 37.7038 17.9962 37.7097C18.0635 37.7177 18.1289 37.7297 18.1923 37.7457C18.4221 37.8017 18.6301 37.9096 18.8083 38.0555C18.8618 38.0995 18.9133 38.1454 18.9589 38.1954C19.1332 38.3793 19.262 38.6071 19.3333 38.8569C19.3709 38.9949 19.3927 39.1388 19.3927 39.2886C19.3927 39.9782 18.9549 40.5638 18.3468 40.7836V40.7856Z"
                  fill="#333333"
                />
                <path
                  d="M7.29357 38.4291C7.24603 38.1833 7.17273 37.9455 7.07963 37.7216C6.98257 37.4878 6.85976 37.2679 6.71911 37.0621C6.38435 36.5684 5.93667 36.1607 5.41174 35.8769C5.40382 35.8729 5.39589 35.8669 5.38797 35.8629C5.16611 35.745 4.93039 35.6511 4.68674 35.5811C4.36782 35.4892 4.03107 35.4392 3.68244 35.4392C3.16741 35.4392 2.67616 35.5471 2.22848 35.741C0.919124 36.3106 0 37.6257 0 39.1526C0 41.2012 1.65205 42.866 3.68046 42.866C5.08093 42.866 6.30115 42.0726 6.92314 40.9094C7.20245 40.3858 7.3629 39.7882 7.3629 39.1526C7.3629 38.9048 7.33913 38.665 7.29357 38.4311V38.4291ZM3.80921 40.7335C3.76762 40.7375 3.72602 40.7395 3.68244 40.7395C2.81284 40.7395 2.10765 40.026 2.10765 39.1506C2.10765 38.9348 2.15123 38.7269 2.22848 38.539C2.46618 37.9654 3.02875 37.5617 3.68244 37.5617C3.80525 37.5617 3.92609 37.5777 4.04098 37.6057C4.28066 37.6617 4.50054 37.7736 4.68476 37.9275C4.77588 38.0034 4.8571 38.0894 4.92841 38.1853C4.98585 38.2612 5.03735 38.3432 5.08093 38.4311C5.15819 38.585 5.21365 38.7509 5.23742 38.9288C5.24733 39.0027 5.25525 39.0767 5.25525 39.1546C5.25525 39.988 4.61543 40.6716 3.80525 40.7375L3.80921 40.7335Z"
                  fill="#333333"
                />
                <path
                  d="M7.29357 20.9894C7.24603 20.7436 7.17273 20.5058 7.07963 20.2819C6.98257 20.0481 6.85976 19.8282 6.71911 19.6224C6.38435 19.1287 5.93667 18.721 5.41174 18.4372C5.40382 18.4332 5.39589 18.4272 5.38797 18.4232C5.16611 18.3053 4.93039 18.2114 4.68674 18.1414C4.36782 18.0495 4.03107 17.9995 3.68244 17.9995C3.16741 17.9995 2.67616 18.1074 2.22848 18.3013C0.919124 18.8709 0 20.186 0 21.7129C0 23.7615 1.65205 25.4263 3.68046 25.4263C5.08093 25.4263 6.30115 24.6329 6.92314 23.4697C7.20245 22.9461 7.3629 22.3485 7.3629 21.7129C7.3629 21.4651 7.33913 21.2253 7.29357 20.9914V20.9894ZM3.80921 23.2938C3.76762 23.2978 3.72602 23.2998 3.68244 23.2998C2.81284 23.2998 2.10765 22.5863 2.10765 21.7109C2.10765 21.4951 2.15123 21.2872 2.22848 21.0993C2.46618 20.5257 3.02875 20.122 3.68244 20.122C3.80525 20.122 3.92609 20.138 4.04098 20.166C4.28066 20.222 4.50054 20.3339 4.68476 20.4878C4.77588 20.5637 4.8571 20.6497 4.92841 20.7456C4.98585 20.8215 5.03735 20.9035 5.08093 20.9914C5.15819 21.1453 5.21365 21.3112 5.23742 21.4891C5.24733 21.563 5.25525 21.637 5.25525 21.7149C5.25525 22.5483 4.61543 23.2319 3.80525 23.2978L3.80921 23.2938Z"
                  fill="#333333"
                />
                <path
                  d="M31.9772 35.0495C31.9296 34.8037 31.8563 34.5658 31.7632 34.342C31.6662 34.1081 31.5434 33.8883 31.4027 33.6824C31.0679 33.1888 30.6203 32.7811 30.0953 32.4973C30.0874 32.4933 30.0795 32.4873 30.0716 32.4833C29.8497 32.3654 29.614 32.2714 29.3703 32.2015C29.0514 32.1095 28.7147 32.0596 28.366 32.0596C27.851 32.0596 27.3598 32.1675 26.9121 32.3614C25.6027 32.931 24.6836 34.246 24.6836 35.773C24.6836 37.8216 26.3356 39.4864 28.3641 39.4864C29.7645 39.4864 30.9847 38.6929 31.6067 37.5298C31.886 37.0061 32.0465 36.4085 32.0465 35.773C32.0465 35.5252 32.0227 35.2853 31.9772 35.0515V35.0495ZM28.4928 37.3539C28.4512 37.3579 28.4096 37.3599 28.366 37.3599C27.4964 37.3599 26.7912 36.6464 26.7912 35.771C26.7912 35.5551 26.8348 35.3473 26.9121 35.1594C27.1498 34.5858 27.7123 34.1821 28.366 34.1821C28.4888 34.1821 28.6097 34.1981 28.7246 34.2261C28.9643 34.282 29.1841 34.3939 29.3684 34.5478C29.4595 34.6238 29.5407 34.7097 29.612 34.8057C29.6694 34.8816 29.7209 34.9635 29.7645 35.0515C29.8418 35.2054 29.8972 35.3713 29.921 35.5491C29.9309 35.6231 29.9388 35.697 29.9388 35.775C29.9388 36.6084 29.299 37.2919 28.4888 37.3579L28.4928 37.3539Z"
                  fill="#333333"
                />
                <path
                  d="M34.9287 20.9654C34.8811 20.7196 34.8079 20.4817 34.7148 20.2559C34.6177 20.022 34.4949 19.8022 34.3542 19.5943C34.0195 19.1007 33.5718 18.691 33.0449 18.4072C33.037 18.4032 33.029 18.3972 33.0211 18.3932C32.7993 18.2753 32.5635 18.1813 32.3179 18.1114C31.999 18.0194 31.6622 17.9695 31.3136 17.9695C30.7966 17.9695 30.3053 18.0774 29.8577 18.2713C28.5463 18.8409 27.6272 20.158 27.6272 21.6869C27.6272 23.7375 29.2812 25.4063 31.3136 25.4063C32.7161 25.4063 33.9363 24.6128 34.5602 23.4477C34.8395 22.924 35 22.3244 35 21.6889C35 21.4411 34.9762 21.1992 34.9287 20.9654ZM31.4404 23.2718C31.3988 23.2758 31.3572 23.2778 31.3136 23.2778C30.444 23.2778 29.7368 22.5643 29.7368 21.6869C29.7368 21.469 29.7804 21.2632 29.8596 21.0733C30.0973 20.4997 30.6599 20.094 31.3156 20.094C31.4384 20.094 31.5592 20.11 31.6741 20.138C31.9138 20.1939 32.1357 20.3059 32.3199 20.4597C32.411 20.5357 32.4922 20.6216 32.5635 20.7176C32.621 20.7935 32.6725 20.8775 32.7161 20.9634C32.7933 21.1173 32.8488 21.2832 32.8745 21.461C32.8844 21.535 32.8923 21.6089 32.8923 21.6869C32.8923 22.5223 32.2525 23.2058 31.4404 23.2718Z"
                  fill="#333333"
                />
                <path
                  d="M31.9951 6.4715C31.9476 6.22567 31.8743 5.98783 31.7812 5.76199C31.6841 5.52815 31.5613 5.30831 31.4206 5.10045C31.0859 4.6068 30.6382 4.19708 30.1113 3.91328C30.1034 3.90928 30.0954 3.90329 30.0875 3.89929C29.8657 3.78137 29.6299 3.68744 29.3843 3.61749C29.0654 3.52555 28.7286 3.47559 28.38 3.47559C27.863 3.47559 27.3717 3.58351 26.9241 3.77738C25.6127 4.34698 24.6936 5.66406 24.6936 7.19299C24.6936 9.24356 26.3476 10.9124 28.38 10.9124C29.7825 10.9124 31.0027 10.119 31.6267 8.95376C31.906 8.43013 32.0664 7.83055 32.0664 7.19499C32.0664 6.94716 32.0426 6.70533 31.9951 6.4715ZM28.5068 8.77789C28.4652 8.78188 28.4236 8.78388 28.38 8.78388C27.5104 8.78388 26.8032 8.07038 26.8032 7.19299C26.8032 6.97515 26.8468 6.76929 26.926 6.57942C27.1637 6.00582 27.7263 5.6001 28.382 5.6001C28.5048 5.6001 28.6256 5.61609 28.7405 5.64407C28.9802 5.70003 29.2021 5.81196 29.3863 5.96585C29.4774 6.0418 29.5586 6.12774 29.6299 6.22367C29.6874 6.29962 29.7389 6.38356 29.7825 6.4695C29.8597 6.62339 29.9152 6.78927 29.9409 6.96715C29.9508 7.0411 29.9588 7.11505 29.9588 7.19299C29.9588 8.02841 29.3189 8.71193 28.5068 8.77789Z"
                  fill="#333333"
                />
                <path
                  d="M21.5439 2.99591C21.4964 2.75008 21.4231 2.51225 21.33 2.2864C21.2329 2.05257 21.1101 1.83272 20.9695 1.62487C20.6347 1.13121 20.187 0.721497 19.6601 0.437695C19.6522 0.433697 19.6443 0.427702 19.6363 0.423704C19.4145 0.305787 19.1788 0.211852 18.9331 0.141901C18.6142 0.0499651 18.2775 0 17.9288 0C17.4118 0 16.9206 0.107925 16.4729 0.301789C15.1616 0.871392 14.2424 2.18847 14.2424 3.71741C14.2424 5.76798 15.8965 7.43681 17.9288 7.43681C19.3313 7.43681 20.5515 6.64337 21.1755 5.47818C21.4548 4.95454 21.6152 4.35496 21.6152 3.71941C21.6152 3.47158 21.5915 3.22975 21.5439 2.99591ZM18.0556 5.3023C18.014 5.3063 17.9724 5.3083 17.9288 5.3083C17.0592 5.3083 16.3521 4.59479 16.3521 3.71741C16.3521 3.49956 16.3956 3.2937 16.4749 3.10383C16.7126 2.53023 17.2751 2.12452 17.9308 2.12452C18.0536 2.12452 18.1745 2.14051 18.2894 2.16849C18.529 2.22445 18.7509 2.33637 18.9351 2.49026C19.0262 2.56621 19.1075 2.65215 19.1788 2.74808C19.2362 2.82403 19.2877 2.90797 19.3313 2.99391C19.4085 3.1478 19.464 3.31369 19.4898 3.49156C19.4997 3.56551 19.5076 3.63946 19.5076 3.71741C19.5076 4.55282 18.8678 5.23635 18.0556 5.3023Z"
                  fill="#333333"
                />
                <path
                  d="M7.34312 3.0838C7.29558 2.83797 7.22228 2.60014 7.12918 2.3743C7.03212 2.14046 6.9093 1.92061 6.76866 1.71276C6.4339 1.2191 5.98622 0.809387 5.45931 0.525585C5.45138 0.521588 5.44346 0.515592 5.43554 0.511595C5.21368 0.393677 4.97796 0.299743 4.73233 0.229792C4.41341 0.137856 4.07666 0.0878906 3.72803 0.0878906C3.21102 0.0878906 2.71976 0.195815 2.27209 0.38968C0.96075 0.961281 0.041626 2.27636 0.041626 3.8053C0.041626 5.85587 1.69565 7.5247 3.72803 7.5247C5.13048 7.5247 6.3507 6.73126 6.97467 5.56607C7.25398 5.04243 7.41443 4.44285 7.41443 3.8073C7.41443 3.55947 7.39066 3.31764 7.34312 3.0838ZM3.8548 5.39019C3.8132 5.39419 3.77161 5.39619 3.72803 5.39619C2.85842 5.39619 2.15125 4.68269 2.15125 3.8053C2.15125 3.58745 2.19483 3.38159 2.27407 3.19173C2.51177 2.61813 3.07434 2.21241 3.73001 2.21241C3.85282 2.21241 3.97365 2.2284 4.08854 2.25638C4.32823 2.31234 4.55009 2.42426 4.73431 2.57815C4.82543 2.6541 4.90664 2.74004 4.97796 2.83597C5.0354 2.91192 5.0869 2.99586 5.13048 3.0818C5.20774 3.23569 5.2632 3.40158 5.28895 3.57945C5.29886 3.6534 5.30678 3.72735 5.30678 3.8053C5.30678 4.64071 4.66696 5.32424 3.8548 5.39019Z"
                  fill="#333333"
                />
                <path
                  d="M50.608 22.3119C50.608 26.8199 49.068 28.6399 47.36 29.3959L44.7 29.2279V15.6199H46.408C48.816 15.6199 50.608 17.0199 50.608 22.3119ZM56.18 22.3119C56.18 16.2919 52.372 12.9039 46.688 12.9039H38.176C37.868 13.3799 37.672 14.1639 37.672 14.9199V15.2279L39.632 15.5359V29.3679L37.896 29.6759L37.644 31.9999H46.268C52.12 31.9999 56.18 28.2199 56.18 22.3119Z"
                  fill="#333333"
                />
                <path
                  d="M64.1563 14.0799C64.1563 12.6519 63.1763 11.7839 61.6643 11.7839C60.1243 11.7839 59.1163 12.6519 59.1163 14.0799C59.1163 15.3679 60.0403 16.3479 61.6643 16.3479C63.2883 16.3479 64.1563 15.3679 64.1563 14.0799ZM65.8083 29.8719L64.0163 29.5639V17.9999L57.8283 18.9239V20.4359C58.0243 20.7439 58.2203 20.9399 58.8923 21.1919L59.3963 21.3879V29.5639L57.8283 29.8719L57.5483 31.9999H65.3043C65.6123 31.5239 65.8083 30.7399 65.8083 30.0119V29.8719Z"
                  fill="#333333"
                />
                <path
                  d="M77.3224 27.6319C77.3224 23.1519 71.4424 23.5159 71.4424 21.5559C71.4424 21.0239 71.7224 20.6599 71.8904 20.6319C72.0304 20.6039 72.3385 20.5759 72.6185 20.5759C73.1224 20.5759 73.7104 20.6599 74.1024 20.8559L74.4384 22.4239H74.7464C75.4184 22.4239 76.3984 22.2839 76.7904 22.0319V18.6719C75.8664 18.3079 74.1864 18.0839 72.9544 18.0839C69.1464 18.0839 66.9904 20.2679 66.9904 22.7319C66.9904 27.0999 72.8984 26.5959 72.8984 28.7799C72.8984 29.3399 72.5904 29.6759 72.4224 29.7319C72.2544 29.7599 71.9184 29.7879 71.5544 29.7879C70.9384 29.7879 70.3504 29.6759 69.9304 29.4799L69.6224 27.9399H69.2864C68.6144 27.9399 67.6625 28.0799 67.2425 28.3039V31.6079C68.4465 32.0279 69.9024 32.2799 71.3584 32.2799C74.8024 32.2799 77.3224 30.3199 77.3224 27.6319Z"
                  fill="#333333"
                />
                <path
                  d="M87.813 29.9559L87.561 28.4719C87.057 28.7799 86.329 28.9479 85.741 28.9479C84.929 28.9479 84.621 28.7239 84.621 28.1359V20.9679H87.533C87.645 20.4919 87.701 20.1559 87.701 19.6799C87.701 19.2039 87.645 18.8119 87.533 18.3639H84.621V15.7599H84.285C81.821 16.3199 79.581 18.2239 78.685 19.9319V20.5199L79.973 20.9679V28.4999C79.973 30.9079 81.205 32.2799 83.781 32.2799C85.489 32.2799 86.973 31.4679 87.813 29.9559Z"
                  fill="#333333"
                />
                <path
                  d="M99.5809 22.5359L99.3849 18.2799C99.1049 18.1679 98.7409 18.0839 98.3489 18.0839C97.2849 18.0839 96.8369 18.5319 95.3249 20.5759H95.1569L94.8489 17.9999L89.1369 18.9239V20.4359C89.3329 20.7439 89.5289 20.9399 90.2009 21.1919L90.7049 21.3879V29.5639L89.1369 29.8719L88.8569 31.9999H96.8649C97.1729 31.5239 97.3689 30.7399 97.3689 30.0119V29.8719L95.3249 29.5639V23.0119C96.9489 22.9279 98.4889 22.7879 99.5809 22.5359Z"
                  fill="#333333"
                />
                <path
                  d="M107.031 14.0799C107.031 12.6519 106.051 11.7839 104.539 11.7839C102.999 11.7839 101.991 12.6519 101.991 14.0799C101.991 15.3679 102.915 16.3479 104.539 16.3479C106.163 16.3479 107.031 15.3679 107.031 14.0799ZM108.683 29.8719L106.891 29.5639V17.9999L100.703 18.9239V20.4359C100.899 20.7439 101.095 20.9399 101.767 21.1919L102.271 21.3879V29.5639L100.703 29.8719L100.423 31.9999H108.179C108.487 31.5239 108.683 30.7399 108.683 30.0119V29.8719Z"
                  fill="#333333"
                />
                <path
                  d="M120.477 29.7879L120.253 27.9679C119.581 28.4719 118.573 28.7519 117.677 28.7519C115.801 28.7519 114.653 27.5199 114.653 25.1679C114.653 22.9559 115.521 21.6679 116.025 21.6679C117.061 21.6679 118.741 21.8359 119.861 22.0879C120.029 21.0239 120.141 19.4559 120.141 18.4479C119.301 18.2519 117.873 18.0839 117.005 18.0839C112.945 18.0839 109.725 20.6599 109.725 25.4479C109.725 29.8439 112.553 32.2799 116.137 32.2799C118.349 32.2799 119.805 31.2719 120.477 29.7879Z"
                  fill="#333333"
                />
                <path
                  d="M130.852 29.9559L130.6 28.4719C130.096 28.7799 129.368 28.9479 128.78 28.9479C127.968 28.9479 127.66 28.7239 127.66 28.1359V20.9679H130.572C130.684 20.4919 130.74 20.1559 130.74 19.6799C130.74 19.2039 130.684 18.8119 130.572 18.3639H127.66V15.7599H127.324C124.86 16.3199 122.62 18.2239 121.724 19.9319V20.5199L123.012 20.9679V28.4999C123.012 30.9079 124.244 32.2799 126.82 32.2799C128.528 32.2799 130.012 31.4679 130.852 29.9559Z"
                  fill="#333333"
                />
                <path
                  d="M142.62 22.5359L142.424 18.2799C142.144 18.1679 141.78 18.0839 141.388 18.0839C140.324 18.0839 139.876 18.5319 138.364 20.5759H138.196L137.888 17.9999L132.176 18.9239V20.4359C132.372 20.7439 132.568 20.9399 133.24 21.1919L133.744 21.3879V29.5639L132.176 29.8719L131.896 31.9999H139.904C140.212 31.5239 140.408 30.7399 140.408 30.0119V29.8719L138.364 29.5639V23.0119C139.988 22.9279 141.528 22.7879 142.62 22.5359Z"
                  fill="#333333"
                />
              </svg>
            </div>
          </li>
          <li className="districtr-menu-item" style={{ textAlign: 'center' }}>
            <div className="districtr-menu-main">
              <div>
                <input
                  type="text"
                  ref={titleRef}
                  className="d-ghost-input"
                  value={userMapTitle}
                  width={userMapTitle.length * 8}
                  style={{ width: userMapTitle.length * 8 }}
                  onChange={(e) => setUserMapTitle(e.target.value)}
                />
              </div>
              <Button
                size="large"
                variant="toggle"
                onClick={() => {
                  setMenuOpen(!menuOpen)
                }}
              >
                {!menuOpen ? <BiChevronDown /> : <BiChevronUp />}
              </Button>
            </div>
          </li>
          <li className="districtr-menu-item">
            <Button onClick={() => alert('Publishing')}>
              <BiCloudUpload />
              &nbsp;Publish
            </Button>
          </li>
        </ul>
      </div>

      <div className={menuOpen ? 'districtr-menu-overlay districtr-menu-overlay--active' : 'districtr-menu-overlay'}>
        <div className="districtr-menu-overlay-content">
          <div className="districtr-menu-overlay-content-header">
            <h2>Menu</h2>
            <Button variant="secondary" onClick={() => setMenuOpen(!menuOpen)}>
              Close
            </Button>
          </div>
          <div className="districtr-menu-overlay-content-body">
            <ul className="districtr-menu-overlay-content-body-list">
              <li className="districtr-menu-overlay-content-body-list-item">
                <Button variant="primary" onClick={() => alert('Publishing')}>
                  <BiCloudUpload />
                  &nbsp;Publish
                </Button>
              </li>
              <li className="districtr-menu-overlay-content-body-list-item">
                <Button variant="primary" onClick={() => alert('Saving')}>
                  <BiSave />
                  &nbsp;Save
                </Button>
              </li>
              <li className="districtr-menu-overlay-content-body-list-item">
                <Button variant="primary" onClick={() => alert('Loading')}>
                  <BiUpload />
                  &nbsp;Load
                </Button>
              </li>
              <li className="districtr-menu-overlay-content-body-list-item">
                <Button variant="primary" onClick={() => alert('Exporting')}>
                  <BiExport />
                  &nbsp;Export
                </Button>
              </li>
              <li className="districtr-menu-overlay-content-body-list-item">
                <Button variant="primary" onClick={() => alert('Importing')}>
                  <BiImport />
                  &nbsp;Import
                </Button>
              </li>
            </ul>
          </div>
        </div>
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

        {rightPanel === 'unit' && columnKeys && (
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
              <BiZoomIn />
            </Button>
          </li>
          <li className="d-toolbar-item">
            <Button accessibilityLabel="Zoom Out" variant="toolbar" onClick={() => map.zoomOut({ duration: 200 })}>
              <BiZoomOut />
            </Button>
          </li>
          <li className="d-toolbar-item">
            <Button
              disabled={showTerrainOption}
              pressed={showTerrain}
              accessibilityLabel="Terrain Layer"
              variant="toolbar"
              onClick={() => setShowTerrain(!showTerrain)}
            >
              <TbMountain />
            </Button>
          </li>
          <li className="d-toolbar-item">
            <Button
              disabled={showSatelliteOption}
              pressed={showSatellite}
              accessibilityLabel="Satelitte Layer"
              variant="toolbar"
              onClick={() => setShowSatellite(!showSatellite)}
            >
              <GrSatellite />
            </Button>
          </li>
          <li className="d-toolbar-item">
            <Button
              accessibilityLabel="Pan To Bounds"
              variant="toolbar"
              onClick={() => {
                if (map) {
                  map.fitBounds(initialViewState.bounds, { duration: 200 })
                }
              }}
            >
              <HiArrowsExpand />
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
              <RxGroup />
            </Button>
          </li>
          <li className="districtr-toolbar-item">
            <Button
              variant="toolbar"
              pressed={rightPanel === 'debug'}
              onClick={() => (rightPanel === 'debug' ? setRightPanel('') : setRightPanel('debug'))}
            >
              <RxLayers />
            </Button>
          </li>
        </ul>

        <ul className="d-toolbar-group d-toolbar-group--bottom">
          <li className="districtr-toolbar-item">
            <Button variant="toolbar" onClick={() => alert('Downloading PNG')}>
              <BiDownload />
            </Button>
          </li>
          <li className="districtr-toolbar-item">
            <Button variant="toolbar" onClick={() => alert('Open a quick help menu')}>
              <BiHelpCircle />
            </Button>
          </li>
        </ul>
      </Toolbar>
    </div>
  )
}

export default Districtr
