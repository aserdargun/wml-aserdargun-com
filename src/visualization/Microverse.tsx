import { Component, Suspense, memo, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import type { ActionId, LabEngine } from '../core'
import type { AnalysisView } from '../ui/AnalysisPanel'
import type { Lens } from '../lessons/content'
import { type Locale, say } from '../ui/i18n'
import { LaboratoryDeck } from './LaboratoryAssets'
import { WorldBody, SensorOverlay } from './WorldBodies'
import { FutureTrails } from './FutureTrails'
import { SceneCamera, type CameraView } from './SceneCamera'

export interface SceneProps {
  engine: LabEngine
  lens: Lens
  locale: Locale
  showFov: boolean
  showLabels: boolean
  cameraPreset: number
  cameraView: CameraView
  forecastTime: number
  playing: boolean
  onSelectAction: (action: ActionId) => void
  analysisView: AnalysisView
  revision: number
}
const Studio = memo(function Studio({ belief }: { belief: boolean }) {
  const width = useThree((state) => state.size.width)
  const shadowSize = width > 1024 ? 2048 : 1024
  return (
    <>
      <color attach="background" args={['#29372f']} />
      <fog attach="fog" args={['#29372f', 24, 55]} />
      <ambientLight intensity={0.38} />
      <hemisphereLight args={['#fffdf4', '#929b91', 1.1]} />
      <directionalLight
        position={[-4, 10, 5]}
        intensity={2.6}
        castShadow
        key={shadowSize}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-normalBias={0.025}
        shadow-bias={-0.00015}
        shadow-radius={3}
      />
      <directionalLight
        position={[7, 5, -6]}
        intensity={1.45}
        color="#e6edf5"
      />
      <Environment resolution={128} frames={1}>
        <Lightformer
          form="rect"
          intensity={2}
          position={[-4, 7, 3]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[10, 10, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.8}
          position={[5, 4, -4]}
          rotation={[0, -Math.PI / 3, 0]}
          scale={[7, 5, 1]}
        />
      </Environment>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.596, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#303f36" roughness={0.95} />
      </mesh>
      <LaboratoryDeck belief={belief} />
    </>
  )
})

function Contents(props: SceneProps) {
  const { engine, lens, locale, showLabels, showFov } = props
  return (
    <>
      <Studio belief={lens === 'belief'} />
      {engine.state.objects.map((object) => (
        <WorldBody
          key={`${engine.state.scenario}-${object.id}`}
          object={object}
          engine={engine}
          lens={lens}
          locale={locale}
          showLabels={showLabels}
        />
      ))}
      {(showFov || lens === 'observation') && <SensorOverlay engine={engine} />}
      <FutureTrails
        engine={engine}
        lens={lens}
        locale={locale}
        view={props.analysisView}
        forecastTime={props.forecastTime}
        onSelectAction={props.onSelectAction}
        showLabels={showLabels}
      />
      <SceneCamera
        view={props.cameraView}
        reset={props.cameraPreset}
        playing={props.playing}
        engine={engine}
        lens={lens}
      />
    </>
  )
}
class CanvasBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
export function Microverse(props: SceneProps) {
  const [lost, setLost] = useState(false)
  const summary = (
    <div className="canvas-fallback">
      <h3>
        {say(
          props.locale,
          'Spatial view unavailable',
          'Uzamsal görünüm kullanılamıyor',
        )}
      </h3>
      <p>
        {say(
          props.locale,
          'The simulation and all controls still work. Use the state inspector and trajectory comparison below.',
          'Simülasyon ve tüm kontroller çalışır. Durum tablosunu ve aşağıdaki yörünge karşılaştırmasını kullan.',
        )}
      </p>
    </div>
  )
  const supported = useMemo(() => {
    try {
      const c = document.createElement('canvas')
      const gl = c.getContext('webgl2')
      const ok = !!gl
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
      return ok
    } catch {
      return false
    }
  }, [])
  return (
    <div
      className="microverse"
      data-camera-view={props.cameraView}
      data-lens={props.lens}
      data-forecast-time={props.forecastTime.toFixed(1)}
      role="img"
      aria-label={say(
        props.locale,
        'Interactive 3D world. Use the labelled controls and state table for a text alternative.',
        'Etkileşimli 3D dünya. Metin alternatifi için etiketli kontrolleri ve durum tablosunu kullan.',
      )}
    >
      {!supported || lost ? (
        summary
      ) : (
        <CanvasBoundary fallback={summary}>
          <Canvas
            shadows
            frameloop="demand"
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            dpr={[1, 1.5]}
            camera={{
              position: [-8.5, 7.3, 10.8],
              fov: 40,
              near: 0.1,
              far: 100,
            }}
            onCreated={({ gl }) => {
              gl.shadowMap.type = THREE.PCFSoftShadowMap
              gl.toneMapping = THREE.ACESFilmicToneMapping
              gl.toneMappingExposure = 0.94
              gl.domElement.addEventListener('webglcontextlost', () =>
                setLost(true),
              )
            }}
          >
            <Suspense fallback={null}>
              <Contents {...props} />
            </Suspense>
          </Canvas>
        </CanvasBoundary>
      )}
    </div>
  )
}
