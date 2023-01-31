import { PointLike } from 'mapbox-gl'

export const getBoxAroundPoint = (point: { x: number; y: number }, radius: number) => {
  const southwest: PointLike = [point.x + radius, point.y + radius]
  const northeast: PointLike = [point.x - radius, point.y - radius]
  const box: [PointLike, PointLike] = [northeast, southwest]
  return box
}
