"use server";

import * as edit from "@/service/video-edit/edit-actions";
import * as cover from "@/service/video-edit/reel-cover";
import * as templates from "@/service/video-edit/template-actions";

export async function updateVideoEditAction(...args: Parameters<typeof edit.updateVideoEditAction>) {
  return edit.updateVideoEditAction(...args);
}
export async function uploadBrandAssetAction(...args: Parameters<typeof edit.uploadBrandAssetAction>) {
  return edit.uploadBrandAssetAction(...args);
}
export async function listBookendVideosAction(...args: Parameters<typeof edit.listBookendVideosAction>) {
  return edit.listBookendVideosAction(...args);
}
export async function generateReelCoverAction(...args: Parameters<typeof cover.generateReelCoverAction>) {
  return cover.generateReelCoverAction(...args);
}
export async function exportFinalVideoAction(...args: Parameters<typeof edit.exportFinalVideoAction>) {
  return edit.exportFinalVideoAction(...args);
}
export async function listTemplatesAction() {
  return templates.listTemplatesAction();
}
export async function applyTemplateAction(...args: Parameters<typeof templates.applyTemplateAction>) {
  return templates.applyTemplateAction(...args);
}
export async function saveTemplateAction(...args: Parameters<typeof templates.saveTemplateAction>) {
  return templates.saveTemplateAction(...args);
}
export async function overwriteTemplateAction(...args: Parameters<typeof templates.overwriteTemplateAction>) {
  return templates.overwriteTemplateAction(...args);
}
export async function renameTemplateAction(...args: Parameters<typeof templates.renameTemplateAction>) {
  return templates.renameTemplateAction(...args);
}
export async function deleteTemplateAction(...args: Parameters<typeof templates.deleteTemplateAction>) {
  return templates.deleteTemplateAction(...args);
}
