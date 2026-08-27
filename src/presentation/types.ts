export type Vec3 = [x: number, y: number, z: number];

export type EasingName =
  | "linear"
  | "easeInOutSine"
  | "easeInOutCubic"
  | "easeInOutQuint"
  | "easeOutExpo";

export interface CameraWaypoint {
  id: string;
  position: Vec3;
  lookAt: Vec3;
  fov?: number;
  
  roll?: number;
  
  transitionDuration: number;
  easing?: EasingName;
  idleDrift?: {
    enabled: boolean;
    amplitude?: number;
    speed?: number;
  };
}

export type Scene3DParams = Record<string, unknown>;

export interface EnvironmentConfig {
  background: string;
  fog: {
    color: string;
    near: number;
    far: number;
  };
  ambientIntensity: number;
  keyLight?: {
    color: string;
    intensity: number;
    position: Vec3;
  };
  particles: {
    count: number;
    color: string;
    size: number;
    speed: number;
    spread?: number;
  };
}

export interface VisualState {
  mode: string;
  props: Scene3DParams;
}

export interface VisualLegendEntry {
  color: string;
  label: string;
}

export interface VisualGuide {
  headline: string;
  legend: VisualLegendEntry[];
  takeaway: string;
}

export interface SlideData {
  id: string;
  index: number;
  act: number;
  title: string;
  subtitle?: string;
  camera: CameraWaypoint | CameraWaypoint[];
  environment: EnvironmentConfig;
  visualState: VisualState;
  visualGuide?: VisualGuide;
  script: string[];
  timelineYear: number;
  timelineLabel: string;
}
