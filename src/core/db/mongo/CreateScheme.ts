import { Collection, Db, Document } from 'mongodb';

const transformToSchema = (model: Record<string, any>) => {
  return {
    bsonType: 'object',
    required: Object.keys(model).filter((key) => model[key]?.isRequired),
    properties: Object.fromEntries(
      Object.entries(model).map(([key, value]) => [
        key,
        {
          bsonType: value.type || 'string', // По умолчанию тип 'string'
        },
      ]),
    ),
  };
};

export const CreateScheme = async <T>(
  db: Db,
  name: string,
  model: T,
): Promise<Collection<Document>> => {
  const schema = transformToSchema(model as Record<string, any>);

  await db.createCollection(name, {
    validator: {
      $jsonSchema: schema,
    },
  });

  return db.collection(name);
};
