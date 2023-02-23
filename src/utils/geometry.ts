import { PointLike } from 'mapbox-gl'

export const getBoxAroundPoint = (point: { x: number; y: number }, radius: number) => {
  const southwest: PointLike = [point.x + radius, point.y + radius]
  const northeast: PointLike = [point.x - radius, point.y - radius]
  const box: [PointLike, PointLike] = [northeast, southwest]
  return box
}

export const convertBrushSizeToPixels = (mapZoom: number, size: number) => {
  // https://docs.mapbox.com/help/glossary/zoom-level/#zoom-levels-and-geographical-distance
  // Zoom scale at equator
  const mapboxZoomScale = [
    78271.484, 39135.742, 19567.871, 9783.936, 4891.968, 2445.984, 1222.992, 611.496, 305.748, 152.874, 76.437, 38.219,
    19.109, 9.555, 4.777, 2.389, 1.194, 0.597, 0.299, 0.149, 0.075, 0.037, 0.019, 0.01, 0.005, 0.0
  ]

  // Limit map zoom level to the available zoom levels in the scale array
  const zoom = Math.floor(Math.min(mapZoom, mapboxZoomScale.length - 1))
  const scaleA = mapboxZoomScale[zoom]
  const scaleB = mapboxZoomScale[zoom + 1]
  const scale = scaleA + (scaleB - scaleA) * (mapZoom - zoom)

  // Prevent division by 0
  const scaleIsInvalid = scale === 0 || isNaN(scale)
  if (scaleIsInvalid) {
    return 0
  }

  return Math.round((size * 100) / scale)
}
