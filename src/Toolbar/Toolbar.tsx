import React from 'react'
import { BiBrush, BiEraser, BiMove } from 'react-icons/bi'

import Button from '../Button'
import ColorPicker from '../ColorPicker'
import RangeSlider from '../RangeSlider'
import { updateUnitsColorScheme } from '../utils/colors'
import './Toolbar.css'
import { ToolbarProps } from './Toolbar.types'

const Toolbar: React.FC<ToolbarProps> = ({
  position,
  tools,
  setTools,
  activeTool,
  setActiveTool,
  units,
  setUnits,
  activeUnit,
  children
}) => {
  const [panelOpen, setPanelOpen] = React.useState<number | boolean>(false)
  const [currentColor, setCurrentColor] = React.useState(units[activeUnit].color)
  const [unitCount, setUnitCount] = React.useState(Object.keys(units).length)

  React.useEffect(() => {
    setCurrentColor(units[activeUnit].color)
    setUnitCount(Object.keys(units).length)
  }, [])

  React.useEffect(() => {
    setCurrentColor(units[activeUnit].color)
  }, [activeUnit])

  React.useEffect(() => {
    if (units && units[activeUnit] && 'color' in units[activeUnit]) {
      const newUnits = units

      if (newUnits[activeUnit].color !== currentColor) {
        newUnits[activeUnit].color = currentColor
        const newColorScheme = []
        // for each key in units add the color to the color scheme
        Object.keys(units).forEach((unit) => {
          newColorScheme.push(newUnits[unit].color)
        })

        const updatedUnits = updateUnitsColorScheme(newUnits, newColorScheme)
        setUnits({ ...updatedUnits })
      }
    }
  }, [currentColor])

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tool = tools[activeTool.name]
    const property = e.target.name
    const value = e.target.value
    const newTool = { ...tool, [property]: value }
    setTools({ ...tools, [activeTool.name]: newTool })
  }

  const handleColorChange = (e) => {
    setCurrentColor(e.target.value)
  }

  const createToolButtons = () => {
    if (!tools) return null
    const toolButtons = []
    for (const [key, value] of Object.entries(tools)) {
      const tool = tools[key]
      const icon = () => {
        if (tool.name === 'brush') {
          return <BiBrush />
        } else if (tool.name === 'eraser') {
          return <BiEraser />
        } else if (tool.name === 'pan') {
          return <BiMove />
        } else {
          return tool.icon
        }
      }
      if (tool.enabled) {
        toolButtons.push(
          <li key={key} className="d-toolbar-item">
            <Button
              variant={'toolbar'}
              pressed={activeTool.name === tool.name && true}
              onClick={() => setActiveTool({ name: tool.name })}
            >
              {icon()}
            </Button>
          </li>
        )
      }
    }
    return toolButtons
  }

  const createToolOptions = () => {
    if (!tools) return null
    const toolOptions = []
    for (const [key, value] of Object.entries(tools)) {
      const tool = tools[key]
      if (tool.name === activeTool.name && tool.enabled && 'options' in tool) {
        const optionInputs = tool.options.inputs
        optionInputs.forEach((optionInput, index) => {
          if (optionInput.type === 'rangeSlider') {
            toolOptions.push(
              <li key={index} className="d-toolbar-item">
                <RangeSlider {...optionInput.config} onChange={handleOptionChange} name={optionInput.property} />
              </li>
            )
          }
          if (optionInput.type === 'colorPicker') {
            if (!units) return null

            toolOptions.push(
              <li key={index} className="d-toolbar-item">
                <Button
                  variant={'swatch'}
                  onClick={() => (panelOpen === index ? setPanelOpen(false) : setPanelOpen(index))}
                  style={{ backgroundColor: currentColor }}
                />
                {panelOpen === index && (
                  <div className="d-panel d-toolbar-panel">
                    <ColorPicker color={currentColor} defaultUnitCount={unitCount} onChange={handleColorChange} />
                  </div>
                )}
              </li>
            )
          }
        })
      }
    }
    return toolOptions
  }

  const toolButtons = createToolButtons()
  const toolOptions = createToolOptions()

  return (
    <div data-testid="Toolbar" className={`d-toolbar d-toolbar--${position}`}>
      {tools && (
        <>
          <ul className="d-toolbar-group d-toolbar-group--top">{toolButtons}</ul>
          <ul className="d-toolbar-group d-toolbar-group--middle">{toolOptions}</ul>
        </>
      )}

      {children}
    </div>
  )
}

export default Toolbar
