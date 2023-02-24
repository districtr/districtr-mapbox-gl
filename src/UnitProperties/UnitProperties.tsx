import { AxisTop } from '@visx/axis'
import { Group } from '@visx/group'
import { ParentSize } from '@visx/responsive'
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale'
import { BarStackHorizontal, Line } from '@visx/shape'
import React, { useEffect } from 'react'

import Button from '../Button'
import './UnitProperties.css'
import { UnitPropertiesProps } from './UnitProperties.types'

const UnitProperties: React.FC<UnitPropertiesProps> = ({
  units,
  setUnits,
  activeUnit,
  setActiveUnit,
  columnSets,
  columnKeys
}) => {
  const defaultChartData = [
    {
      'Total Population': 110,
      name: 'Total Population',
      colors: ['#4a77fe'],
      subgroups: [
        {
          name: 'Subgroups',
          other: 10,
          colors: ['#4a77fe', '#4afed4', '#fefb4a', '#fe4a4a', '#4afea1']
        }
      ]
    }
  ]
  const defaultSubgroups = [
    [
      [
        {
          name: 'foo',
          value: 10,
          colors: ['#4a77fe']
        }
      ],
      [
        {
          name: 'bar',
          value: 10,
          colors: ['#4a77fe']
        }
      ]
    ],
    [
      [
        {
          name: 'foo',
          value: 10,
          colors: ['#4a77fe']
        }
      ],
      [
        {
          name: 'bar',
          value: 10,
          colors: ['#4a77fe']
        }
      ]
    ]
  ]

  const defaultKeys = Object.keys(defaultChartData[0]).filter((d) => d !== 'color' && d !== 'subgroups' && d !== 'name')
  const [allUnitData, setAllUnitData] = React.useState(null)
  const [allData, setAllData] = React.useState(defaultChartData)
  const [chartData, setChartData] = React.useState(defaultChartData)
  const [allSubgroupChartData, setAllSubgroupChartData] = React.useState(defaultSubgroups)
  const [subgroupChartData, setSubgroupChartData] = React.useState(defaultSubgroups[0])
  const [keys, setKeys] = React.useState(defaultKeys)
  const [members, setMembers] = React.useState(units[activeUnit].members)
  const [dataSets, setDataSets] = React.useState(['Population', 'Civilian Voting Age Population'])
  const [activeDataSet, setActiveDataSet] = React.useState('Population')
  const [showPanel, setShowPanel] = React.useState('')

  useEffect(() => {
    const mapping = columnSets.columnSets
    const availableSets = []
    const newData = []
    const subgroupDataSets = []

    for (const [key, value] of Object.entries(mapping)) {
      const subgroupSet = []
      if ('columnPopulations' in units[activeUnit]) {
        const dataset = mapping[key]
        const newDataset = {}
        availableSets.push(dataset.name)
        if ('total' in dataset && dataset.total !== null) {
          //@ts-ignore
          newDataset[dataset.total.name] = Math.round(
            //@ts-ignore
            (units[activeUnit].columnPopulations[dataset.total.key] / units[activeUnit].unitIdealPopulation) * 100
          )
          newDataset['name'] = dataset.total.name
          newDataset['color'] = [units[activeUnit].color]
        }
        if ('subgroups' in dataset) {
          //@ts-ignore
          newDataset['subgroups'] = {}

          dataset.subgroups.forEach((column) => {
            const value = Math.round(
              //@ts-ignore
              (units[activeUnit].columnPopulations[column.key] / units[activeUnit].unitIdealPopulation) * 100
            )
            //@ts-ignore
            newDataset['subgroups'][column.name] = value

            const subgroupData = {
              name: column.name,
              colors: [units[activeUnit].color]
            }
            subgroupData[column.name] = value

            subgroupSet.push([subgroupData])
          })
          newDataset['subgroups']['name'] = 'Subgroups'
          newDataset['subgroups']['colors'] = ['#4a77fe', '#4afed4', '#fefb4a', '#fe4a4a', '#4afea1']
        }
        newData.push(newDataset)
        subgroupDataSets.push(subgroupSet)
      }
    }

    if (newData.length > 0) {
      setAllData(newData)
      setChartData([{ ...newData[dataSets.indexOf(activeDataSet)] }])
      //@ts-ignore
      setAllSubgroupChartData(subgroupDataSets)
      setSubgroupChartData(subgroupDataSets[dataSets.indexOf(activeDataSet)])
      setKeys(
        Object.keys(newData[availableSets.indexOf(activeDataSet)]).filter(
          (d) => d !== 'color' && d !== 'subgroups' && d !== 'name'
        )
      )
      setDataSets(availableSets)
    }

    const newAllUnitData = Object.keys(units).map((unit) => {
      return [
        {
          name: units[unit].name,
          population: Math.round((units[unit].population / units[unit].unitIdealPopulation) * 100),
          colors: [units[unit].color]
        }
      ]
    })

    setAllUnitData(newAllUnitData)
  }, [units, activeUnit])

  useEffect(() => {
    setChartData([allData[dataSets.indexOf(activeDataSet)]])
    //@ts-ignore
    setSubgroupChartData(allSubgroupChartData[dataSets.indexOf(activeDataSet)])

    setKeys(
      Object.keys(allData[dataSets.indexOf(activeDataSet)]).filter(
        (d) => d !== 'color' && d !== 'subgroups' && d !== 'name'
      )
    )
  }, [activeDataSet])

  const getChartStatus = () => {
    if (units[activeUnit].population / units[activeUnit].unitIdealPopulation > 1.2) {
      return 'danger'
    } else if (units[activeUnit].population / units[activeUnit].unitIdealPopulation > 1.075) {
      return 'warning'
    } else {
      return 'success'
    }
  }

  const getChartVariance = () => {
    if (units[activeUnit].population / units[activeUnit].unitIdealPopulation > 1) {
      return `+${(units[activeUnit].population - units[activeUnit].unitIdealPopulation).toLocaleString()}`
    } else if (units[activeUnit].population / units[activeUnit].unitIdealPopulation < 1) {
      return `${(units[activeUnit].population - units[activeUnit].unitIdealPopulation).toLocaleString()}`
    } else {
      return `0`
    }
  }

  const changeActiveUnit = (unitId: string | number) => {
    if (!units) {
      return
    }
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
    <div data-testid="UnitProperties" className={`d-unit-properties d-unit-${getChartStatus()}`}>
      <div className="d-unit-wrapper">
        <div className="d-unit-controls">
          <Button onClick={() => changeActiveUnit('previous')} className="d-unit-control">
            &lt;
          </Button>
          <div>
            {activeUnit} of {Object.keys(units).length}
          </div>
          <Button onClick={() => changeActiveUnit('next')} className="d-unit-control">
            &gt;
          </Button>
        </div>
        <div className="d-unit-header">
          <div className="d-unit-color" style={{ backgroundColor: units[activeUnit].color }} />

          <div className="d-unit-info">
            <div className="d-unit-name">
              <input
                type="text"
                className="d-ghost-input"
                value={units[activeUnit].name}
                onChange={(e) => {
                  const newUnits = JSON.parse(JSON.stringify(units))
                  newUnits[activeUnit].name = e.target.value
                  setUnits({ ...newUnits })
                }}
              />
            </div>
            <div className="d-unit-members">
              {units[activeUnit].population.toLocaleString()} ({getChartVariance()})
            </div>
          </div>
        </div>
        <div className="d-active-data-view">
          <select onChange={(e) => setActiveDataSet(e.target.value)}>
            {dataSets.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div style={{ width: '100%', height: 48, marginBottom: 18 }}>
          <ParentSize>
            {(parent) => (
              <svg width={parent.width} height={parent.height}>
                <rect width={parent.width} height={parent.height} fill="transparent" />
                <Group top={18}>
                  <rect key={`background`} x={0} y={0} height={parent.height} width={parent.width} fill={'#eeeeee'} />
                  <BarStackHorizontal
                    data={chartData}
                    keys={keys}
                    height={parent.height - 18}
                    width={parent.width}
                    y={(d) => d.name}
                    xScale={scaleLinear({
                      range: [0, parent.width],
                      domain: [0, 120]
                    })}
                    yScale={scaleBand({
                      range: [0, 100],
                      domain: chartData.map((d) => d.name),
                      padding: 0
                    })}
                    color={scaleOrdinal({
                      domain: keys,
                      range: [units[activeUnit].color, '#4afed4']
                    })}
                  >
                    {(barStacks) =>
                      barStacks.map((barStack) =>
                        barStack.bars.map((bar) => (
                          <rect
                            key={`bar-stack-${barStack.index}-${bar.index}`}
                            x={bar.x}
                            y={bar.y}
                            height={bar.height}
                            width={bar.width}
                            fill={bar.color}
                          />
                        ))
                      )
                    }
                  </BarStackHorizontal>
                  <AxisTop
                    top={0}
                    scale={scaleLinear({
                      range: [0, parent.width],
                      domain: [0, 120]
                    })}
                    numTicks={5}
                    tickLength={3}
                    hideAxisLine={true}
                    stroke="#000000"
                    tickStroke="#ffffff"
                    tickValues={[100]}
                    tickFormat={(d) => `Ideal`}
                    tickLabelProps={() => ({
                      fill: '#000000',
                      fontSize: 11,
                      textAnchor: 'middle'
                    })}
                  />

                  {Array.from(Array(members).keys()).map((member, i) => {
                    if (i + 1 === members) {
                      return null
                    }
                    return (
                      <Line
                        key={`member-${i}`}
                        from={{
                          x: scaleLinear({
                            domain: [0, 120],
                            range: [0, parent.width]
                          })((100 / members) * (i + 1)),
                          y: parent.height
                        }}
                        to={{
                          x: scaleLinear({
                            domain: [0, 120],
                            range: [0, parent.width]
                          })((100 / members) * (i + 1)),
                          y: 0
                        }}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    )
                  })}

                  {getChartStatus() === 'danger' && (
                    <>
                      <rect
                        key={`background`}
                        x={0}
                        y={0}
                        height={parent.height}
                        width={parent.width}
                        fill={'#a60000'}
                      />
                      <text
                        style={{ fontWeight: 'bold' }}
                        x={parent.width / 2}
                        y={parent.height / 2 - 5}
                        textAnchor="middle"
                        fill="#ffffff"
                      >
                        OVER +
                        {Math.round(
                          (units[activeUnit].population / units[activeUnit].unitIdealPopulation) * 100 - 100
                        ) + '%'}
                      </text>
                    </>
                  )}

                  <Line
                    from={{
                      x: scaleLinear({
                        domain: [0, 120],
                        range: [0, parent.width]
                      })(0),
                      y: parent.height
                    }}
                    to={{
                      x: scaleLinear({
                        domain: [0, 120],
                        range: [0, parent.width]
                      })(0),
                      y: 0
                    }}
                    stroke="#808080"
                    strokeWidth={3}
                  />

                  <Line
                    from={{
                      x: scaleLinear({
                        domain: [0, 120],
                        range: [0, parent.width]
                      })(100),
                      y: parent.height
                    }}
                    to={{
                      x: scaleLinear({
                        domain: [0, 120],
                        range: [0, parent.width]
                      })(100),
                      y: 0
                    }}
                    stroke="#363636"
                    strokeWidth={2}
                  />

                  <Line
                    from={{
                      x: scaleLinear({
                        domain: [0, 120],
                        range: [0, parent.width]
                      })(120),
                      y: parent.height
                    }}
                    to={{
                      x: scaleLinear({
                        domain: [0, 120],
                        range: [0, parent.width]
                      })(120),
                      y: 0
                    }}
                    stroke="#808080"
                    strokeWidth={3}
                  />
                </Group>
              </svg>
            )}
          </ParentSize>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            flexDirection: 'row'
          }}
        >
          <Button
            variant="primary"
            pressed={showPanel === 'all'}
            onClick={() => (showPanel === 'all' ? setShowPanel('') : setShowPanel('all'))}
          >
            All Units
          </Button>
          <Button
            variant="primary"
            pressed={showPanel === 'demographics'}
            onClick={() => (showPanel === 'demographics' ? setShowPanel('') : setShowPanel('demographics'))}
          >
            Demographics
          </Button>
        </div>

        <div style={{ marginTop: 12, width: '100%' }}>
          {showPanel === 'demographics' &&
            subgroupChartData &&
            subgroupChartData.map((data, i) => {
              if (!data) {
                return null
              }
              const subgroupChartKeys = Object.keys(data[0]).filter((key) => key !== 'name' && key !== 'colors')

              return (
                <div className="d-subgroup-chart" style={{ marginTop: 12, width: '100%', height: 36 }}>
                  <ParentSize>
                    {(parent) => (
                      <svg width={parent.width} height={parent.height}>
                        <rect width={parent.width} height={parent.height} fill="transparent" />
                        <Group top={12}>
                          <rect
                            key={`background`}
                            x={0}
                            y={0}
                            height={parent.height - 12}
                            width={parent.width}
                            fill={'#eeeeee'}
                          />
                          <BarStackHorizontal
                            data={data}
                            keys={subgroupChartKeys}
                            height={parent.height - 12}
                            width={parent.width}
                            y={(d) => d.name}
                            xScale={scaleLinear({
                              range: [0, parent.width],
                              domain: [0, 120]
                            })}
                            yScale={scaleBand({
                              range: [0, 100],
                              domain: chartData.map((d) => d.name),
                              padding: 0
                            })}
                            color={scaleOrdinal({
                              domain: keys,
                              range: [units[activeUnit].color]
                            })}
                          >
                            {(barStacks) =>
                              barStacks.map((barStack) =>
                                barStack.bars.map((bar) => (
                                  <rect
                                    key={`bar-stack-${barStack.index}-${bar.index}`}
                                    x={bar.x}
                                    y={bar.y}
                                    height={bar.height}
                                    width={bar.width}
                                    fill={bar.color}
                                  />
                                ))
                              )
                            }
                          </BarStackHorizontal>
                          <AxisTop
                            top={0}
                            scale={scaleLinear({
                              range: [0, parent.width],
                              domain: [0, 120]
                            })}
                            numTicks={5}
                            tickLength={3}
                            hideAxisLine={true}
                            stroke="#000000"
                            tickStroke="#ffffff"
                            tickValues={[100]}
                            tickFormat={(d) => ''}
                            tickLabelProps={() => ({
                              fill: '#000000',
                              fontSize: 11,
                              textAnchor: 'middle'
                            })}
                          />
                          <AxisTop
                            top={0}
                            scale={scaleLinear({
                              range: [0, parent.width],
                              domain: [0, 120]
                            })}
                            numTicks={5}
                            tickLength={3}
                            hideAxisLine={true}
                            stroke="#000000"
                            tickStroke="#ffffff"
                            tickValues={[0]}
                            tickFormat={(d) => data[0].name}
                            tickLabelProps={() => ({
                              fill: '#000000',
                              fontSize: 11,
                              textAnchor: 'start'
                            })}
                          />

                          <Line
                            from={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(0),
                              y: parent.height
                            }}
                            to={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(0),
                              y: 0
                            }}
                            stroke="#808080"
                            strokeWidth={3}
                          />

                          <Line
                            from={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(100),
                              y: parent.height
                            }}
                            to={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(100),
                              y: 0
                            }}
                            stroke="#363636"
                            strokeWidth={2}
                          />

                          <Line
                            from={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(120),
                              y: parent.height
                            }}
                            to={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(120),
                              y: 0
                            }}
                            stroke="#808080"
                            strokeWidth={3}
                          />
                        </Group>
                      </svg>
                    )}
                  </ParentSize>
                </div>
              )
            })}
        </div>

        <div style={{ marginTop: 12, width: '100%' }}>
          {showPanel === 'all' &&
            allUnitData &&
            allUnitData.map((data, i) => {
              if (!data || data[0].population < 1) {
                return null
              }

              const allUnitChartKeys = Object.keys(data[0]).filter((key) => key !== 'name' && key !== 'colors')

              return (
                <div className="d-subgroup-chart" style={{ marginTop: 12, width: '100%', height: 36 }}>
                  <ParentSize>
                    {(parent) => (
                      <svg width={parent.width} height={parent.height}>
                        <rect width={parent.width} height={parent.height} fill="transparent" />
                        <Group top={12}>
                          <rect
                            key={`background`}
                            x={0}
                            y={0}
                            height={parent.height - 12}
                            width={parent.width}
                            fill={'#eeeeee'}
                          />
                          <BarStackHorizontal
                            data={data}
                            keys={allUnitChartKeys}
                            height={parent.height - 12}
                            width={parent.width}
                            //@ts-ignore
                            y={(d) => d.name}
                            xScale={scaleLinear({
                              range: [0, parent.width],
                              domain: [0, 120]
                            })}
                            yScale={scaleBand({
                              range: [0, 100],
                              domain: data.map((d) => d.name),
                              padding: 0
                            })}
                            color={scaleOrdinal({
                              domain: keys,
                              range: data.map((d) => d.colors)
                            })}
                          >
                            {(barStacks) =>
                              barStacks.map((barStack) =>
                                barStack.bars.map((bar) => (
                                  <rect
                                    key={`bar-stack-${barStack.index}-${bar.index}`}
                                    x={bar.x}
                                    y={bar.y}
                                    height={bar.height}
                                    width={bar.width}
                                    fill={bar.color}
                                  />
                                ))
                              )
                            }
                          </BarStackHorizontal>
                          <AxisTop
                            top={0}
                            scale={scaleLinear({
                              range: [0, parent.width],
                              domain: [0, 120]
                            })}
                            numTicks={5}
                            tickLength={3}
                            hideAxisLine={true}
                            stroke="#000000"
                            tickStroke="#ffffff"
                            tickValues={[100]}
                            tickFormat={(d) => ''}
                            tickLabelProps={() => ({
                              fill: '#000000',
                              fontSize: 11,
                              textAnchor: 'middle'
                            })}
                          />
                          <AxisTop
                            top={0}
                            scale={scaleLinear({
                              range: [0, parent.width],
                              domain: [0, 120]
                            })}
                            numTicks={5}
                            tickLength={3}
                            hideAxisLine={true}
                            stroke="#000000"
                            tickStroke="#ffffff"
                            tickValues={[0]}
                            tickFormat={(d) => data[0].name}
                            tickLabelProps={() => ({
                              fill: '#000000',
                              fontSize: 11,
                              textAnchor: 'start'
                            })}
                          />

                          <Line
                            from={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(0),
                              y: parent.height
                            }}
                            to={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(0),
                              y: 0
                            }}
                            stroke="#808080"
                            strokeWidth={3}
                          />

                          <Line
                            from={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(100),
                              y: parent.height
                            }}
                            to={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(100),
                              y: 0
                            }}
                            stroke="#363636"
                            strokeWidth={2}
                          />

                          <Line
                            from={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(120),
                              y: parent.height
                            }}
                            to={{
                              x: scaleLinear({
                                domain: [0, 120],
                                range: [0, parent.width]
                              })(120),
                              y: 0
                            }}
                            stroke="#808080"
                            strokeWidth={3}
                          />
                        </Group>
                      </svg>
                    )}
                  </ParentSize>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}

export default UnitProperties
