import { Collection, Db, Document } from "mongodb";

export const CreateScheme = async <T>(
  db: Db,
  name: string,
  model: Record<string, any>,
  required: string[]
): Promise<Collection<Document>> => {
  await db.createCollection(name, {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: required,
        properties: model,
      },
    },
  });

  return db.collection(name);
};