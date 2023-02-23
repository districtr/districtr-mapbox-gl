import { render } from '@testing-library/react'
import React, { Children } from 'react'

import Toolbar from './Toolbar'
import { ToolbarProps } from './Toolbar.types'

describe('Test Component', () => {
  let props: ToolbarProps

  beforeEach(() => {
    props = {
      position: 'right'
    }
  })

  const renderComponent = () => render(<Toolbar {...props} />)

  it('should render foo text correctly', () => {
    props.position = 'right'
    const { getByTestId } = renderComponent()

    const component = getByTestId('Toolbar')

    expect(component).toHaveClass('d-toolbar--right')
  })
})
