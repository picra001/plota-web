/**
 * preview.glb 의 JSON 머리만 읽어 실제 삼각형 수와 크기를 잰다(정점 데이터는 받지 않는다).
 * glTF 는 POSITION 접근자에 min/max 를 필수로 두므로, 노드 변환만 곱하면 크기가 나온다.
 * 캐릭터 preview.glb 는 리깅 전 TRELLIS 메시(높이 1.0 정규화)라 크기는 의미가 없고 삼각형 수만 쓴다.
 */

export type GlbStats = { tris: number; size: [number, number, number] };  // size = 가로·높이·깊이(m, glTF Y-up)

type Node = { mesh?: number; children?: number[]; matrix?: number[]; translation?: number[]; rotation?: number[]; scale?: number[] };
type Gltf = {
  scene?: number; scenes?: { nodes?: number[] }[]; nodes?: Node[];
  meshes?: { primitives: { indices?: number; attributes: { POSITION?: number }; mode?: number }[] }[];
  accessors?: { count: number; min?: number[]; max?: number[] }[];
};

const HEAD_BYTES = 256 * 1024;

async function readJsonChunk(url: string): Promise<Gltf> {
  // Range 는 CORS 안전 헤더라 미리 묻기(preflight) 없이 간다. 서버가 무시하면 200 으로 전체가 온다.
  let buf = await (await fetch(url, { headers: { Range: `bytes=0-${HEAD_BYTES - 1}` } })).arrayBuffer();
  const view = () => new DataView(buf);
  if (buf.byteLength < 20 || view().getUint32(0, true) !== 0x46546c67) throw new Error("not a GLB");
  const len = view().getUint32(12, true);
  if (20 + len > buf.byteLength) {
    buf = await (await fetch(url, { headers: { Range: `bytes=0-${20 + len - 1}` } })).arrayBuffer();
  }
  return JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, len)));
}

// 열 우선 4x4 행렬
function local(n: Node): number[] {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

function mul(a: number[], b: number[]): number[] {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}

export async function glbStats(url: string): Promise<GlbStats> {
  const g = await readJsonChunk(url);
  const acc = g.accessors ?? [];
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  let tris = 0;
  const walk = (i: number, parent: number[]) => {
    const n = g.nodes?.[i];
    if (!n) return;
    const m = mul(parent, local(n));
    for (const p of n.mesh !== undefined ? g.meshes?.[n.mesh]?.primitives ?? [] : []) {
      if ((p.mode ?? 4) !== 4) continue;                       // 삼각형 목록만 센다
      const pos = p.attributes.POSITION !== undefined ? acc[p.attributes.POSITION] : undefined;
      if (!pos) continue;
      tris += Math.floor((p.indices !== undefined ? acc[p.indices].count : pos.count) / 3);
      if (!pos.min || !pos.max) continue;
      for (let c = 0; c < 8; c++) {
        const v = [c & 1 ? pos.max[0] : pos.min[0], c & 2 ? pos.max[1] : pos.min[1], c & 4 ? pos.max[2] : pos.min[2]];
        for (let r = 0; r < 3; r++) {
          const w = m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r];
          lo[r] = Math.min(lo[r], w); hi[r] = Math.max(hi[r], w);
        }
      }
    }
    for (const c of n.children ?? []) walk(c, m);
  };
  const id = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const r of g.scenes?.[g.scene ?? 0]?.nodes ?? []) walk(r, id);
  if (!tris || !isFinite(lo[0])) throw new Error("no mesh");
  return { tris, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] };
}
