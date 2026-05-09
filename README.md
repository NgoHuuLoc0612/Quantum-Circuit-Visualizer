# Quantum Circuit Visualizer

Circuit design, simulation, and visualization platform.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Next.js 14 (App Router) |
| State Management | Zustand + Immer |
| Circuit Canvas | React Flow |
| 3D Visualization | React Three Fiber + Three.js |
| Shaders | GLSL (custom vertex/fragment) |
| GPU Compute | WebGPU Compute Shaders |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | FastAPI + Uvicorn |
| Quantum Engine | Qiskit 1.x + Qiskit Aer |
| Real-time | WebSockets |
| Styling | Tailwind CSS |


## Features

### Circuit Design
- **Drag-and-drop** gate palette with 40+ gates across 6 categories
- **React Flow** interactive canvas with zoom/pan/minimap
- **Multi-qubit gates**: CX, CZ, CY, SWAP, CCX (Toffoli), CSWAP (Fredkin), iSWAP, ECR, DCX
- **Rotation gates**: RX, RY, RZ, P, U1, U2, U3 with visual parameter sliders
- **Parameterized circuits** with named Parameters
- **Undo/redo** history (100 levels)
- **Barriers** and measurement gates
- **Resizable panels** with drag handles

### Simulation
- **Statevector** — exact state amplitudes, phases, and probabilities
- **Shot-based** — measurement sampling with 100–100,000 shots
- **Density Matrix** — open quantum systems, purity, trace
- **Unitary** — full circuit matrix computation
- **State Evolution** — step-by-step statevector playback with transport controls

### Noise Modeling
- Depolarizing errors (1Q and 2Q)
- Thermal relaxation (T1/T2)
- Readout error
- Hardware presets: Ideal, Low Noise, Near-term NISQ, IBM Washington

### Visualization
- **Amplitude bars** with magnitude and phase color encoding
- **Phase wheels** (complex number polar plot per basis state)
- **3D Bloch spheres** with GLSL shader surface and animated state vector
- **Probability bar/pie charts** with Recharts
- **Density matrix heatmap** (magnitude / phase / real / imag modes)
- **Unitary matrix** heatmap with property display (det, unitarity check)
- **Von Neumann entropy** per-qubit subsystem display
- **Concurrence** for 2-qubit entanglement
- **WebGPU** compute for GPU-accelerated probability/phase extraction

### Analytics
- Depth, size, width, T-count
- Gate category distribution
- Clifford vs non-Clifford ratio
- Estimated gate time
- Fault-tolerance overhead estimate
- Radar chart complexity profile

### Templates
- Bell state, GHZ (3, 4 qubits)
- QFT (3, 4 qubits)
- Grover's search
- Quantum teleportation
- Superdense coding
- Random benchmarking circuits

### UX
- Command palette (⌘K)
- Keyboard shortcuts
- Import/export JSON and QASM
- WebSocket real-time streaming
- Auto-reconnect with exponential backoff

---

## Quick Start

### Development (local)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 > .env.local
echo NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws >> .env.local
npm run dev
```

Open http://localhost:3000

### Docker Compose
```bash
docker-compose up --build
```

---

## API Reference

### REST

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/v1/circuits/ | Create circuit |
| GET | /api/v1/circuits/ | List circuits |
| GET | /api/v1/circuits/{id} | Get circuit |
| PUT | /api/v1/circuits/{id} | Update circuit |
| DELETE | /api/v1/circuits/{id} | Delete circuit |
| GET | /api/v1/circuits/{id}/qasm | Export QASM 2/3 |
| GET | /api/v1/circuits/templates/list | List templates |
| GET | /api/v1/circuits/templates/{id} | Load template |
| POST | /api/v1/simulation/run | Run simulation (REST) |
| POST | /api/v1/simulation/expectation | Expectation values |
| POST | /api/v1/simulation/fidelity | State fidelity |
| POST | /api/v1/transpiler/ | Transpile circuit |
| GET | /api/v1/noise/presets | Noise presets |
| POST | /api/v1/analytics/analyze | Circuit analytics |
| POST | /api/v1/analytics/compare | Compare circuits |
| GET | /api/v1/gates/catalog | Full gate catalog |

### WebSocket `/ws/{session_id}`

**Client → Server**
```json
{ "type": "simulate",              "payload": { "circuit": {...}, "mode": "statevector", "shots": 1024 } }
{ "type": "statevector_evolution", "payload": { "circuit": {...} } }
{ "type": "transpile",             "payload": { "circuit": {...}, "optimization_level": 2 } }
{ "type": "validate",              "payload": { "circuit": {...} } }
{ "type": "ping" }
```

**Server → Client**
```json
{ "type": "simulation_update", "payload": { "stage": "transpiled", "progress": 40, ... } }
{ "type": "simulation_update", "payload": { "stage": "complete", "type": "statevector", ... } }
{ "type": "statevector_update", "payload": { "stage": "evolution_step", "step": 3, ... } }
{ "type": "error",             "payload": { "message": "..." } }
{ "type": "pong" }
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| NEXT_PUBLIC_API_URL | http://localhost:8000/api/v1 | Backend REST base URL |
| NEXT_PUBLIC_WS_URL  | ws://localhost:8000/ws | WebSocket base URL |

---

## License

MIT
