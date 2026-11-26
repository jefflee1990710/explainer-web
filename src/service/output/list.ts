import { ObjectId } from "mongodb";
import {
  canvasJobsCollection,
  charactersCollection,
  directorsCollection,
  extendJobsCollection,
  generationJobsCollection,
  jutsuJobsCollection,
  lifeShotsCollection,
  postsCollection,
  productsCollection,
  teleportJobsCollection,
  videosCollection,
} from "@/dao";
import { userStylesCollection } from "@/dao/user-styles";
import type { GenerationJob } from "@/model/generation-job";
import { taskDetail } from "@/service/generation/task-list";
import {
  generationMediaKind,
  kindFromMediaUrl,
  mergeOutputItems,
  outputItem,
  type OutputListItem,
} from "@/service/output/items";
import { mediaSrc } from "@/util/media-src";

const OUTPUT_LIMIT = 120;

// Finished pictures, videos, and audio for one account, newest first.
export async function listOutputs(clerkUserId: string): Promise<OutputListItem[]> {
  const [
    canvasJobs,
    videos,
    characters,
    styles,
    directors,
    posts,
    products,
    swaps,
    teleports,
    extendsJobs,
    lifeShots,
  ] = await Promise.all([
    (await canvasJobsCollection())
      .find({
        clerkUserId,
        status: "completed",
        outputUrl: { $exists: true, $ne: "" },
      })
      .sort({ updatedAt: -1 })
      .limit(80)
      .toArray(),
    (await videosCollection())
      .find(
        { clerkUserId },
        {
          projection: {
            _id: 1,
            "phaseA.localizedTitle": 1,
            reelUrl: 1,
            reelStatus: 1,
            characterStillUrl: 1,
            objectSheetUrl: 1,
            "backgroundPlates.setId": 1,
            "backgroundPlates.name": 1,
            "backgroundPlates.url": 1,
            "clips.clipNumber": 1,
            "clips.outputUrl": 1,
            "clips.blobUrl": 1,
            "clips.voUrl": 1,
            "clips.status": 1,
            "frames.clipNumber": 1,
            "frames.position": 1,
            "frames.outputUrl": 1,
            "frames.blobUrl": 1,
            "frames.status": 1,
            updatedAt: 1,
            createdAt: 1,
          },
        },
      )
      .sort({ updatedAt: -1 })
      .limit(40)
      .toArray(),
    (await charactersCollection())
      .find({ clerkUserId }, { projection: { _id: 1, name: 1 } })
      .limit(200)
      .toArray(),
    (await userStylesCollection())
      .find({ ownerClerkUserId: clerkUserId }, { projection: { _id: 1, name: 1 } })
      .limit(200)
      .toArray(),
    (await directorsCollection())
      .find({ ownerClerkUserId: clerkUserId }, { projection: { _id: 1, title: 1 } })
      .limit(200)
      .toArray(),
    (await postsCollection())
      .find({ clerkUserId }, { projection: { _id: 1 } })
      .sort({ updatedAt: -1 })
      .limit(60)
      .toArray(),
    (await productsCollection())
      .find({ clerkUserId }, { projection: { _id: 1, name: 1 } })
      .limit(200)
      .toArray(),
    (await jutsuJobsCollection())
      .find({ clerkUserId, status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(40)
      .toArray(),
    (await teleportJobsCollection())
      .find({ clerkUserId, status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(40)
      .toArray(),
    (await extendJobsCollection())
      .find({ clerkUserId, status: "completed" })
      .sort({ updatedAt: -1 })
      .limit(40)
      .toArray(),
    (await lifeShotsCollection())
      .find({ clerkUserId, resultUrl: { $exists: true, $ne: "" } })
      .sort({ createdAt: -1 })
      .limit(40)
      .toArray(),
  ]);

  const rows: Array<OutputListItem | null> = [];

  for (const job of canvasJobs) {
    const url = job.outputUrl?.trim();
    if (!url || job.outputKind === "text") continue;
    const kind = job.outputKind === "video" || job.outputKind === "audio" || job.outputKind === "image"
      ? job.outputKind
      : kindFromMediaUrl(url, "image");
    rows.push(
      outputItem({
        id: `canvas:${job._id.toHexString()}`,
        kind,
        title: job.providerModelId || job.modelId,
        url,
        createdAt: job.updatedAt,
      }),
    );
  }

  for (const video of videos) {
    const when = video.updatedAt ?? video.createdAt ?? new Date(0);
    const title = video.phaseA?.localizedTitle?.trim() || "Video";
    const id = video._id?.toHexString() ?? title;
    if (video.reelStatus === "completed" || video.reelUrl) {
      rows.push(outputItem({ id: `reel:${id}`, kind: "video", title, url: video.reelUrl, createdAt: when }));
    }
    if (video.characterStillUrl) {
      rows.push(
        outputItem({
          id: `still:${id}`,
          kind: "image",
          title,
          url: video.characterStillUrl,
          createdAt: when,
        }),
      );
    }
    if (video.objectSheetUrl) {
      rows.push(
        outputItem({
          id: `sheet:${id}`,
          kind: "image",
          title,
          url: video.objectSheetUrl,
          createdAt: when,
        }),
      );
    }
    for (const plate of video.backgroundPlates ?? []) {
      rows.push(
        outputItem({
          id: `plate:${id}:${plate.setId}`,
          kind: "image",
          title: plate.name || title,
          url: plate.url,
          createdAt: when,
        }),
      );
    }
    for (const frame of video.frames ?? []) {
      if (frame.status !== "completed") continue;
      rows.push(
        outputItem({
          id: `frame:${id}:${frame.clipNumber}:${frame.position}`,
          kind: "image",
          title: `${title} · Clip ${frame.clipNumber}`,
          url: mediaSrc(frame),
          createdAt: when,
        }),
      );
    }
    for (const clip of video.clips ?? []) {
      if (clip.status === "completed") {
        rows.push(
          outputItem({
            id: `clip:${id}:${clip.clipNumber}`,
            kind: "video",
            title: `${title} · Clip ${clip.clipNumber}`,
            url: mediaSrc(clip),
            createdAt: when,
          }),
        );
      }
      rows.push(
        outputItem({
          id: `vo:${id}:${clip.clipNumber}`,
          kind: "audio",
          title: `${title} · Clip ${clip.clipNumber}`,
          url: clip.voUrl,
          createdAt: when,
        }),
      );
    }
  }

  const owners = ownerClauses({
    videoIds: videos.flatMap((video) => (video._id ? [video._id] : [])),
    characterIds: characters.flatMap((doc) => (doc._id ? [doc._id] : [])),
    styleIds: styles.flatMap((doc) => (doc._id ? [doc._id] : [])),
    directorIds: directors.flatMap((doc) => (doc._id ? [doc._id] : [])),
    postIds: posts.flatMap((doc) => (doc._id ? [doc._id] : [])),
    productIds: products.flatMap((doc) => (doc._id ? [doc._id] : [])),
  });
  const jobs = owners
    ? await (await generationJobsCollection())
        .find({
          status: "completed",
          $and: [
            owners,
            { $or: [{ blobUrl: { $nin: [null, ""] } }, { outputUrl: { $nin: [null, ""] } }] },
          ],
        })
        .sort({ updatedAt: -1 })
        .limit(80)
        .toArray()
    : [];
  const nameByCharacter = new Map(
    characters.flatMap((doc) => (doc._id ? [[doc._id.toHexString(), doc.name || "Character"] as const] : [])),
  );
  const nameByStyle = new Map(
    styles.flatMap((doc) => (doc._id ? [[doc._id.toHexString(), doc.name || "Style"] as const] : [])),
  );
  const nameByDirector = new Map(
    directors.flatMap((doc) => (doc._id ? [[doc._id.toHexString(), doc.title || "Director"] as const] : [])),
  );
  const nameByProduct = new Map(
    products.flatMap((doc) => (doc._id ? [[doc._id.toHexString(), doc.name || "Product"] as const] : [])),
  );
  const titleByVideo = new Map(
    videos.flatMap((video) =>
      video._id
        ? [[video._id.toHexString(), video.phaseA?.localizedTitle?.trim() || "Video"] as const]
        : [],
    ),
  );
  for (const job of jobs) {
    rows.push(generationOutput(job, { nameByCharacter, nameByStyle, nameByDirector, nameByProduct, titleByVideo }));
  }

  for (const job of swaps) {
    const when = job.updatedAt;
    const title = job.characterName?.trim() || "Scro Swap";
    const id = job._id?.toHexString() ?? title;
    rows.push(outputItem({ id: `swap-video:${id}`, kind: "video", title, url: job.outputVideoUrl, createdAt: when }));
    rows.push(outputItem({ id: `swap-image:${id}`, kind: "image", title, url: job.outputImageUrl, createdAt: when }));
    rows.push(
      outputItem({
        id: `swap-gif:${id}`,
        kind: kindFromMediaUrl(job.outputGifUrl ?? "", "image"),
        title,
        url: job.outputGifUrl,
        createdAt: when,
      }),
    );
  }
  for (const job of teleports) {
    rows.push(
      outputItem({
        id: `teleport:${job._id?.toHexString() ?? "teleport"}`,
        kind: "video",
        title: "Teleport",
        url: job.outputVideoUrl,
        createdAt: job.updatedAt,
      }),
    );
  }
  for (const job of extendsJobs) {
    rows.push(
      outputItem({
        id: `extend:${job._id?.toHexString() ?? "extend"}`,
        kind: "video",
        title: "Extend",
        url: job.outputVideoUrl,
        createdAt: job.updatedAt,
      }),
    );
  }
  for (const shot of lifeShots) {
    if (shot.status === "failed" || shot.status === "generating") continue;
    rows.push(
      outputItem({
        id: `life:${shot._id.toHexString()}`,
        kind: "image",
        title: shot.characterName || shot.place || "Life",
        url: shot.resultUrl,
        createdAt: shot.createdAt,
      }),
    );
  }

  return mergeOutputItems(rows, OUTPUT_LIMIT);
}

function generationOutput(
  job: GenerationJob,
  names: {
    nameByCharacter: Map<string, string>;
    nameByStyle: Map<string, string>;
    nameByDirector: Map<string, string>;
    nameByProduct: Map<string, string>;
    titleByVideo: Map<string, string>;
  },
): OutputListItem | null {
  const url = mediaSrc(job);
  const named =
    (job.characterId && names.nameByCharacter.get(job.characterId.toHexString())) ||
    (job.userStyleId && names.nameByStyle.get(job.userStyleId.toHexString())) ||
    (job.skillId && names.nameByDirector.get(job.skillId.toHexString())) ||
    (job.productId && names.nameByProduct.get(job.productId.toHexString())) ||
    (job.projectId && names.titleByVideo.get(job.projectId.toHexString())) ||
    "";
  const detail = taskDetail(job);
  return outputItem({
    id: `job:${job._id.toHexString()}`,
    kind: kindFromMediaUrl(url ?? "", generationMediaKind(job.kind)),
    title: named ? `${named} · ${detail}` : detail,
    url,
    createdAt: job.updatedAt,
  });
}

function ownerClauses(input: {
  videoIds: ObjectId[];
  characterIds: ObjectId[];
  styleIds: ObjectId[];
  directorIds: ObjectId[];
  postIds: ObjectId[];
  productIds: ObjectId[];
}) {
  const owners: Array<Record<string, unknown>> = [];
  if (input.videoIds.length === 1) owners.push({ projectId: input.videoIds[0] });
  else if (input.videoIds.length > 1) owners.push({ projectId: { $in: input.videoIds } });
  if (input.characterIds.length) owners.push({ characterId: { $in: input.characterIds } });
  if (input.styleIds.length === 1) owners.push({ userStyleId: input.styleIds[0] });
  else if (input.styleIds.length > 1) owners.push({ userStyleId: { $in: input.styleIds } });
  if (input.directorIds.length === 1) owners.push({ skillId: input.directorIds[0] });
  else if (input.directorIds.length > 1) owners.push({ skillId: { $in: input.directorIds } });
  if (input.postIds.length === 1) owners.push({ postId: input.postIds[0] });
  else if (input.postIds.length > 1) owners.push({ postId: { $in: input.postIds } });
  if (input.productIds.length === 1) owners.push({ productId: input.productIds[0] });
  else if (input.productIds.length > 1) owners.push({ productId: { $in: input.productIds } });
  if (owners.length === 0) return null;
  return owners.length === 1 ? owners[0] : { $or: owners };
}
