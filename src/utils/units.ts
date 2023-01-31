import { UnitConfigProps } from '../Districtr/Districtr.types'
import { getColorScheme, getHoverColorScheme, getSelectedColorScheme } from './colors'

export const generateUnits = (
  unitsConfig: UnitConfigProps,
  unitCount: number,
  totalMembers: number,
  unitName: string,
  unitNamePlural: string,
  unitType: string,
  sumPopulation: number
) => {
  if (unitsConfig) {
    // for now return it if it exists but we should check that it is valid and try and fix/fill missing values if it is not
    return unitsConfig
  }
  // if units is empty generate units
  let units: UnitConfigProps = {}

  const idealPopulation = Math.round(sumPopulation / totalMembers)
  const populationPerMember = Math.floor(sumPopulation / totalMembers)
  const populationPerMemberRemainder = sumPopulation % totalMembers

  const membersPerUnit = Math.floor(totalMembers / unitCount)
  const membersPerUnitRemainder = totalMembers % unitCount

  const colorScheme = getColorScheme(unitCount)
  const hoverColorScheme = getHoverColorScheme(unitCount)
  const selectedColorScheme = getSelectedColorScheme(unitCount)

  for (let i = 0; i < unitCount; i++) {
    let members = membersPerUnit
    if (i < membersPerUnitRemainder) {
      members = membersPerUnit + 1
    }

    let unitIdealPopulation = populationPerMember * members
    if (i < populationPerMemberRemainder) {
      unitIdealPopulation = populationPerMember + 1
    }

    units[i + 1] = {
      name: `${i + 1} ${unitName}`,
      type: unitType,
      id: i + 1,
      color: colorScheme[i],
      hoverColor: hoverColorScheme[i],
      selectedColor: selectedColorScheme[i],
      lockedColor: '#e59090',
      disabledColor: '#cdcdcd',
      population: 0,
      idealPopulation: idealPopulation,
      unitIdealPopulation: unitIdealPopulation,
      members: members
    }
  }
  console.log(units)
  return units
}
