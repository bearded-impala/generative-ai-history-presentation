import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { ExternalLink } from "lucide-react";
import CameraRig from "../stage/CameraRig";
import SafeStageRig from "../stage/SafeStageRig";
import { SceneEnvironment, SlideCrossfade } from "../stage/SceneTransition";
import TimelineRuler from "./TimelineRuler";
import VisualGuide from "./VisualGuide";
import usePresentationSync from "../presentation/usePresentationSync";
import { presentationData } from "../presentation/slides";
import { cloneWaypoints, firstLegDuration } from "../stage/camera";
import { stageControl } from "../stage/safeStage";
import { actLabel } from "../shared/format";
import type { CameraWaypoint, SlideData } from "../presentation/types";

function FramedOrbitControls({
  waypoints,
  enabled,
}: {
  waypoints: CameraWaypoint[];
  enabled: boolean;
}) {
  const ref = useRef<ComponentRef<typeof OrbitControls>>(null);

  const syncTarget = useCallback(() => {
    const controls = ref.current;
    const last = waypoints[waypoints.length - 1];
    if (!controls || !last || stageControl.userOrbiting) return;
    controls.target.set(last.lookAt[0], last.lookAt[1], last.lookAt[2]);
  }, [waypoints]);

  useLayoutEffect(() => {
    syncTarget();
  }, [syncTarget, enabled]);
  useFrame(syncTarget, -2);

  return (
    <OrbitControls
      ref={ref}
      enabled={enabled}
      enableDamping
      dampingFactor={0.12}
      enablePan
      minDistance={1.5}
      maxDistance={120}
      rotateSpeed={0.65}
      zoomSpeed={0.85}
      onStart={() => {
        stageControl.userOrbiting = true;
      }}
    />
  );
}

export default function AudienceView() {
  const { slide, currentSlideIndex } = usePresentationSync({
    slides: presentationData,
    role: "audience",
  });

  const [prevIndex, setPrevIndex] = useState(currentSlideIndex);
  const [transitionFrom, setTransitionFrom] = useState<SlideData | null>(null);
  const [cameraResting, setCameraResting] = useState(false);
  if (currentSlideIndex !== prevIndex) {
    setTransitionFrom(presentationData[prevIndex] ?? null);
    setPrevIndex(currentSlideIndex);
    setCameraResting(false);
    stageControl.userOrbiting = false;
    stageControl.resting = false;
  }

  const transitionDuration = useMemo(() => firstLegDuration(slide.camera), [slide]);
  const framedWaypoints = useMemo(() => cloneWaypoints(slide.camera), [slide.camera]);

  const handleLaunchPresenter = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?mode=presenter`;
    window.open(url, "genai-presenter-console", "width=1440,height=960");
  }, []);

  const handleRestingChange = useCallback((resting: boolean) => {
    stageControl.resting = resting;
    setCameraResting(resting);
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <Canvas camera={{ position: [0, 0, 12], fov: 50 }} dpr={[1, 2]} className="cursor-grab active:cursor-grabbing">
        <CameraRig
          waypoints={framedWaypoints}
          slideKey={slide.id}
          snapOnMount
          yieldWhenResting
          onRestingChange={handleRestingChange}
        />
        <SafeStageRig
          slideId={slide.id}
          authoredCamera={slide.camera}
          framedWaypoints={framedWaypoints}
        />
        <SceneEnvironment
          from={transitionFrom?.environment ?? null}
          to={slide.environment}
          transitionDuration={transitionDuration}
        />
        <SlideCrossfade
          fromSlide={transitionFrom}
          toSlide={slide}
          transitionDuration={transitionDuration}
          onComplete={() => setTransitionFrom(null)}
        />
        <FramedOrbitControls waypoints={framedWaypoints} enabled={cameraResting} />
        <EffectComposer>
          <Bloom luminanceThreshold={0.42} luminanceSmoothing={0.55} intensity={0.45} mipmapBlur />
        </EffectComposer>
      </Canvas>

      <VisualGuide guide={slide.visualGuide} />

      <div
        data-stage-chrome="title"
        className="pointer-events-none absolute left-8 top-5 max-w-[min(42rem,calc(100vw-32rem))] select-none"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">{actLabel(slide.act)}</p>
        <h1 className="mt-1 text-2xl font-light text-white/90 drop-shadow-lg">{slide.title}</h1>
      </div>

      <div data-stage-chrome="timeline" className="pointer-events-none absolute bottom-6 left-8 right-8">
        <TimelineRuler slides={presentationData} activeIndex={currentSlideIndex} />
      </div>

      <p className="pointer-events-none absolute bottom-16 right-6 text-[11px] text-white/25">
        Drag to orbit · scroll to zoom
      </p>

      <button
        onClick={handleLaunchPresenter}
        className="pointer-events-auto absolute bottom-6 right-6 flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1.5 text-[11px] text-white/30 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white/70"
        title="Open the presenter console in a second window"
      >
        <ExternalLink size={12} /> Launch Presenter View
      </button>
    </div>
  );
}
