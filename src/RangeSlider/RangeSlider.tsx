import React from 'react'

import './RangeSlider.css'
import { RangeSliderProps } from './RangeSlider.types'

const RangeSlider: React.FC<RangeSliderProps> = ({ align, min, max, name, onChange }) => {
  const [value, setValue] = React.useState(50)

  const rangeSlider = React.useRef<HTMLDivElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(parseInt(e.target.value))
    onChange(e)
  }

  return (
    <div ref={rangeSlider} data-testid="RangeSlider" className={`d-rangeslider d-rangeslider--${align}`}>
      <input
        name={name}
        type="number"
        value={value}
        min={min}
        onChange={handleChange}
        max={max}
        className="d-input-number"
      />
      <input name={name} type="range" min={min} max={max} value={value} onChange={handleChange} className="d-range" />
    </div>
  )
}

export default RangeSlider
