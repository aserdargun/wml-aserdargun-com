import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { LabEngine } from '../core'
import type { Lens } from '../lessons/content'

export type CameraView = 'studio' | 'overhead' | 'detail'

/** Spectator cameras only. Changing a view never moves the agent or its sensor. */
export function SceneCamera({
  view,
  reset,
  playing,
  engine,
  lens,
}: {
  view: CameraView
  reset: number
  playing: boolean
  engine: LabEngine
  lens: Lens
}) {
  const controls = useRef<OrbitControlsImpl>(null)
  const transition = useRef(false)
  const destination = useRef(new Vector3())
  const destinationTarget = useRef(new Vector3())
  const offset = useRef(new Vector3())
  const followTarget = useRef(new Vector3())
  const { camera, size, invalidate } = useThree()
  const portrait = size.width / size.height < 1.05
  const scenario = engine.state.scenario
  const focusId = scenario === 'planning' ? 'cube' : 'ball'
  const focus = () =>
    (lens === 'belief' || lens === 'observation'
      ? engine.belief.objects
      : engine.state.objects
    ).find((o) => o.id === focusId)
  useEffect(() => {
    const ratio = portrait ? 1.32 : 1
    const position =
      view === 'overhead'
        ? [0, 15.8 * ratio, 0.01]
        : view === 'detail'
          ? [-4.1 * ratio, 3.2 * ratio, 5.4 * ratio]
          : [-8.5 * ratio, 7.3 * ratio, 10.8 * ratio]
    destination.current.set(position[0], position[1], position[2])
    const subject = focus()
    destinationTarget.current.set(0, 0.05, 0)
    if (view === 'detail' && subject) {
      destinationTarget.current.fromArray(subject.position)
      destinationTarget.current.x -= 0.3
      destination.current.add(destinationTarget.current)
    }
    const immediate =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !camera.userData.wmlCameraReady
    if (immediate) {
      camera.position.copy(destination.current)
      controls.current?.target.copy(destinationTarget.current)
      camera.lookAt(destinationTarget.current)
      controls.current?.update()
      transition.current = false
    } else transition.current = true
    camera.userData.wmlCameraReady = true
    invalidate()
  }, [view, reset, portrait, camera, invalidate, scenario, lens, engine])
  useFrame((_, delta) => {
    if (transition.current && controls.current) {
      const amount = 1 - Math.exp(-Math.min(delta, 0.05) * 7)
      camera.position.lerp(destination.current, amount)
      controls.current.target.lerp(destinationTarget.current, amount)
      controls.current.update()
      if (camera.position.distanceToSquared(destination.current) < 0.0001)
        transition.current = false
      invalidate()
    } else if (view === 'detail' && controls.current) {
      const subject = focus()
      if (subject) {
        followTarget.current.fromArray(subject.position)
        followTarget.current.x -= 0.3
        offset.current.copy(followTarget.current).sub(controls.current.target)
        if (offset.current.lengthSq() > 0.000001) {
          camera.position.add(offset.current)
          controls.current.target.copy(followTarget.current)
          controls.current.update()
          invalidate()
        }
      }
    }
    if (playing) invalidate()
  })
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      enablePan={view !== 'detail'}
      dampingFactor={0.1}
      target={[0, 0.05, 0]}
      minDistance={4.5}
      maxDistance={27}
      maxPolarAngle={Math.PI / 2 - 0.035}
      onStart={() => {
        transition.current = false
      }}
    />
  )
}
