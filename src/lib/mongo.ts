import { MongoClient, type Db } from "mongodb";

function getMongoUri() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI");
  }
  return uri;
}

function getDbName() {
  return process.env.MONGODB_DB || "explainer-db";
}

const globalForMongo = globalThis as typeof globalThis & {
  _mongoClient?: MongoClient;
  _mongoClientPromise?: Promise<MongoClient>;
};

function getClientPromise() {
  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(getMongoUri());
    globalForMongo._mongoClientPromise = client.connect();
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  globalForMongo._mongoClient = client;
  return client.db(getDbName());
}
