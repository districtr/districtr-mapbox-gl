import { ToolsConfigProps } from '../Districtr/Districtr.types'
import { ActiveToolProps } from '../Districtr/Districtr.types'
import { UnitConfigProps } from '../Districtr/Districtr.types'

export interface ToolbarProps {
  position: 'left' | 'right'
  tools?: ToolsConfigProps
  setTools?: (tools: ToolsConfigProps) => void
  activeTool?: ActiveToolProps
  setActiveTool?: (tool: ActiveToolProps) => void
  units?: UnitConfigProps
  setUnits?: (units: UnitConfigProps) => void
  activeUnit: number
  children?: React.ReactNode
}
