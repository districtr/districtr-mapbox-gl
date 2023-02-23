import { render } from '@testing-library/react'
import React from 'react'

import ColorPicker from './ColorPicker'
import { ColorPickerProps } from './ColorPicker.types'

describe('Test Component', () => {
  let props: ColorPickerProps

  beforeEach(() => {
    props = {
      color: '#FFFFFF',
      defaultUnitCount: 10
    }
  })

  const renderComponent = () => render(<ColorPicker {...props} />)

  it('render background color', () => {
    props.color = '#FFFFFF'
    const { getByTestId } = renderComponent()

    const component = getByTestId('ColorPickerDisplay')

    expect(component).toHaveStyle('background-color: #FFFFFF')
  })
})
