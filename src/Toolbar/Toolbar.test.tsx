import { render } from '@testing-library/react'
import React, { Children } from 'react'

import { mockUnits } from '../utils/mocks'
import Toolbar from './Toolbar'
import { ToolbarProps } from './Toolbar.types'

describe('Test Component', () => {
  let props: ToolbarProps

  beforeEach(() => {
    props = {
      position: 'right',
      activeUnit: 1,
      units: mockUnits
    }
  })

  const renderComponent = () => render(<Toolbar {...props} />)

  it('should position class correctly', () => {
    props.position = 'right'
    props.activeUnit = 1
    const { getByTestId } = renderComponent()

    const component = getByTestId('Toolbar')

    expect(component).toHaveClass('d-toolbar--right')
  })
})
