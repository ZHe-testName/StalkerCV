import { Material, Mesh, Object3D } from 'three'

/** Включает castShadow на мешах. Стекло/transparent пропускаем — дают грязь в карте. */
export function enableCastShadow(root: Object3D) {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return
    }
    const list = Array.isArray(child.material) ? child.material : [child.material]
    if (list.some((mat) => isSkipCast(mat))) {
      return
    }
    child.castShadow = true
  })
}

function isSkipCast(mat: Material | null | undefined) {
  if (!mat) {
    return true
  }
  if (mat.transparent || mat.opacity < 0.99) {
    return true
  }
  return mat.name === 'Glass'
}
