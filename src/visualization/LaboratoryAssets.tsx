import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

type Part = {
  position: [number, number, number]
  rotation?: [number, number, number]
}

/** Repeated hardware uses one draw call per material, including every tyre tread. */
function Hardware({
  parts,
  children,
  shadow = false,
}: {
  parts: Part[]
  children: ReactNode
  shadow?: boolean
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const instance = mesh.current
    if (!instance) return
    const transform = new THREE.Object3D()
    parts.forEach((part, index) => {
      transform.position.set(...part.position)
      transform.rotation.set(...(part.rotation ?? [0, 0, 0]))
      transform.updateMatrix()
      instance.setMatrixAt(index, transform.matrix)
    })
    instance.instanceMatrix.needsUpdate = true
    instance.computeBoundingSphere()
  }, [parts])
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, parts.length]}
      castShadow={shadow}
      receiveShadow
    >
      {children}
    </instancedMesh>
  )
}

function makeDeckTexture(belief: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = 2240
  canvas.height = 1840
  const context = canvas.getContext('2d')!
  const scale = 200
  const x = (metres: number) => (metres + 5.6) * scale
  const z = (metres: number) => (metres + 4.6) * scale
  context.fillStyle = belief ? '#d9e3de' : '#e3e6d9'
  context.fillRect(0, 0, canvas.width, canvas.height)
  // Half-metre subdivisions; major lines and ruler numbers are metric coordinates.
  for (let half = -10; half <= 10; half++) {
    context.beginPath()
    context.strokeStyle =
      half === 0 ? '#899c8a' : half % 2 ? '#c6cfc0' : '#acbba8'
    context.lineWidth = half === 0 ? 3.5 : half % 2 ? 1.8 : 2.8
    context.moveTo(x(half / 2), z(-4.13))
    context.lineTo(x(half / 2), z(4.13))
    context.stroke()
  }
  for (let half = -8; half <= 8; half++) {
    context.beginPath()
    context.strokeStyle =
      half === 0 ? '#899c8a' : half % 2 ? '#c6cfc0' : '#acbba8'
    context.lineWidth = half === 0 ? 3.5 : half % 2 ? 1.8 : 2.8
    context.moveTo(x(-5.13), z(half / 2))
    context.lineTo(x(5.13), z(half / 2))
    context.stroke()
  }
  context.strokeStyle = '#a6b0a5'
  context.lineWidth = 1.5
  context.strokeRect(x(-5.2), z(-4.2), 10.4 * scale, 8.4 * scale)
  context.font = '22px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.fillStyle = '#78857a'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  for (let tick = -50; tick <= 50; tick++) {
    const size = tick % 10 === 0 ? 0.09 : tick % 5 === 0 ? 0.065 : 0.03
    context.beginPath()
    context.moveTo(x(tick / 10), z(-4.2))
    context.lineTo(x(tick / 10), z(-4.2 - size))
    context.moveTo(x(tick / 10), z(4.2))
    context.lineTo(x(tick / 10), z(4.2 + size))
    context.stroke()
    if (tick % 10 === 0)
      context.fillText(String(tick / 10), x(tick / 10), z(-4.4))
  }
  for (let tick = -40; tick <= 40; tick++) {
    const size = tick % 10 === 0 ? 0.09 : tick % 5 === 0 ? 0.065 : 0.03
    context.beginPath()
    context.moveTo(x(-5.2), z(tick / 10))
    context.lineTo(x(-5.2 - size), z(tick / 10))
    context.moveTo(x(5.2), z(tick / 10))
    context.lineTo(x(5.2 + size), z(tick / 10))
    context.stroke()
    if (tick % 10 === 0)
      context.fillText(String(tick / 10), x(-5.43), z(tick / 10))
  }
  context.textAlign = 'left'
  context.font = '600 24px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.fillStyle = '#647769'
  context.fillText('WML  /  FIELD 01', x(-5.02), z(4.43))
  context.font = '18px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'right'
  context.fillStyle = '#899286'
  context.fillText('X / Z   [m]     ·     1 m', x(5.04), z(4.43))
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

const cornerBolts: Part[] = [-5.69, 5.69].flatMap((x) =>
  [-4.69, 4.69].map((z) => ({ position: [x, -0.012, z] as Part['position'] })),
)
const cornerSlots: Part[] = cornerBolts.map((part) => ({
  position: [part.position[0], -0.006, part.position[2]],
  rotation: [0, Math.PI / 4, 0],
}))
const feet: Part[] = [-4.65, 4.65].flatMap((x) =>
  [-3.65, 3.65].map((z) => ({ position: [x, -0.51, z] as Part['position'] })),
)

/** The simulated contact plane remains exactly y=0 and x±5.6, z±4.6. */
export function LaboratoryDeck({ belief = false }: { belief?: boolean }) {
  const texture = useMemo(() => makeDeckTexture(belief), [belief])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <group>
      <RoundedBox
        args={[11.72, 0.28, 9.72]}
        position={[0, -0.32, 0]}
        radius={0.14}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#3f4946"
          metalness={0.45}
          roughness={0.42}
        />
      </RoundedBox>
      <RoundedBox
        args={[11.67, 0.055, 9.67]}
        position={[0, -0.197, 0]}
        radius={0.027}
        smoothness={2}
        receiveShadow
      >
        <meshStandardMaterial
          color="#b8b1a0"
          metalness={0.68}
          roughness={0.29}
        />
      </RoundedBox>
      <RoundedBox
        args={[11.6, 0.185, 9.6]}
        position={[0, -0.11, 0]}
        radius={0.07}
        smoothness={3}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#e2e1d5" metalness={0.2} roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[11.2, 9.2]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.83}
          metalness={0.035}
        />
      </mesh>
      {/* A flush instrument frame outside the physics plane, not a collision wall. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <RoundedBox
            args={[11.27, 0.035, 0.1]}
            position={[0, -0.006, side * 4.71]}
            radius={0.016}
            smoothness={2}
            receiveShadow
          >
            <meshStandardMaterial
              color="#c2c3b6"
              metalness={0.62}
              roughness={0.38}
            />
          </RoundedBox>
          <RoundedBox
            args={[0.1, 0.035, 9.3]}
            position={[side * 5.71, -0.006, 0]}
            radius={0.016}
            smoothness={2}
            receiveShadow
          >
            <meshStandardMaterial
              color="#c2c3b6"
              metalness={0.62}
              roughness={0.38}
            />
          </RoundedBox>
        </group>
      ))}
      <Hardware parts={cornerBolts}>
        <cylinderGeometry args={[0.057, 0.057, 0.01, 16]} />
        <meshStandardMaterial
          color="#92978c"
          metalness={0.7}
          roughness={0.35}
        />
      </Hardware>
      <Hardware parts={cornerSlots}>
        <boxGeometry args={[0.058, 0.002, 0.013]} />
        <meshStandardMaterial color="#515d55" roughness={0.9} />
      </Hardware>
      <Hardware parts={feet} shadow>
        <cylinderGeometry args={[0.28, 0.33, 0.16, 24]} />
        <meshStandardMaterial color="#313a35" roughness={0.94} />
      </Hardware>
      <mesh position={[-4.28, -0.305, 4.863]}>
        <boxGeometry args={[1.5, 0.105, 0.007]} />
        <meshStandardMaterial
          color="#a7b3a0"
          metalness={0.38}
          roughness={0.45}
        />
      </mesh>
      {[-4.75, -4.58, -4.41].map((x, index) => (
        <mesh key={x} position={[x, -0.305, 4.869]}>
          <boxGeometry args={[0.095, 0.032, 0.004]} />
          <meshStandardMaterial
            color={index === 0 ? '#365745' : '#66776c'}
            roughness={0.5}
          />
        </mesh>
      ))}
    </group>
  )
}

const wheels: Part[] = [-0.31, 0.31].flatMap((z) =>
  [-0.24, 0.24].map((x) => ({
    position: [x, -0.08, z] as Part['position'],
    rotation: [Math.PI / 2, 0, 0] as Part['rotation'],
  })),
)
const hubs: Part[] = wheels.map(({ position }) => ({
  position: [position[0], position[1], Math.sign(position[2]) * 0.369],
  rotation: [Math.PI / 2, 0, 0],
}))
const axleCaps: Part[] = hubs.map(({ position, rotation }) => ({
  position: [position[0], position[1], Math.sign(position[2]) * 0.38],
  rotation,
}))
const treads: Part[] = wheels.flatMap(({ position }) =>
  Array.from({ length: 20 }, (_, index) => {
    const theta = (index * Math.PI * 2) / 20
    return {
      position: [
        position[0] + Math.sin(theta) * 0.145,
        position[1] + Math.cos(theta) * 0.145,
        position[2],
      ],
      rotation: [0, 0, -theta],
    }
  }),
)
const ventilation: Part[] = Array.from({ length: 7 }, (_, index) => ({
  position: [-0.2 + index * 0.035, 0.282, 0],
}))
const shellBolts: Part[] = [-0.3, 0.3].flatMap((x) =>
  [-0.22, 0.22].map((z) => ({ position: [x, 0.135, z] as Part['position'] })),
)

/** A visual servo proxy. Details stay rigidly attached to the real recorded pose. */
export function LaboratoryRobot({
  wire = false,
  moving = false,
}: {
  wire?: boolean
  moving?: boolean
}) {
  return (
    <group position={[0, -0.07, 0]}>
      <RoundedBox
        args={[0.79, 0.085, 0.575]}
        position={[0, -0.08, 0]}
        radius={0.038}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial
          color="#48504a"
          metalness={0.35}
          roughness={0.45}
          wireframe={wire}
        />
      </RoundedBox>
      <RoundedBox
        args={[0.76, 0.24, 0.555]}
        position={[0, 0.015, 0]}
        radius={0.069}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#e9e9dc"
          metalness={0.17}
          roughness={0.3}
          wireframe={wire}
        />
      </RoundedBox>
      <RoundedBox
        args={[0.465, 0.15, 0.435]}
        position={[-0.064, 0.202, 0]}
        radius={0.042}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial
          color="#52685b"
          metalness={0.26}
          roughness={0.36}
          wireframe={wire}
        />
      </RoundedBox>
      <Hardware parts={ventilation}>
        <boxGeometry args={[0.012, 0.003, 0.2]} />
        <meshStandardMaterial
          color="#293f35"
          roughness={0.7}
          wireframe={wire}
        />
      </Hardware>
      <Hardware parts={shellBolts}>
        <cylinderGeometry args={[0.016, 0.016, 0.009, 10]} />
        <meshStandardMaterial
          color="#8a9284"
          metalness={0.7}
          roughness={0.28}
          wireframe={wire}
        />
      </Hardware>
      <Hardware parts={wheels} shadow>
        <cylinderGeometry args={[0.142, 0.142, 0.105, 28]} />
        <meshStandardMaterial
          color="#303b33"
          roughness={0.92}
          wireframe={wire}
        />
      </Hardware>
      <Hardware parts={treads}>
        <boxGeometry args={[0.032, 0.014, 0.112]} />
        <meshStandardMaterial
          color="#3e473c"
          roughness={0.94}
          wireframe={wire}
        />
      </Hardware>
      <Hardware parts={hubs}>
        <cylinderGeometry args={[0.082, 0.082, 0.015, 24]} />
        <meshStandardMaterial
          color="#abb6a6"
          metalness={0.78}
          roughness={0.32}
          wireframe={wire}
        />
      </Hardware>
      <Hardware parts={axleCaps}>
        <cylinderGeometry args={[0.034, 0.034, 0.008, 6]} />
        <meshStandardMaterial
          color="#586959"
          metalness={0.65}
          roughness={0.4}
          wireframe={wire}
        />
      </Hardware>
      {[-0.21, 0.21].map((z) => (
        <group key={z}>
          <mesh position={[-0.37, 0.15, z]} rotation={[0, 0, -0.26]} castShadow>
            <cylinderGeometry args={[0.023, 0.023, 0.27, 12]} />
            <meshStandardMaterial
              color="#b4bdac"
              metalness={0.8}
              roughness={0.26}
              wireframe={wire}
            />
          </mesh>
          <mesh
            position={[0.363, -0.014, z]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.026, 0.026, 0.19, 12]} />
            <meshStandardMaterial
              color="#989e8c"
              metalness={0.74}
              roughness={0.3}
              wireframe={wire}
            />
          </mesh>
        </group>
      ))}
      <mesh
        position={[-0.402, 0.274, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.023, 0.023, 0.42, 12]} />
        <meshStandardMaterial
          color="#b4bdac"
          metalness={0.8}
          roughness={0.26}
          wireframe={wire}
        />
      </mesh>
      <RoundedBox
        args={[0.135, 0.125, 0.635]}
        position={[0.46, -0.014, 0]}
        radius={0.025}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial
          color="#c5bd9f"
          metalness={0.65}
          roughness={0.4}
          wireframe={wire}
        />
      </RoundedBox>
      <RoundedBox
        args={[0.018, 0.08, 0.53]}
        position={[0.532, -0.014, 0]}
        radius={0.008}
        smoothness={2}
      >
        <meshStandardMaterial
          color="#586053"
          roughness={0.86}
          wireframe={wire}
        />
      </RoundedBox>
      <mesh position={[0.15, 0.315, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.047, 0.23, 16]} />
        <meshStandardMaterial
          color="#b7bfae"
          metalness={0.73}
          roughness={0.28}
          wireframe={wire}
        />
      </mesh>
      <RoundedBox
        args={[0.185, 0.155, 0.235]}
        position={[0.165, 0.453, 0]}
        radius={0.037}
        smoothness={3}
        castShadow
      >
        <meshStandardMaterial
          color="#e1e6d8"
          metalness={0.3}
          roughness={0.32}
          wireframe={wire}
        />
      </RoundedBox>
      <RoundedBox
        args={[0.026, 0.108, 0.188]}
        position={[0.265, 0.453, 0]}
        radius={0.012}
        smoothness={3}
      >
        <meshStandardMaterial
          color="#273e34"
          roughness={0.48}
          wireframe={wire}
        />
      </RoundedBox>
      <mesh position={[0.289, 0.453, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.051, 0.058, 0.04, 24]} />
        <meshStandardMaterial
          color="#929b88"
          metalness={0.84}
          roughness={0.24}
          wireframe={wire}
        />
      </mesh>
      <mesh position={[0.311, 0.453, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.038, 24]} />
        <meshPhysicalMaterial
          color="#172e28"
          metalness={0.3}
          roughness={0.12}
          clearcoat={1}
          clearcoatRoughness={0.1}
          wireframe={wire}
        />
      </mesh>
      <mesh position={[0.282, 0.477, -0.069]}>
        <sphereGeometry args={[0.013, 10, 8]} />
        <meshStandardMaterial
          color={moving ? '#acc987' : '#748b70'}
          emissive={moving ? '#5a7147' : '#000000'}
          emissiveIntensity={0.25}
          roughness={0.4}
          wireframe={wire}
        />
      </mesh>
    </group>
  )
}
