import * as THREE from "three";

export const NEON_VERTEX =  `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const NEON_FRAGMENT =  `
  uniform vec3 uColor;
  uniform vec3 uFrozenColor;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPulseSpeed;
  uniform float uOpacity;
  uniform float uFrozen;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 2.5);
    float pulse = 0.65 + 0.35 * sin(uTime * uPulseSpeed);
    pulse = mix(pulse, 0.55, uFrozen);
    vec3 baseColor = mix(uColor, uFrozenColor, uFrozen);
    vec3 glow = baseColor * (uIntensity * pulse) + baseColor * fresnel * 1.8;
    gl_FragColor = vec4(glow, uOpacity * (0.35 + fresnel * 0.65));
  }
`;


export class NeonGlowMaterial extends THREE.ShaderMaterial {
  constructor(color: THREE.ColorRepresentation = "#4fd8ff") {
    super({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uFrozenColor: { value: new THREE.Color("#bfe8ff") },
        uTime: { value: 0 },
        uIntensity: { value: 1.2 },
        uPulseSpeed: { value: 1.4 },
        uOpacity: { value: 1 },
        uFrozen: { value: 0 },
      },
      vertexShader: NEON_VERTEX,
      fragmentShader: NEON_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }
}
