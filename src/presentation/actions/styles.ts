"use server";

import * as service from "@/service/style/user-style-actions";

export type {
  CreateUserStyleResult,
  SaveUserStyleResult,
  DeleteUserStyleResult,
} from "@/service/style/user-style-actions";

export async function createUserStyleAction(
  ...args: Parameters<typeof service.createUserStyleAction>
) {
  return service.createUserStyleAction(...args);
}

export async function saveUserStyleAction(
  ...args: Parameters<typeof service.saveUserStyleAction>
) {
  return service.saveUserStyleAction(...args);
}

export async function deleteUserStyleAction(
  ...args: Parameters<typeof service.deleteUserStyleAction>
) {
  return service.deleteUserStyleAction(...args);
}
