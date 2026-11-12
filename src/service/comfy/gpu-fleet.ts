// Local Vast GPU fleet for OpenJutsu. One slot is the live Comfy target; the others stay stopped.

export const COMFY_GPU_IDS = ["4060", "ada", "pro6000"] as const;
export type ComfyGpuId = (typeof COMFY_GPU_IDS)[number];

export type ComfyGpuSlot = {
  id: ComfyGpuId;
  label: string;
  gpuName: string;
  instanceId: number | null;
  // Provision leaves this card running. The other two are created and then stopped.
  keepRunningOnProvision: boolean;
};

export type ComfyGpuRegistry = {
  active: ComfyGpuId;
  slots: ComfyGpuSlot[];
};

export type VastOffer = {
  id: number;
  gpu_name?: string;
  gpu_ram?: number;
  dph_total?: number;
  cpu_ram?: number;
  disk_space?: number;
  reliability?: number;
  geolocation?: string;
};

export const DEFAULT_COMFY_GPU_REGISTRY: ComfyGpuRegistry = {
  active: "4060",
  slots: [
    {
      id: "4060",
      label: "scro-openjutsu-poc",
      gpuName: "RTX 4060 Ti",
      instanceId: 59041320,
      keepRunningOnProvision: true,
    },
    {
      id: "ada",
      label: "scro-openjutsu-ada",
      gpuName: "RTX 6000Ada",
      instanceId: null,
      keepRunningOnProvision: false,
    },
    {
      id: "pro6000",
      label: "scro-openjutsu-pro6000",
      gpuName: "RTX PRO 6000",
      instanceId: null,
      keepRunningOnProvision: false,
    },
  ],
};

export function isComfyGpuId(value: string): value is ComfyGpuId {
  return (COMFY_GPU_IDS as readonly string[]).includes(value);
}

export function slotById(registry: ComfyGpuRegistry, id: ComfyGpuId): ComfyGpuSlot {
  const slot = registry.slots.find((item) => item.id === id);
  if (!slot) throw new Error(`找不到 GPU 設定 ${id}`);
  return slot;
}

// Stop every other fleet member. Instances outside this registry are left alone.
export function instanceIdsToStop(registry: ComfyGpuRegistry, active: ComfyGpuId): number[] {
  return registry.slots
    .filter((slot) => slot.id !== active && typeof slot.instanceId === "number")
    .map((slot) => slot.instanceId as number);
}

export function instanceIdsToStopAfterProvision(registry: ComfyGpuRegistry): number[] {
  return registry.slots
    .filter((slot) => !slot.keepRunningOnProvision && typeof slot.instanceId === "number")
    .map((slot) => slot.instanceId as number);
}

export function rewriteEnvAssignment(text: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(text)) return text.replace(pattern, line);
  const suffix = text.endsWith("\n") || text.length === 0 ? "" : "\n";
  return `${text}${suffix}${line}\n`;
}

export function comfyUrlFromPorts(input: {
  publicIp?: string | null;
  ports?: Record<string, Array<{ HostPort?: string }>> | null;
}): string | null {
  const port = input.ports?.["8189/tcp"]?.[0]?.HostPort;
  if (!input.publicIp || !port) return null;
  return `http://${input.publicIp}:${port}`;
}

export function offerMatchesSlot(slot: ComfyGpuSlot, offer: VastOffer): boolean {
  const name = offer.gpu_name || "";
  const vram = offer.gpu_ram || 0;
  if (slot.id === "4060") return name === "RTX 4060 Ti" && vram >= 16000;
  if (slot.id === "ada") return name === "RTX 6000Ada" && vram >= 40000;
  return name.startsWith("RTX PRO 6000") && vram >= 90000;
}

export function pickCheapestOffer(slot: ComfyGpuSlot, offers: VastOffer[]): VastOffer | null {
  const matches = offers.filter((offer) => offerMatchesSlot(slot, offer));
  matches.sort((a, b) => (a.dph_total || Number.POSITIVE_INFINITY) - (b.dph_total || Number.POSITIVE_INFINITY));
  return matches[0] || null;
}
