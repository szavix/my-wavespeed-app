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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const notion = getNotionClient();
    const databaseId = getDatabaseId();
    const response = await queryItems(notion, databaseId);

    const referenceImages = (response?.results || []).map((page) => ({
      id: page.id,
      name: extractTitle(page),
      images: extractImages(page),
    }));

    res.status(200).json({ referenceImages });
  } catch (err) {
    console.error('Reference image API error:', err);
    res.status(500).json({ error: err?.message || 'Unknown server error' });
  }
}
