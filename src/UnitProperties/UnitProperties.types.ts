import { UnitConfigProps } from '../Districtr/Districtr.types'

export interface UnitPropertiesProps {
  variant?: 'panel' | 'toolbar'
  units: UnitConfigProps
  setUnits: (units: UnitConfigProps) => void
  activeUnit: number
  setActiveUnit: (unit: number) => void
  columnSets: any
  columnKeys: any
}
