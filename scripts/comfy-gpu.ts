// Switch the local OpenJutsu box among the three Vast GPUs.
//
//   npx tsx scripts/comfy-gpu.ts list
//   npx tsx scripts/comfy-gpu.ts close
//   npx tsx scripts/comfy-gpu.ts use 4060|ada|pro6000
//
// use rents Ada or PRO 6000 only when that card is chosen, then deletes it again
// when another card is chosen. A stopped expensive card still pays for disk.
import { loadEnvConfig } from "@next/env";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

loadEnvConfig(process.cwd());

import {
  comfyUrlFromPorts,
  DEFAULT_COMFY_GPU_REGISTRY,
  isComfyGpuId,
  pickCheapestOffer,
  rewriteEnvAssignment,
  slotById,
  type ComfyGpuId,
  type ComfyGpuRegistry,
  type ComfyGpuSlot,
  type VastOffer,
} from "@/service/comfy/gpu-fleet";

const REGISTRY_PATH = path.join(process.cwd(), "scripts/comfy-gpus.json");

type VastInstance = {
  id: number;
  label?: string;
  actual_status?: string;
  cur_state?: string;
  gpu_name?: string;
  dph_total?: number;
  public_ipaddr?: string;
  ssh_port?: number;
  ports?: Record<string, Array<{ HostPort?: string }>>;
};

function apiKey() {
  const key = process.env.VAST_API_KEY?.trim();
  if (!key) throw new Error("缺少 VAST_API_KEY");
  return key;
}

async function vast(version: "v0" | "v1", method: string, apiPath: string, body?: unknown) {
  const response = await fetch(`https://console.vast.ai/api/${version}${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).catch(async (error) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const retry = await fetch(`https://console.vast.ai/api/${version}${apiPath}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!retry.ok && retry.status >= 500) throw error;
    return retry;
  });
  const text = await response.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    json = { msg: text.slice(0, 180) };
  }
  if (!response.ok || json.success === false) {
    const detail = typeof json.msg === "string" ? json.msg : typeof json.error === "string" ? json.error : "未知錯誤";
    // Vast queues the start or stop when the host is still loading the image.
    if (/state change queued/i.test(detail) && !/unavailable/i.test(detail)) {
      console.log(detail);
      return json;
    }
    throw new Error(`${method} ${apiPath} 失敗（HTTP ${response.status}）：${detail}`);
  }
  return json;
}

async function listInstances(): Promise<VastInstance[]> {
  const json = (await vast("v1", "GET", "/instances/")) as { instances?: VastInstance[] };
  return json.instances || [];
}

function readRegistry(): ComfyGpuRegistry {
  if (!existsSync(REGISTRY_PATH)) return structuredClone(DEFAULT_COMFY_GPU_REGISTRY);
  const parsed = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as ComfyGpuRegistry;
  return {
    active: isComfyGpuId(parsed.active) ? parsed.active : "4060",
    slots: DEFAULT_COMFY_GPU_REGISTRY.slots.map((slot) => {
      const saved = parsed.slots?.find((item) => item.id === slot.id);
      return saved ? { ...slot, ...saved, id: slot.id } : slot;
    }),
  };
}

function writeRegistry(registry: ComfyGpuRegistry) {
  writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`);
}

function pointLocalComfy(url: string) {
  const envPath = path.join(process.cwd(), ".env.local");
  const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  writeFileSync(envPath, rewriteEnvAssignment(current, "COMFY_BASE_URL", url));
}

async function searchOffers(slot: ComfyGpuSlot): Promise<VastOffer[]> {
  const names =
    slot.id === "pro6000" ? ["RTX PRO 6000 S", "RTX PRO 6000 WS", "RTX PRO 6000"] : [slot.gpuName];
  const offers: VastOffer[] = [];
  for (const name of names) {
    const json = (await vast("v0", "POST", "/bundles/", {
      limit: 20,
      type: "ondemand",
      verified: { eq: true },
      rentable: { eq: true },
      num_gpus: { eq: 1 },
      reliability: { gte: 0.99 },
      disk_space: { gte: 160 },
      order: [["dph_total", "asc"]],
      gpu_name: { eq: name },
    })) as { offers?: VastOffer[] };
    offers.push(...(json.offers || []));
  }
  return offers;
}

async function createInstance(slot: ComfyGpuSlot, offer: VastOffer) {
  const token = process.env.COMFY_API_KEY?.trim();
  const created = (await vast("v0", "PUT", `/asks/${offer.id}/`, {
    client_id: "me",
    image: "vastai/pytorch:cuda-13.0.3-auto",
    env: {
      "-p 8189:8189": "1",
      ...(token ? { COMFY_PROXY_TOKEN: token } : {}),
    },
    disk: 160,
    label: slot.label,
    runtype: "ssh_direc ssh_proxy",
    python_utf8: false,
    lang_utf8: false,
    use_jupyter_lab: false,
    force: false,
    cancel_unavail: true,
  })) as { new_contract?: number };
  if (!created.new_contract) throw new Error(`${slot.label} 建立後沒有 instance id`);
  return created.new_contract;
}

async function setInstanceState(id: number, state: "running" | "stopped") {
  await vast("v0", "PUT", `/instances/${id}/`, { state });
}

async function destroyInstance(id: number) {
  try {
    await vast("v0", "DELETE", `/instances/${id}/`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not found|no such|404|does not exist|invalid/i.test(message)) return;
    throw error;
  }
}

async function releaseInactive(registry: ComfyGpuRegistry, active: ComfyGpuId) {
  for (const slot of registry.slots) {
    if (slot.id === active || !slot.instanceId) continue;
    if (slot.keepRunningOnProvision) {
      console.log(`停止 ${slot.id} ${slot.instanceId}，保留已下載的權重`);
      await setInstanceState(slot.instanceId, "stopped");
      continue;
    }
    console.log(`拆掉 ${slot.id} ${slot.instanceId}`);
    await destroyInstance(slot.instanceId);
    slot.instanceId = null;
  }
  writeRegistry(registry);
}

async function ensureInstance(registry: ComfyGpuRegistry, slot: ComfyGpuSlot) {
  const instances = await listInstances();
  const live = instances.find((item) => item.id === slot.instanceId);
  if (live) return live.id;
  if (slot.id === "4060" && slot.instanceId) {
    throw new Error(`RTX 4060 Ti instance ${slot.instanceId} 不在帳號裡，沒有另開一台`);
  }
  const offer = pickCheapestOffer(slot, await searchOffers(slot));
  if (!offer) throw new Error(`找不到可租的 ${slot.gpuName}`);
  console.log(`建立 ${slot.id}：offer ${offer.id}，約 $${Number(offer.dph_total).toFixed(3)}/hr，${offer.geolocation || ""}`);
  slot.instanceId = await createInstance(slot, offer);
  writeRegistry(registry);
  console.log(`${slot.id} instance ${slot.instanceId}`);
  return slot.instanceId;
}

function sshTarget(instance: VastInstance) {
  const port = instance.ports?.["22/tcp"]?.[0]?.HostPort;
  if (!instance.public_ipaddr || !port) return null;
  return { host: instance.public_ipaddr, port };
}

function run(command: string, args: string[], input?: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} 結束碼 ${code}`));
    });
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

function sshCode(ssh: string[], command: string) {
  return new Promise<number>((resolve) => {
    const child = spawn("ssh", [...ssh, command], { stdio: "ignore" });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

function installProxyToken(ssh: string[]) {
  const token = process.env.COMFY_API_KEY?.trim();
  if (!token) throw new Error("缺少 COMFY_API_KEY，不能啟動 Comfy 代理");
  // cat stays in the foreground. Backgrounding the whole && list makes cat read /dev/null.
  return run("ssh", [...ssh, "cat > /workspace/.comfy-token && chmod 600 /workspace/.comfy-token"], token);
}

function restartProxy(ssh: string[]) {
  return run("ssh", [
    ...ssh,
    `python3 - <<'PY'
import os, pathlib, signal, subprocess, time
token = open("/workspace/.comfy-token").read().strip()
if not token:
    raise SystemExit("empty token")
me = os.getpid()
python_bin = "/venv/main/bin/python"
for proc in pathlib.Path("/proc").iterdir():
    if not proc.name.isdigit() or int(proc.name) == me:
        continue
    try:
        argv = (proc / "cmdline").read_bytes().split(b"\\0")
    except Exception:
        continue
    if any(part.endswith(b"main.py") for part in argv):
        python_bin = argv[0].decode()
    if any(part.endswith(b"vast-openjutsu-proxy.py") for part in argv) and b"python" in argv[0]:
        os.kill(int(proc.name), signal.SIGTERM)
time.sleep(0.4)
env = os.environ.copy()
env["COMFY_PROXY_TOKEN"] = token
log = open("/workspace/proxy.log", "ab")
subprocess.Popen([python_bin, "/workspace/vast-openjutsu-proxy.py"], env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
PY`,
  ]);
}

async function waitForOpenJutsu(instance: VastInstance, ssh: string[]) {
  const deadline = Date.now() + 45 * 60 * 1000;
  const base = comfyUrlFromPorts({ publicIp: instance.public_ipaddr, ports: instance.ports });
  const key = process.env.COMFY_API_KEY?.trim();
  let missed = 0;
  let refreshedToken = false;
  while (Date.now() < deadline) {
    const done = (await sshCode(ssh, "test -f /workspace/openjutsu-setup.done")) === 0;
    if (done && base) {
      try {
        const response = await fetch(`${base}/queue`, {
          headers: key ? { Authorization: `Bearer ${key}` } : {},
        });
        if (response.ok) {
          console.log("ComfyUI 已回應");
          return;
        }
        if (response.status === 401) {
          if (refreshedToken) {
            throw new Error("Comfy 代理仍然拒絕 token。確認 COMFY_API_KEY 後再執行 use");
          }
          refreshedToken = true;
          console.log("Comfy 代理拒絕了 token，正在寫回並重啟代理");
          await installProxyToken(ssh);
          await restartProxy(ssh);
        } else {
          console.log(`ComfyUI HTTP ${response.status}`);
        }
      } catch (error) {
        if (error instanceof Error && /拒絕 token|缺少 COMFY_API_KEY|empty token/.test(error.message)) throw error;
        const code = error instanceof Error && "cause" in error ? String((error.cause as { code?: string })?.code || "") : "";
        console.log(`ComfyUI 尚未接受連線${code ? `（${code}）` : ""}`);
      }
    } else if ((await sshCode(ssh, "pid=$(cat /workspace/openjutsu-setup.pid 2>/dev/null || true); [ -n \"$pid\" ] && kill -0 \"$pid\"")) !== 0) {
      missed += 1;
      if (missed >= 2) {
        throw new Error("OpenJutsu 安裝已中斷，ComfyUI 沒有啟動。看 /workspace/openjutsu-setup.log");
      }
      console.log("等待安裝程序出現");
    } else {
      missed = 0;
      console.log("OpenJutsu 仍在安裝");
    }
    await new Promise((resolve) => setTimeout(resolve, 15000));
  }
  throw new Error("OpenJutsu 在 45 分鐘內沒有讓 ComfyUI 接受連線。看 /workspace/openjutsu-setup.log");
}

async function ensureOpenJutsu(instance: VastInstance) {
  const target = sshTarget(instance);
  if (!target) throw new Error("這台機器還沒有 SSH 埠");
  const ssh = ["-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=15", "-p", target.port, `root@${target.host}`];
  const done = (await sshCode(ssh, "test -f /workspace/openjutsu-setup.done")) === 0;
  if (!done) {
    const installing = (await sshCode(ssh, "pid=$(cat /workspace/openjutsu-setup.pid 2>/dev/null || true); [ -n \"$pid\" ] && kill -0 \"$pid\"")) === 0;
    if (!installing) {
      await run("ssh", [...ssh, "mkdir -p /workspace"]);
      await run("scp", [
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        "ConnectTimeout=15",
        "-P",
        target.port,
        path.join(process.cwd(), "scripts/vast-openjutsu-setup.sh"),
        path.join(process.cwd(), "scripts/vast-openjutsu-proxy.py"),
        `root@${target.host}:/workspace/`,
      ]);
      await installProxyToken(ssh);
      await run(
        "ssh",
        [
          ...ssh,
          "chmod +x /workspace/vast-openjutsu-setup.sh; nohup bash /workspace/vast-openjutsu-setup.sh >/tmp/openjutsu-bootstrap.log 2>&1 </dev/null & disown; exit 0",
        ],
      );
      console.log("開始安裝 OpenJutsu");
    }
  }
  await waitForOpenJutsu(instance, ssh);
}

async function waitUntilReady(id: number) {
  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    const found = (await listInstances()).find((item) => item.id === id);
    if (found) {
      console.log(`${id} ${found.actual_status || "?"}→${found.cur_state || "?"}`);
    }
    const url = found ? comfyUrlFromPorts({ publicIp: found.public_ipaddr, ports: found.ports }) : null;
    if (found && (found.actual_status === "running" || found.cur_state === "running") && url && sshTarget(found)) {
      return { instance: found, url };
    }
    await new Promise((resolve) => setTimeout(resolve, 8000));
  }
  throw new Error(`instance ${id} 在 20 分鐘內沒有打開 8189`);
}

async function commandList() {
  const registry = readRegistry();
  const instances = await listInstances();
  for (const slot of registry.slots) {
    const live = instances.find((item) => item.id === slot.instanceId);
    const url = live ? comfyUrlFromPorts({ publicIp: live.public_ipaddr, ports: live.ports }) : null;
    const state =
      live?.actual_status && live.cur_state && live.actual_status !== live.cur_state
        ? `${live.actual_status}→${live.cur_state}`
        : live?.actual_status || live?.cur_state || "missing";
    const mark = registry.active === slot.id ? "*" : " ";
    console.log(
      `${mark} ${slot.id.padEnd(8)} ${slot.gpuName.padEnd(16)} ${String(slot.instanceId ?? "未建立").padEnd(10)} ${state}  ${url || "-"}`,
    );
  }
}

function isStuckLoading(instance: VastInstance | undefined) {
  return instance?.actual_status === "loading" && instance.cur_state === "stopped";
}

async function commandClose() {
  const registry = readRegistry();
  await releaseInactive(registry, registry.active);
  console.log(`${registry.active} 保持不動。其他 GPU 已刪除，閒置不再計費。`);
}

async function commandRepair() {
  const registry = readRegistry();
  const instances = await listInstances();
  for (const slot of registry.slots) {
    const live = instances.find((item) => item.id === slot.instanceId);
    if (!isStuckLoading(live) || !live) continue;
    console.log(`拆掉卡在下載映像的 ${slot.id} ${live.id}`);
    await destroyInstance(live.id);
    slot.instanceId = null;
  }
  writeRegistry(registry);
  await commandUse("4060");
}

async function commandUse(rawId: string) {
  if (!isComfyGpuId(rawId)) throw new Error("請用 4060、ada 或 pro6000");
  const registry = readRegistry();
  const slot = slotById(registry, rawId);
  const instanceId = await ensureInstance(registry, slot);
  const instances = await listInstances();
  const live = instances.find((item) => item.id === instanceId);
  if (live?.cur_state !== "running" && live?.actual_status !== "running") {
    console.log(`啟動 ${slot.id}（${instanceId}）`);
    await setInstanceState(instanceId, "running");
  }
  const ready = await waitUntilReady(instanceId);
  await ensureOpenJutsu(ready.instance);
  pointLocalComfy(ready.url);
  registry.active = rawId;
  writeRegistry(registry);
  console.log(`COMFY_BASE_URL=${ready.url}`);
  await releaseInactive(registry, rawId);
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  if (command === "list") return commandList();
  if (command === "close") return commandClose();
  if (command === "repair") return commandRepair();
  if (command === "use") return commandUse(arg || "");
  console.log("用法：npx tsx scripts/comfy-gpu.ts list|close|repair|use 4060|ada|pro6000");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
