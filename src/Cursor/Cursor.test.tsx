import { render } from '@testing-library/react'
import React from 'react'

import Cursor from './Cursor'
import { CursorProps } from './Cursor.types'

describe('Test Component', () => {
  let props: CursorProps

  beforeEach(() => {
    props = {
      size: 50,
      tool: 'brush',
      position: { x: 0, y: 0 },
      visible: true
    }
  })

  const renderComponent = () => render(<Cursor {...props} />)

  it('should render size', () => {
    props.size = 50
    const { getByTestId } = renderComponent()

    const component = getByTestId('Cursor')

    expect(component).toHaveStyle('width: 141.4213562373095px')
    expect(component).toHaveStyle('height: 141.4213562373095px')
  })
})
