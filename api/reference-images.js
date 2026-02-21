import { Client } from '@notionhq/client';

let notionClient = null;
let resolvedDataSourceId = null;

function getNotionClient() {
  if (notionClient) return notionClient;
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) throw new Error('NOTION_API_KEY is not configured.');
  notionClient = new Client({ auth: apiKey });
  return notionClient;
}

function getDatabaseId() {
  const databaseId = process.env.NOTION_REFERENCE_DATABASE_ID;
  if (!databaseId) throw new Error('NOTION_REFERENCE_DATABASE_ID is not configured.');
  return databaseId;
}

function parseBody(reqBody) {
  if (!reqBody) return {};
  if (typeof reqBody === 'string') {
    try {
      return JSON.parse(reqBody);
    } catch {
      return {};
    }
  }
  return reqBody;
}

function extractTitle(page) {
  const nameProp = Object.values(page?.properties || {}).find(
    (prop) => prop?.type === 'title' && Array.isArray(prop.title)
  );
  if (nameProp?.title?.length > 0) {
    return nameProp.title.map((t) => t.plain_text).join('');
  }
  return 'Untitled';
}

function extractImages(page) {
  const filesProp = Object.values(page?.properties || {}).find(
    (prop) => prop?.type === 'files' && Array.isArray(prop.files)
  );
  if (!filesProp) return [];

  return filesProp.files
    .map((file) => {
      if (file?.type === 'file') return file.file?.url;
      if (file?.type === 'external') return file.external?.url;
      return null;
    })
    .filter(Boolean);
}

function extractType(page) {
  const typeProp = page?.properties?.type || page?.properties?.Type;
  if (!typeProp) return null;
  if (typeProp.type === 'select') return typeProp.select?.name || null;
  if (typeProp.type === 'multi_select') return typeProp.multi_select?.[0]?.name || null;
  if (typeProp.type === 'status') return typeProp.status?.name || null;
  if (typeProp.type === 'rich_text') return typeProp.rich_text?.map((t) => t.plain_text).join('') || null;
  return null;
}

async function queryItems(notion, databaseId) {
  if (notion.dataSources?.query) {
    if (!resolvedDataSourceId) {
      try {
        const initial = await notion.dataSources.query({
          data_source_id: databaseId,
          page_size: 100,
        });
        resolvedDataSourceId = databaseId;
        return initial;
      } catch {
        const db = await notion.databases.retrieve({ database_id: databaseId });
        resolvedDataSourceId = db?.data_sources?.[0]?.id || null;
        if (!resolvedDataSourceId) {
          throw new Error('Could not resolve Notion data source from NOTION_REFERENCE_DATABASE_ID.');
        }
      }
    }

    return notion.dataSources.query({
      data_source_id: resolvedDataSourceId,
      page_size: 100,
    });
  }

  if (notion.databases?.query) {
    return notion.databases.query({
      database_id: databaseId,
      page_size: 100,
    });
  }

  throw new Error('Unsupported Notion SDK: no query method found.');
}

async function getSchemaProperties(notion, databaseId) {
  const database = await notion.databases.retrieve({ database_id: databaseId });
  let properties = database?.properties || {};

  if (Object.keys(properties).length === 0 && notion.dataSources?.retrieve) {
    let dataSourceId = resolvedDataSourceId || database?.data_sources?.[0]?.id || null;
    if (dataSourceId) {
      const dataSource = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
      properties = dataSource?.properties || dataSource?.data_source?.properties || {};
      resolvedDataSourceId = dataSourceId;
    }
  }

  return properties;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const notion = getNotionClient();
    const databaseId = getDatabaseId();
    if (req.method === 'POST') {
      const body = parseBody(req.body);
      const name = body.name;
      const imageUrl = body.imageUrl;
      const normalizedType = String(body.type || '').trim().toLowerCase();

      if (!name || !imageUrl || !['photo', 'reel'].includes(normalizedType)) {
        res.status(400).json({ error: 'name, imageUrl, and type (photo or reel) are required.' });
        return;
      }

      const schemaProperties = await getSchemaProperties(notion, databaseId);
      const entries = Object.entries(schemaProperties || {});
      const findByType = (propType) => entries.find(([, prop]) => prop?.type === propType)?.[0] || null;
      const findByNameAndType = (nameRegex, types) =>
        entries.find(([propName, prop]) => nameRegex.test(propName) && types.includes(prop?.type))?.[0] || null;

      const titleKey = findByNameAndType(/^name$/i, ['title']) || findByType('title');
      const filesKey = findByNameAndType(/image|file|media/i, ['files']) || findByType('files');
      const typeKey = findByNameAndType(/^type$/i, ['select', 'multi_select', 'status', 'rich_text']) ||
        findByNameAndType(/type|category/i, ['select', 'multi_select', 'status', 'rich_text']);

      if (!titleKey || !filesKey || !typeKey) {
        res.status(400).json({ error: 'Could not map required Notion properties (name/title, image/files, type).' });
        return;
      }

      const properties = {
        [titleKey]: {
          title: [{ type: 'text', text: { content: name } }],
        },
        [filesKey]: {
          files: [{ name: 'Generated image', type: 'external', external: { url: imageUrl } }],
        },
      };

      const typeProp = schemaProperties[typeKey];
      if (typeProp?.type === 'select') {
        properties[typeKey] = { select: { name: normalizedType } };
      } else if (typeProp?.type === 'multi_select') {
        properties[typeKey] = { multi_select: [{ name: normalizedType }] };
      } else if (typeProp?.type === 'status') {
        properties[typeKey] = { status: { name: normalizedType } };
      } else if (typeProp?.type === 'rich_text') {
        properties[typeKey] = { rich_text: [{ type: 'text', text: { content: normalizedType } }] };
      }

      await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      });

      res.status(200).json({ ok: true });
      return;
    }

    const response = await queryItems(notion, databaseId);
    const referenceImages = (response?.results || []).map((page) => ({
      id: page.id,
      name: extractTitle(page),
      images: extractImages(page),
      type: extractType(page),
    }));
    res.status(200).json({ referenceImages });
  } catch (err) {
    console.error('Reference image API error:', err);
    res.status(500).json({ error: err?.message || 'Unknown server error' });
  }
}
