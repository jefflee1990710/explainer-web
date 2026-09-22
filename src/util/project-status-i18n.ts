import type { ProjectStatus } from "@/model/project";
import type { TranslateFn } from "@/util/i18n";
import {
  PROJECT_STEP_IDS,
  STATUS_FILTER_IDS,
  type StatusFilter,
} from "@/service/project-status";

export function projectStepLabel(stepId: (typeof PROJECT_STEP_IDS)[number], t: TranslateFn) {
  return t(`project.steps.${stepId}`);
}

export function projectStatusLabel(status: ProjectStatus, t: TranslateFn) {
  return t(`project.status.${status}`);
}

export function projectFilterLabel(filter: StatusFilter, t: TranslateFn) {
  return t(`project.filters.${filter}`);
}

export function statusFiltersForUi(t: TranslateFn) {
  return STATUS_FILTER_IDS.map((id) => ({ id, label: projectFilterLabel(id, t) }));
}
