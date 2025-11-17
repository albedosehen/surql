import { Serialized, createSerializer, RecordId, query, SurQLClient } from "@oneiriq/surql";

const client = new SurQLClient({
    host: '10.0.0.110',
    namespace: 'oneiric',
    database: 'resume',
    username: 'test',
    password: '0mel3tte',
    protocol: 'http',
    port: '8080',
    useSSL: false,
});

interface Tag {
    id: RecordId
    description: string
    name: string
}

type SerializedTag = Serialized<Tag>
const serializer = createSerializer<Tag>()

const mapTag = (raw: Tag): Serialized<Tag> => ({
    id: serializer.id(raw),
    description: raw.description,
    name: raw.name,
})


client.query<Tag, SerializedTag>('tag').map(mapTag).execute().then((res) => {
    console.log(res);
}).catch((e) => {
    console.error('Error executing query:', e);
});