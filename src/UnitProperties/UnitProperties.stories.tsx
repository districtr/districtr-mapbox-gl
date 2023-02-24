import React from 'react'

import { UnitConfigProps } from '../Districtr/Districtr.types'
import UnitProperties from './UnitProperties'

export default {
  title: 'UnitProperties'
}

const columnKeys = [
  'TOTPOP',
  'NH_WHITE',
  'NH_BLACK',
  'HISP',
  'NH_ASIAN',
  'NH_AMIN',
  'NH_NHPI',
  'NH_2MORE',
  'NH_OTHER',
  'VAP',
  'WVAP',
  'BVAP',
  'HVAP',
  'AMINVAP',
  'NHPIVAP',
  'ASIANVAP',
  'OTHERVAP',
  '2MOREVAP'
]

const columnSets = {
  geometryKey: 'GEOID10',
  columnSets: [
    {
      key: null,
      name: 'Population',
      type: 'population',
      metadata: null,
      subgroups: [
        {
          key: 'NH_WHITE',
          max: 7014,
          min: 0,
          name: 'White population',
          sum: 3520793
        },
        {
          key: 'NH_BLACK',
          max: 1362,
          min: 0,
          name: 'Black population',
          sum: 188778
        },
        {
          key: 'HISP',
          max: 2880,
          min: 0,
          name: 'Hispanic population',
          sum: 1038687
        },
        {
          key: 'NH_ASIAN',
          max: 905,
          min: 0,
          name: 'Asian population',
          sum: 135564
        },
        {
          key: 'NH_AMIN',
          max: 689,
          min: 0,
          name: 'American Indian population',
          sum: 31244
        },
        {
          key: 'NH_NHPI',
          max: 71,
          min: 0,
          name: 'Native Hawaiian and Pacific Islander population',
          sum: 5661
        },
        {
          key: 'NH_2MORE',
          max: 307,
          min: 0,
          name: 'Two or more races',
          sum: 100847
        },
        {
          key: 'NH_OTHER',
          max: 25,
          min: 0,
          name: 'Other races',
          sum: 7622
        }
      ],
      total: {
        key: 'TOTPOP',
        max: 10138,
        min: 0,
        name: 'Total population',
        sum: 5029196
      }
    },
    {
      key: null,
      name: 'Voting Age Population',
      type: 'population',
      metadata: null,
      subgroups: [
        {
          key: 'WVAP',
          max: 5055,
          min: 0,
          name: 'White voting age population',
          sum: 2810513
        },
        {
          key: 'BVAP',
          max: 921,
          min: 0,
          name: 'Black voting age population',
          sum: 138811
        },
        {
          key: 'HVAP',
          max: 1640,
          min: 0,
          name: 'Hispanic voting age population',
          sum: 664462
        },
        {
          key: 'AMINVAP',
          max: 483,
          min: 0,
          name: 'Native American voting age population',
          sum: 23946
        },
        {
          key: 'NHPIVAP',
          max: 48,
          min: 0,
          name: 'Native Hawaiian and Pacific Islander voting age population',
          sum: 4104
        },
        {
          key: 'ASIANVAP',
          max: 604,
          min: 0,
          name: 'Asian voting age population',
          sum: 103339
        },
        {
          key: 'OTHERVAP',
          max: 15,
          min: 0,
          name: 'Other races voting age population',
          sum: 4850
        },
        {
          key: '2MOREVAP',
          max: 239,
          min: 0,
          name: 'Two or more races voting age population',
          sum: 53562
        }
      ],
      total: {
        key: 'VAP',
        max: 7680,
        min: 0,
        name: 'Voting age population',
        sum: 3803587
      }
    }
  ]
}

const initialUnits = {
  '1': {
    name: '1 Congress',
    type: 'single',
    id: 1,
    color: '#0099cd',
    hoverColor: '#0082ae',
    selectedColor: '#00b0ec',
    lockedColor: '#e59090',
    disabledColor: '#cdcdcd',
    population: 701313,
    idealPopulation: 718457,
    unitIdealPopulation: 718457,
    members: 1,
    columnPopulations: {
      TOTPOP: 701313,
      NH_WHITE: 559239,
      NH_BLACK: 23980,
      HISP: 66378,
      NH_ASIAN: 31836,
      NH_AMIN: 2248,
      NH_NHPI: 675,
      NH_2MORE: 15948,
      NH_OTHER: 1009,
      VAP: 507701,
      WVAP: 417676,
      BVAP: 16596,
      HVAP: 40840,
      AMINVAP: 1669,
      NHPIVAP: 493,
      ASIANVAP: 22967,
      OTHERVAP: 519,
      '2MOREVAP': 6941
    }
  },
  '2': {
    name: '2 Congress',
    type: 'single',
    id: 2,
    color: '#ffca5d',
    hoverColor: '#d9ac4f',
    selectedColor: '#ffe86b',
    lockedColor: '#e59090',
    disabledColor: '#cdcdcd',
    population: 726613,
    idealPopulation: 718457,
    unitIdealPopulation: 718457,
    members: 1,
    columnPopulations: {
      TOTPOP: 726613,
      NH_WHITE: 400308,
      NH_BLACK: 70515,
      HISP: 206207,
      NH_ASIAN: 26580,
      NH_AMIN: 4119,
      NH_NHPI: 816,
      NH_2MORE: 16567,
      NH_OTHER: 1501,
      VAP: 568936,
      WVAP: 346699,
      BVAP: 53102,
      HVAP: 133180,
      AMINVAP: 3316,
      NHPIVAP: 585,
      ASIANVAP: 21138,
      OTHERVAP: 1020,
      '2MOREVAP': 9896
    }
  },
  '3': {
    name: '3 Congress',
    type: 'single',
    id: 3,
    color: '#00cd99',
    hoverColor: '#00ae82',
    selectedColor: '#00ecb0',
    lockedColor: '#e59090',
    disabledColor: '#cdcdcd',
    population: 885198,
    idealPopulation: 718457,
    unitIdealPopulation: 718457,
    members: 1,
    columnPopulations: {
      TOTPOP: 885198,
      NH_WHITE: 536555,
      NH_BLACK: 38188,
      HISP: 260956,
      NH_ASIAN: 26586,
      NH_AMIN: 4977,
      NH_NHPI: 1006,
      NH_2MORE: 15609,
      NH_OTHER: 1321,
      VAP: 664889,
      WVAP: 438368,
      BVAP: 26784,
      HVAP: 165762,
      AMINVAP: 3802,
      NHPIVAP: 707,
      ASIANVAP: 20146,
      OTHERVAP: 855,
      '2MOREVAP': 8465
    }
  },
  '4': {
    name: '4 Congress',
    type: 'single',
    id: 4,
    color: '#99cd00',
    hoverColor: '#82ae00',
    selectedColor: '#b0ec00',
    lockedColor: '#e59090',
    disabledColor: '#cdcdcd',
    population: 992523,
    idealPopulation: 718457,
    unitIdealPopulation: 718457,
    members: 1,
    columnPopulations: {
      TOTPOP: 992523,
      NH_WHITE: 759431,
      NH_BLACK: 8747,
      HISP: 174104,
      NH_ASIAN: 26803,
      NH_AMIN: 4392,
      NH_NHPI: 612,
      NH_2MORE: 17083,
      NH_OTHER: 1351,
      VAP: 752422,
      WVAP: 602437,
      BVAP: 6605,
      HVAP: 108960,
      AMINVAP: 3429,
      NHPIVAP: 475,
      ASIANVAP: 20350,
      OTHERVAP: 871,
      '2MOREVAP': 9295
    }
  },
  '5': {
    name: '5 Congress',
    type: 'single',
    id: 5,
    color: '#cd0099',
    hoverColor: '#ae0082',
    selectedColor: '#ec00b0',
    lockedColor: '#e59090',
    disabledColor: '#cdcdcd',
    population: 728443,
    idealPopulation: 718457,
    unitIdealPopulation: 718456,
    members: 1,
    columnPopulations: {
      TOTPOP: 728443,
      NH_WHITE: 547867,
      NH_BLACK: 32271,
      HISP: 104753,
      NH_ASIAN: 15624,
      NH_AMIN: 4456,
      NH_NHPI: 1664,
      NH_2MORE: 20585,
      NH_OTHER: 1223,
      VAP: 553228,
      WVAP: 434322,
      BVAP: 23921,
      HVAP: 66864,
      AMINVAP: 3462,
      NHPIVAP: 1178,
      ASIANVAP: 12309,
      OTHERVAP: 762,
      '2MOREVAP': 10410
    }
  },
  '6': {
    name: '6 Congress',
    type: 'single',
    id: 6,
    color: '#aa44ef',
    hoverColor: '#913acb',
    selectedColor: '#c44eff',
    lockedColor: '#e59090',
    disabledColor: '#cdcdcd',
    population: 199815,
    idealPopulation: 718457,
    unitIdealPopulation: 718456,
    members: 1,
    columnPopulations: {
      TOTPOP: 199815,
      NH_WHITE: 118629,
      NH_BLACK: 3091,
      HISP: 71506,
      NH_ASIAN: 1532,
      NH_AMIN: 1343,
      NH_NHPI: 163,
      NH_2MORE: 3244,
      NH_OTHER: 307,
      VAP: 149533,
      WVAP: 93804,
      BVAP: 2381,
      HVAP: 48926,
      AMINVAP: 1037,
      NHPIVAP: 123,
      ASIANVAP: 1189,
      OTHERVAP: 212,
      '2MOREVAP': 1861
    }
  },
  '7': {
    name: '7 Congress',
    type: 'single',
    id: 7,
    color: '#8dd3c7',
    hoverColor: '#78b3a9',
    selectedColor: '#a2f3e5',
    lockedColor: '#e59090',
    disabledColor: '#cdcdcd',
    population: 175889,
    idealPopulation: 718457,
    unitIdealPopulation: 718456,
    members: 1,
    columnPopulations: {
      TOTPOP: 175889,
      NH_WHITE: 137293,
      NH_BLACK: 528,
      HISP: 32354,
      NH_ASIAN: 1047,
      NH_AMIN: 2122,
      NH_NHPI: 105,
      NH_2MORE: 2207,
      NH_OTHER: 233,
      VAP: 133542,
      WVAP: 109171,
      BVAP: 377,
      HVAP: 20133,
      AMINVAP: 1564,
      NHPIVAP: 80,
      ASIANVAP: 784,
      OTHERVAP: 144,
      '2MOREVAP': 1289
    }
  }
}

export const Panel = () => {
  const [activeUnit, setActiveUnit] = React.useState(1)
  const [units, setUnits] = React.useState<UnitConfigProps>(initialUnits)

  return (
    <UnitProperties
      variant="panel"
      units={units}
      activeUnit={activeUnit}
      setActiveUnit={setActiveUnit}
      setUnits={setUnits}
      columnSets={columnSets}
      columnKeys={columnKeys}
    />
  )
}
