import { charactersCollection, skillsCollection, videosCollection } from "@/dao";
import { sendCharacterVersion } from "@/service/character/generate";
import { runPhaseBForClip } from "@/service/director/run-phase-b";
import { asRunSkill } from "@/service/director/behavior-slug";
import { clipKeyframeUrls } from "@/service/higgsfield/clip-keyframes";
import { videoStyle } from "@/service/higgsfield/frame-prompts";
import { sendClipVideo, sendFrame, sendStill } from "@/service/higgsfield/pipeline";
import { PermanentJobError } from "@/service/generation/task-policy";
import type { Sent } from "@/service/generation/sent";
import type { Character } from "@/model/character";
import type { GenerationJob } from "@/model/generation-job";
import type { Project } from "@/model/project";

// Load fresh state and call the provider for one claimed job.
export async function sendJob(job: GenerationJob): Promise<Sent> {
  if (job.kind === "character") return sendCharacter(job);

  if (!job.projectId) throw new PermanentJobError("任務缺少影片");
  const projects = await videosCollection();
  const project = await projects.findOne({ _id: job.projectId });
  if (!project) throw new PermanentJobError("影片已不存在");

  if (job.kind === "still") return sendStill(project);
  const clipNumber = job.clipIndex + 1;
  if (job.kind === "frame") {
    if (!job.framePosition) throw new PermanentJobError("任務缺少畫格位置");
    return sendFrame(project, clipNumber, job.framePosition);
  }
  return sendVideo(project, clipNumber);
}

async function sendCharacter(job: GenerationJob) {
  const characters = await charactersCollection();
  const character = (await characters.findOne({ _id: job.characterId })) as Character | null;
  const version = character?.versions.find((item) => item.id.equals(job.versionId!));
  if (!character || !version) throw new PermanentJobError("角色版本已不存在");
  return sendCharacterVersion(character, version);
}

// Phase B runs once: a retry reuses the prompt already written to the clip.
async function sendVideo(project: Project, clipNumber: number) {
  if (!project.phaseA) throw new PermanentJobError("找不到分鏡");
  // Missing keyframes will not fix themselves; stop before spending a Phase B call.
  const { start, end } = clipKeyframeUrls(project.frames, clipNumber);
  if (!start || !end) {
    throw new PermanentJobError("這段的起點或終點畫格還沒有檔案，無法產片");
  }
  const clip = project.clips.find((item) => item.clipNumber === clipNumber);
  if (clip?.prompt) {
    return sendClipVideo(project, clipNumber, {
      clipNumber,
      prompt: clip.prompt,
      durationSeconds: clip.durationSeconds,
    });
  }

  const skills = await skillsCollection();
  const skill = await skills.findOne({ _id: project.skillId });
  if (!skill) throw new PermanentJobError("找不到風格");
  const prompt = await runPhaseBForClip({
    skill: asRunSkill(skill),
    style: videoStyle(project),
    phaseA: project.phaseA,
    clipNumber,
    language: project.language,
    voiceGender: project.voiceGender,
    speechPace: project.speechPace,
    characterImageUrl: project.characterImageUrl,
    cast: project.cast,
  });
  const projects = await videosCollection();
  await projects.updateOne(
    { _id: project._id },
    {
      $set: {
        "clips.$[clip].prompt": prompt.prompt,
        "clips.$[clip].durationSeconds": prompt.durationSeconds,
        updatedAt: new Date(),
      },
    },
    { arrayFilters: [{ "clip.clipNumber": clipNumber }] },
  );
  return sendClipVideo(project, clipNumber, prompt);
}
