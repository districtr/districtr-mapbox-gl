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
import { BiDownload, BiHelpCircle, BiZoomIn, BiZoomOut } from 'react-icons/bi'
import { GrSatellite } from 'react-icons/gr'
import { HiArrowsExpand } from 'react-icons/hi'
import { RxGroup, RxLayers } from 'react-icons/rx'
import { TbMountain } from 'react-icons/tb'

import Button from '../Button'
import Cursor from '../Cursor'
import DebugPanel from '../DebugPanel'
import Toolbar from '../Toolbar'
import UnitProperties from '../UnitProperties'
import { getUnitColorProperty } from '../utils/colors'
import { defaultMapStyleConfig, defaultToolConfig } from '../utils/defaultConfig'
import { convertBrushSizeToPixels, getBoxAroundPoint } from '../utils/geometry'
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
  columnSets = {},
  mapState,
  setMapState = () => {},
  toolsConfig = defaultToolConfig,
  saveEnabled
}) => {
  const mapStyleOptions = useRef(defaultMapStyleConfig)

  const [map, setMap] = useState<MapboxMap>(null)
  const [drawingMode, setDrawingMode] = useState<boolean>(true)
  const [units, setUnits] = useState<UnitConfigProps>(unitsConfig)
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

  const [currentSave, setCurrentSave] = useState<boolean>(false)
  const [saveLoaded, setSaveLoaded] = useState<boolean>(false)

  const lastSaved = useRef<string>(null)

  const mapboxContainerRef = useRef(null)

  const prevPoint = useRef<Point>(null)
  const brushSize = useRef<number>(5000)

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
    map.setProjection('mercator')

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
          if (columnSet.subgroups) {
            columnSet.subgroups.forEach((subgroup: any) => {
              columnKeySets.push(subgroup.key)
            })
          }
        }
      }
    })

    setColumnKeys(columnKeySets)
  }, [])

  useEffect(() => {
    if (!map) {
      return
    }

    if (!saveLoaded && mapState) {
      setSaveLoaded(true)
      setUnits(mapState && mapState.units ? mapState.units : units)

      const layer = map.getLayer(interactiveLayerIds[activeInteractiveLayer])
      if (!layer) {
        return
      }

      // query all rendered features and set the feature state
      //@ts-ignore
      const features = map.queryRenderedFeatures({ layers: [layer.id] })
      features.forEach((feature: MapboxGeoJSONFeature) => {
        const unitId = feature.properties[geometryKey]

        const unitAssignment = mapState.unitAssignments.get(unitId)
        if (unitAssignment) {
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
              unit: unitAssignment
            }
          )
        }
      })
    }
  }, [mapState])

  useEffect(() => {
    if (map) {
      if (drawingMode) {
        map.dragPan.disable()
        map.doubleClickZoom.disable()
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

  useEffect(() => {
    if (!map) {
      return
    }

    if (saveEnabled && currentSave && saveLoaded) {
      const mapData = map.getStyle()
      const mapDataString = JSON.stringify(mapData)
      const blob = new Blob([mapDataString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = 'map.json'
      const image = map.getCanvas().toDataURL()

      const saveData = {
        style: mapData,
        image: image,
        units: units,
        unitAssignments: unitAssignments,
        unitPopulations: unitPopulations,
        unitColumnPopulations: unitColumnPopulations
      }

      setMapState(saveData)
      lastSaved.current = new Date().toISOString()
    }
    setCurrentSave(false)
  }, [currentSave])

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
    let lastSaveTime
    if (!lastSaved.current) {
      lastSaveTime = new Date('2000-01-01T00:00:00.000Z').getTime()
    } else {
      lastSaveTime = new Date(lastSaved.current).getTime()
    }

    if (Date.now() - lastSaveTime > 5000) {
      setCurrentSave(true)
    }
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
    //console.log('style data', e)
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
    if (satellite) {
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
  }

  return (
    <div
      data-testid="Districtr"
      className={`districtr d-cursor-visible-${cursorVisible} d-cursor-drawing-${drawingMode}`}
    >
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
      <Toolbar position={'right'} units={units} setUnits={setUnits} activeUnit={activeUnit}>
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
          <li className="d-toolbar-item">
            <Button
              variant="toolbar"
              pressed={rightPanel === 'unit'}
              onClick={() => (rightPanel === 'unit' ? setRightPanel('') : setRightPanel('unit'))}
            >
              <RxGroup />
            </Button>
          </li>
          <li className="d-toolbar-item">
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
          <li className="d-toolbar-item">
            <Button variant="toolbar" onClick={() => alert('Downloading PNG')}>
              <BiDownload />
            </Button>
          </li>
          <li className="d-toolbar-item">
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
