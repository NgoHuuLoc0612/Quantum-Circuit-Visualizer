// ─── Statevector amplitude visualization shader ───────────────────────────────

export const amplitudeVertexShader = /* glsl */`
  attribute float amplitude;
  attribute float phase;
  attribute float probability;
  
  uniform float uTime;
  uniform float uAnimSpeed;
  
  varying float vAmplitude;
  varying float vPhase;
  varying float vProbability;
  varying vec3 vPosition;
  
  void main() {
    vAmplitude = amplitude;
    vPhase = phase;
    vProbability = probability;
    vPosition = position;
    
    // Animate height based on amplitude
    vec3 pos = position;
    float wave = sin(uTime * uAnimSpeed + phase) * 0.05 * amplitude;
    pos.y += wave;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = max(4.0, probability * 40.0);
  }
`;

export const amplitudeFragmentShader = /* glsl */`
  uniform float uTime;
  
  varying float vAmplitude;
  varying float vPhase;
  varying float vProbability;
  varying vec3 vPosition;
  
  vec3 hsl2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
  }
  
  void main() {
    // Phase → hue mapping
    float hue = (vPhase + 3.14159) / (2.0 * 3.14159);
    float saturation = 0.85;
    float lightness = 0.4 + vAmplitude * 0.4;
    
    vec3 color = hsl2rgb(vec3(hue, saturation, lightness));
    
    // Circular point shape
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;
    
    // Smooth edge
    float alpha = 1.0 - smoothstep(0.35, 0.5, dist);
    alpha *= vAmplitude;
    
    // Glow effect
    float glow = exp(-dist * 8.0) * 0.5;
    color += glow * color;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

// ─── Bloch Sphere Surface Shader ──────────────────────────────────────────────

export const blochSphereVertexShader = /* glsl */`
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const blochSphereFragmentShader = /* glsl */`
  uniform vec3 uBlochVector;   // (x, y, z)
  uniform vec3 uAccentColor;
  uniform float uTime;
  uniform float uPurity;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    // Grid lines (latitude/longitude)
    float u = vUv.x;
    float v = vUv.y;
    
    float gridU = abs(sin(u * 3.14159 * 8.0));
    float gridV = abs(sin(v * 3.14159 * 8.0));
    float grid = smoothstep(0.96, 1.0, max(gridU, gridV));
    
    vec3 gridColor = vec3(0.15, 0.18, 0.35);
    vec3 surfaceColor = vec3(0.06, 0.08, 0.18);
    
    vec3 color = mix(surfaceColor, gridColor, grid * 0.6);
    
    // Fresnel rim lighting
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(vNormal, viewDir), 0.0), 3.0);
    color += fresnel * uAccentColor * 0.4;
    
    // State vector dot influence
    vec3 spherePos = normalize(vec3(
      sin(vUv.y * 3.14159) * cos(vUv.x * 6.28318),
      cos(vUv.y * 3.14159),
      sin(vUv.y * 3.14159) * sin(vUv.x * 6.28318)
    ));
    float alignment = max(dot(spherePos, normalize(uBlochVector)), 0.0);
    float glow = pow(alignment, 12.0) * uPurity;
    color += glow * uAccentColor * 1.5;
    
    float alpha = 0.25 + fresnel * 0.3;
    gl_FragColor = vec4(color, alpha);
  }
`;

// ─── Density Matrix Heatmap Shader ────────────────────────────────────────────

export const densityMatrixVertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const densityMatrixFragmentShader = /* glsl */`
  uniform sampler2D uMagnitudeTexture;
  uniform sampler2D uPhaseTexture;
  uniform float uTime;
  uniform int uColorMode; // 0=magnitude, 1=phase, 2=real, 3=imag
  
  varying vec2 vUv;
  
  vec3 viridis(float t) {
    const vec3 c0 = vec3(0.2777,0.0054,0.3342);
    const vec3 c1 = vec3(0.1050,0.5003,0.6585);
    const vec3 c2 = vec3(0.9603,0.9325,0.1354);
    return mix(mix(c0, c1, t), mix(c1, c2, t), t);
  }
  
  vec3 plasma(float t) {
    const vec3 c0 = vec3(0.0504,0.0298,0.5280);
    const vec3 c1 = vec3(0.9002,0.2471,0.3012);
    const vec3 c2 = vec3(0.9400,0.9752,0.1313);
    return mix(mix(c0, c1, t), mix(c1, c2, t), t);
  }
  
  vec3 phaseColor(float phase) {
    float hue = (phase + 3.14159) / (2.0 * 3.14159);
    // Hue to RGB
    float r = abs(hue * 6.0 - 3.0) - 1.0;
    float g = 2.0 - abs(hue * 6.0 - 2.0);
    float b = 2.0 - abs(hue * 6.0 - 4.0);
    return clamp(vec3(r, g, b), 0.0, 1.0);
  }
  
  void main() {
    float magnitude = texture2D(uMagnitudeTexture, vUv).r;
    float phase = texture2D(uPhaseTexture, vUv).r * 6.28318 - 3.14159;
    
    vec3 color;
    if (uColorMode == 0) {
      color = plasma(magnitude);
    } else if (uColorMode == 1) {
      color = phaseColor(phase) * (0.2 + magnitude * 0.8);
    } else {
      color = viridis(magnitude);
    }
    
    // Cell border
    vec2 cellUv = fract(vUv * 8.0); // assuming 8x8
    float border = smoothstep(0.02, 0.05, min(min(cellUv.x, cellUv.y), 
                   min(1.0 - cellUv.x, 1.0 - cellUv.y)));
    color *= 0.3 + border * 0.7;
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// ─── Background void/space shader ────────────────────────────────────────────

export const voidBackgroundShader = {
  vertex: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: /* glsl */`
    uniform float uTime;
    uniform vec2 uResolution;
    
    varying vec2 vUv;
    
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Deep space background
      vec3 color = vec3(0.02, 0.025, 0.06);
      
      // Subtle nebula
      float n = hash(floor(uv * 40.0));
      float nebula = smoothstep(0.97, 1.0, n) * 0.3;
      color += nebula * vec3(0.3, 0.15, 0.6);
      
      // Quantum grid
      vec2 grid = abs(fract(uv * 20.0 - 0.5) - 0.5) / fwidth(uv * 20.0);
      float gridLine = min(min(grid.x, grid.y), 1.0);
      float gridAlpha = 1.0 - gridLine;
      color += gridAlpha * vec3(0.1, 0.12, 0.3) * 0.4;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

// ─── Entanglement visualizer shader ──────────────────────────────────────────

export const entanglementShader = {
  vertex: /* glsl */`
    attribute float strength;
    varying float vStrength;
    varying vec3 vPosition;
    
    void main() {
      vStrength = strength;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: /* glsl */`
    uniform float uTime;
    varying float vStrength;
    varying vec3 vPosition;
    
    void main() {
      float pulse = 0.7 + 0.3 * sin(uTime * 2.0 + vPosition.x * 5.0);
      vec3 color = mix(
        vec3(0.3, 0.1, 0.8),
        vec3(0.9, 0.2, 0.9),
        vStrength
      );
      float alpha = vStrength * pulse * 0.8;
      gl_FragColor = vec4(color, alpha);
    }
  `,
};
