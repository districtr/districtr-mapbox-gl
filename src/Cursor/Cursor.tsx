import React from 'react'

import './Cursor.css'
import { CursorProps } from './Cursor.types'

const Cursor: React.FC<CursorProps> = ({ visible, size, tool, position }) => {
  if (!position) return null

  if (!visible) return null

  const cursorCircle = React.useRef<HTMLDivElement>(null)
  const cursorDot = React.useRef<HTMLDivElement>(null)

  // if given the length of the diagonal of a square, return the length of the side
  const getSideLength = (diagonal: number) => {
    return Math.sqrt(2 * Math.pow(diagonal, 2))
  }

  const circleSize = getSideLength(size * 2)

  return (
    <div
      data-testid="Cursor"
      className="d-cursor"
      style={{ top: position.y, left: position.x, width: circleSize, height: circleSize }}
    >
      <div ref={cursorCircle} className={`d-cursor--circle`}></div>
      <div ref={cursorDot} className={`d-cursor--dot`}></div>
    </div>
  )
}

export default Cursor
