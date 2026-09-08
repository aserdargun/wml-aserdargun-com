import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges, Html, Line, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import type { LabEngine, WorldObject, Vec3 } from '../core'
import type { Lens } from '../lessons/content'
import { objectName, say, type Locale } from '../ui/i18n'
import { LaboratoryRobot } from './LaboratoryAssets'

function Target({
  object,
  success,
  locale,
  labels,
}: {
  object: WorldObject
  success: boolean
  locale: Locale
  labels: boolean
}) {
  const circle = useMemo(
    () =>
      Array.from(
        { length: 65 },
        (_, i) =>
          [
            Math.cos((i / 64) * Math.PI * 2) * 0.52,
            0.012,
            Math.sin((i / 64) * Math.PI * 2) * 0.52,
          ] as Vec3,
      ),
    [],
  )
  return (
    <group position={[object.position[0], 0.012, object.position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.35, 64]} />
        <meshBasicMaterial
          color={success ? '#488266' : '#9fbd91'}
          transparent
          opacity={success ? 0.48 : 0.2}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.375, 64]} />
        <meshBasicMaterial color="#548467" side={THREE.DoubleSide} />
      </mesh>
      <Line
        points={circle}
        color="#689477"
        lineWidth={1}
        dashed
        dashSize={0.07}
        gapSize={0.06}
      />
      <Line
        points={[
          [-0.15, 0.02, 0],
          [0.15, 0.02, 0],
        ]}
        color="#477b5b"
        lineWidth={1.3}
      />
      <Line
        points={[
          [0, 0.02, -0.15],
          [0, 0.02, 0.15],
        ]}
        color="#477b5b"
        lineWidth={1.3}
      />
      {labels && (
        <Html position={[0, 0.06, 0.9]} center zIndexRange={[15, 0]}>
          <span className="scene-label goal-label">
            {say(locale, 'TARGET', 'HEDEF')}
          </span>
        </Html>
      )}
    </group>
  )
}
export function WorldBody({
  object,
  engine,
  lens,
  locale,
  showLabels,
}: {
  object: WorldObject
  engine: LabEngine
  lens: Lens
  locale: Locale
  showLabels: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const material = useRef<THREE.MeshStandardMaterial>(null)
  const wire = lens === 'belief'
  const remembered = engine.belief.objects.find((o) => o.id === object.id)
  const context = ['floor', 'goal', 'ramp'].includes(object.kind)
  const shown =
    lens === 'observation'
      ? context || engine.observation.visibleIds.includes(object.id)
      : wire
        ? context || !!remembered
        : true
  useFrame(() => {
    if (!group.current) return
    const belief = engine.belief.objects.find((o) => o.id === object.id)
    const actual = engine.state.objects.find((o) => o.id === object.id)
    const next = wire ? belief : actual
    group.current.visible =
      lens === 'observation'
        ? context || engine.observation.visibleIds.includes(object.id)
        : wire
          ? context || !!belief
          : true
    if (next) {
      group.current.position.fromArray(next.position)
      group.current.quaternion.fromArray(next.rotation)
    }
    if (material.current && wire)
      material.current.opacity = belief?.visible ? 0.15 : 0.065
  })
  if (object.kind === 'floor' || !shown) return null
  if (object.kind === 'goal')
    return (
      <Target
        object={object}
        success={engine.state.success}
        locale={locale}
        labels={showLabels}
      />
    )
  const dimensions = object.size.map((n) => n * 2) as Vec3
  const structural = object.kind === 'obstacle' || object.kind === 'panel'
  const bodyMaterial = (
    <meshStandardMaterial
      ref={material}
      color={structural ? '#8b958a' : object.color}
      roughness={structural ? 0.68 : object.kind === 'ball' ? 0.25 : 0.32}
      metalness={object.kind === 'ball' ? 0.28 : 0.09}
      transparent={wire}
      opacity={wire ? 0.12 : 1}
      depthWrite={!wire}
    />
  )
  return (
    <group
      ref={group}
      position={wire && remembered ? remembered.position : object.position}
      quaternion={wire && remembered ? remembered.rotation : object.rotation}
    >
      {object.kind === 'robot' ? (
        <LaboratoryRobot wire={wire} />
      ) : object.kind === 'ball' ? (
        <>
          <mesh castShadow={!wire} receiveShadow>
            <sphereGeometry args={[object.size[0], 40, 28]} />
            {bodyMaterial}
            {wire && <Edges color="#3d7a7a" threshold={15} />}
          </mesh>
          <mesh>
            <torusGeometry args={[object.size[0] * 0.996, 0.007, 6, 56]} />
            <meshStandardMaterial
              color={wire ? '#3d7a7a' : '#f3e7d3'}
              roughness={0.4}
              wireframe={wire}
            />
          </mesh>
          {wire && (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[object.size[0], 0.005, 5, 48]} />
              <meshBasicMaterial color="#528885" transparent opacity={0.6} />
            </mesh>
          )}
        </>
      ) : (
        <>
          <RoundedBox
            args={dimensions}
            radius={Math.min(0.035, object.size[1] * 0.2)}
            smoothness={2}
            castShadow={!wire}
            receiveShadow
          >
            {bodyMaterial}
            {wire && <Edges color="#477f80" threshold={20} />}
          </RoundedBox>
          {!wire && structural && (
            <>
              <mesh position={[0, -object.size[1] + 0.055, 0]}>
                <boxGeometry
                  args={[dimensions[0] * 1.003, 0.06, dimensions[2] * 1.003]}
                />
                <meshStandardMaterial
                  color="#454f48"
                  roughness={0.5}
                  metalness={0.3}
                />
              </mesh>
              <mesh
                position={[object.size[0] + 0.002, object.size[1] * 0.42, 0]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <planeGeometry
                  args={[Math.min(dimensions[2] * 0.48, 0.45), 0.055]}
                />
                <meshStandardMaterial color="#c3a278" roughness={0.65} />
              </mesh>
            </>
          )}
          {!wire && object.kind === 'cube' && (
            <mesh
              position={[0, object.size[1] + 0.001, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.08, 0.095, 4]} />
              <meshStandardMaterial color="#e9f0e8" roughness={0.5} />
            </mesh>
          )}
        </>
      )}
      {showLabels &&
        ['cube', 'robot', 'ball', 'panel', 'obstacle'].includes(
          object.kind,
        ) && (
          <Html
            position={[
              0,
              object.size[1] + (object.kind === 'robot' ? 0.8 : 0.4),
              0,
            ]}
            center
            zIndexRange={[20, 0]}
          >
            <span className={`scene-label ${wire ? 'belief-label' : ''}`}>
              <i />
              {objectName(object.id, locale)}
              {wire && remembered && !remembered.visible && (
                <small>{say(locale, 'MEMORY', 'BELLEK')}</small>
              )}
            </span>
          </Html>
        )}
    </group>
  )
}

export function SensorOverlay({ engine }: { engine: LabEngine }) {
  const camera = engine.observation.camera
  const angle = Math.atan2(camera.direction[2], camera.direction[0]),
    range = Math.min(camera.range, 6),
    fov = (camera.fov * Math.PI) / 180
  const centre = [camera.position[0], 0.025, camera.position[2]] as Vec3
  const arc = Array.from({ length: 49 }, (_, i) => {
    const a = angle - fov / 2 + (fov * i) / 48
    return [
      centre[0] + Math.cos(a) * range,
      0.025,
      centre[2] + Math.sin(a) * range,
    ] as Vec3
  })
  const geometry = useMemo(() => {
    const points: number[] = []
    for (let i = 0; i < arc.length - 1; i++)
      points.push(...centre, ...arc[i], ...arc[i + 1])
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    g.computeVertexNormals()
    return g
  }, [centre[0], centre[2], angle, range, fov])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color="#d0b774"
          transparent
          opacity={0.11}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Line
        points={[centre, ...arc, centre]}
        color="#a28d57"
        dashed
        dashSize={0.15}
        gapSize={0.1}
        lineWidth={1.3}
      />
    </group>
  )
}
