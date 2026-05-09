'use client';

/**
 * WebGPU Quantum Compute Utilities
 * Uses WebGPU compute shaders for client-side matrix operations and
 * visualization data preparation at GPU speed.
 */

export interface WebGPUCapabilities {
  supported: boolean;
  adapterInfo?: GPUAdapterInfo;
  limits?: GPUSupportedLimits;
  features?: string[];
}

export async function checkWebGPUSupport(): Promise<WebGPUCapabilities> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    return { supported: false };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!adapter) return { supported: false };

    const adapterInfo = await adapter.requestAdapterInfo();
    const features = [...adapter.features].map(String);

    return {
      supported: true,
      adapterInfo,
      limits: adapter.limits,
      features,
    };
  } catch {
    return { supported: false };
  }
}

// ─── WebGPU Matrix Multiply (for unitary operations) ─────────────────────────

const MATMUL_SHADER = /* wgsl */`
  struct MatrixMeta {
    width_a: u32,
    height_a: u32,
    width_b: u32,
  };
  
  @group(0) @binding(0) var<storage, read>       A    : array<f32>;
  @group(0) @binding(1) var<storage, read>       B    : array<f32>;
  @group(0) @binding(2) var<storage, read_write> C    : array<f32>;
  @group(0) @binding(3) var<uniform>             meta : MatrixMeta;
  
  @compute @workgroup_size(8, 8)
  fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let row = gid.y;
    let col = gid.x;
    if (row >= meta.height_a || col >= meta.width_b) { return; }
    var sum = 0.0;
    for (var k = 0u; k < meta.width_a; k++) {
      sum += A[row * meta.width_a + k] * B[k * meta.width_b + col];
    }
    C[row * meta.width_b + col] = sum;
  }
`;

// ─── WebGPU Probability Distribution ─────────────────────────────────────────

const PROB_SHADER = /* wgsl */`
  @group(0) @binding(0) var<storage, read>       amplitudes_re : array<f32>;
  @group(0) @binding(1) var<storage, read>       amplitudes_im : array<f32>;
  @group(0) @binding(2) var<storage, read_write> probabilities : array<f32>;
  @group(0) @binding(3) var<storage, read_write> phases        : array<f32>;
  
  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
    let i = gid.x;
    let re = amplitudes_re[i];
    let im = amplitudes_im[i];
    probabilities[i] = re * re + im * im;
    phases[i] = atan2(im, re);
  }
`;

export class WebGPUQuantumCompute {
  private device: GPUDevice | null = null;
  private probPipeline: GPUComputePipeline | null = null;

  async initialize(): Promise<boolean> {
    if (!('gpu' in navigator)) return false;

    try {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) return false;

      this.device = await adapter.requestDevice({
        requiredFeatures: [],
      });

      // Compile probability pipeline
      const probModule = this.device.createShaderModule({ code: PROB_SHADER });
      this.probPipeline = await this.device.createComputePipelineAsync({
        layout: 'auto',
        compute: { module: probModule, entryPoint: 'main' },
      });

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Compute probabilities and phases from complex amplitudes using WebGPU
   */
  async computeProbabilities(
    amplitudesRe: Float32Array,
    amplitudesIm: Float32Array,
  ): Promise<{ probabilities: Float32Array; phases: Float32Array } | null> {
    if (!this.device || !this.probPipeline) return null;

    const n = amplitudesRe.length;
    const bufferSize = n * 4; // f32 = 4 bytes

    const createBuffer = (data: Float32Array, usage: number) => {
      const buf = this.device!.createBuffer({ size: bufferSize, usage, mappedAtCreation: true });
      new Float32Array(buf.getMappedRange()).set(data);
      buf.unmap();
      return buf;
    };

    const reBuffer    = createBuffer(amplitudesRe, GPUBufferUsage.STORAGE);
    const imBuffer    = createBuffer(amplitudesIm, GPUBufferUsage.STORAGE);
    const probBuffer  = this.device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const phaseBuffer = this.device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const readProb    = this.device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const readPhase   = this.device.createBuffer({ size: bufferSize, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });

    const bindGroup = this.device.createBindGroup({
      layout: this.probPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: reBuffer } },
        { binding: 1, resource: { buffer: imBuffer } },
        { binding: 2, resource: { buffer: probBuffer } },
        { binding: 3, resource: { buffer: phaseBuffer } },
      ],
    });

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.probPipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(n / 64));
    pass.end();

    encoder.copyBufferToBuffer(probBuffer, 0, readProb, 0, bufferSize);
    encoder.copyBufferToBuffer(phaseBuffer, 0, readPhase, 0, bufferSize);
    this.device.queue.submit([encoder.finish()]);

    await readProb.mapAsync(GPUMapMode.READ);
    await readPhase.mapAsync(GPUMapMode.READ);

    const probabilities = new Float32Array(readProb.getMappedRange().slice(0));
    const phases        = new Float32Array(readPhase.getMappedRange().slice(0));

    readProb.unmap();
    readPhase.unmap();

    [reBuffer, imBuffer, probBuffer, phaseBuffer, readProb, readPhase].forEach(b => b.destroy());

    return { probabilities, phases };
  }

  destroy() {
    this.device?.destroy();
    this.device = null;
  }
}

// Singleton instance
let gpuCompute: WebGPUQuantumCompute | null = null;

export async function getGPUCompute(): Promise<WebGPUQuantumCompute | null> {
  if (!gpuCompute) {
    gpuCompute = new WebGPUQuantumCompute();
    const ok = await gpuCompute.initialize();
    if (!ok) { gpuCompute = null; }
  }
  return gpuCompute;
}

export function formatComplex(re: number, im: number, precision = 3): string {
  const reStr = re.toFixed(precision);
  if (Math.abs(im) < 1e-6) return reStr;
  const sign = im >= 0 ? '+' : '-';
  return `${reStr}${sign}${Math.abs(im).toFixed(precision)}i`;
}

export function complexMagnitude(re: number, im: number): number {
  return Math.sqrt(re * re + im * im);
}

export function complexPhase(re: number, im: number): number {
  return Math.atan2(im, re);
}
