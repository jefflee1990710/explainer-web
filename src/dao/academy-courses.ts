import type { Collection, OptionalId } from "mongodb";
import { getDb } from "@/dao/mongo";
import type { AcademyCourse } from "@/model/academy-course";

let indexEnsured = false;

// Access the `academy_courses` MongoDB collection with a unique index on `slug`.
export async function academyCoursesCollection(): Promise<
  Collection<OptionalId<AcademyCourse>>
> {
  const db = await getDb();
  const collection = db.collection<OptionalId<AcademyCourse>>("academy_courses");
  if (!indexEnsured) {
    indexEnsured = true;
    collection.createIndex({ slug: 1 }, { unique: true }).catch(() => {
      indexEnsured = false;
    });
    collection.createIndex({ published: 1, sortOrder: 1, createdAt: -1 }).catch(() => {
      indexEnsured = false;
    });
  }
  return collection;
}
