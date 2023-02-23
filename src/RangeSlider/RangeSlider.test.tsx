import { render } from '@testing-library/react'
import React from 'react'

import RangeSlider from './RangeSlider'
import { RangeSliderProps } from './RangeSlider.types'

describe('Test Component', () => {
  let props: RangeSliderProps

  beforeEach(() => {
    props = {
      name: 'test',
      min: 0,
      max: 100,
      align: 'horizontal'
    }
  })

  const renderComponent = () => render(<RangeSlider {...props} />)

  it('should render horizontal alignment', () => {
    props.align = 'horizontal'
    const { getByTestId } = renderComponent()

    const component = getByTestId('RangeSlider')

    expect(component).toHaveClass('d-rangeslider--horizontal')
  })

  it('should render vertical alignment', () => {
    props.align = 'vertical'
    const { getByTestId } = renderComponent()

    const component = getByTestId('RangeSlider')

    expect(component).toHaveClass('d-rangeslider--vertical')
  })
})
