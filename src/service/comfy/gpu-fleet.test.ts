import assert from "node:assert/strict";
import { test } from "node:test";
import {
  comfyUrlFromPorts,
  DEFAULT_COMFY_GPU_REGISTRY,
  instanceIdsToStop,
  instanceIdsToStopAfterProvision,
  pickCheapestOffer,
  rewriteEnvAssignment,
  slotById,
} from "@/service/comfy/gpu-fleet";

test("switching to Ada lists the 4060 and PRO 6000 as the other fleet ids", () => {
  const registry = structuredClone(DEFAULT_COMFY_GPU_REGISTRY);
  slotById(registry, "ada").instanceId = 11;
  slotById(registry, "pro6000").instanceId = 22;
  assert.deepEqual(instanceIdsToStopAfterProvision(registry), [11, 22]);
  assert.deepEqual(instanceIdsToStop(registry, "ada"), [59041320, 22]);
});

test("rewriteEnvAssignment replaces only the named assignment", () => {
  const next = rewriteEnvAssignment("COMFY_API_KEY=secret\nCOMFY_BASE_URL=http://old:1\n", "COMFY_BASE_URL", "http://new:8189");
  assert.match(next, /COMFY_API_KEY=secret/);
  assert.match(next, /COMFY_BASE_URL=http:\/\/new:8189/);
  assert.doesNotMatch(next, /old/);
});

test("comfyUrlFromPorts reads the published 8189 mapping", () => {
  assert.equal(
    comfyUrlFromPorts({
      publicIp: "1.2.3.4",
      ports: { "8189/tcp": [{ HostPort: "41081" }] },
    }),
    "http://1.2.3.4:41081",
  );
  assert.equal(comfyUrlFromPorts({ publicIp: "1.2.3.4", ports: {} }), null);
});

test("pickCheapestOffer chooses a 16GB 4060, Ada, and 96GB PRO 6000", () => {
  const offers = [
    { id: 1, gpu_name: "RTX 4060 Ti", gpu_ram: 8188, dph_total: 0.1 },
    { id: 2, gpu_name: "RTX 4060 Ti", gpu_ram: 16380, dph_total: 0.2 },
    { id: 3, gpu_name: "RTX 4060 Ti", gpu_ram: 16380, dph_total: 0.15 },
    { id: 4, gpu_name: "RTX 6000Ada", gpu_ram: 49140, dph_total: 0.6 },
    { id: 5, gpu_name: "RTX 6000Ada", gpu_ram: 49140, dph_total: 0.54 },
    { id: 6, gpu_name: "RTX PRO 6000 WS", gpu_ram: 97887, dph_total: 1.5 },
    { id: 7, gpu_name: "RTX PRO 6000 S", gpu_ram: 97887, dph_total: 1.4 },
  ];
  const registry = DEFAULT_COMFY_GPU_REGISTRY;
  assert.equal(pickCheapestOffer(slotById(registry, "4060"), offers)?.id, 3);
  assert.equal(pickCheapestOffer(slotById(registry, "ada"), offers)?.id, 5);
  assert.equal(pickCheapestOffer(slotById(registry, "pro6000"), offers)?.id, 7);
});
