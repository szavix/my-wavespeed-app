import { Client } from '@notionhq/client';

let notionClient = null;
let resolvedDataSourceId = null;

function getNotionClient() {
  if (notionClient) return notionClient;
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error('NOTION_API_KEY is not configured.');
  }
  notionClient = new Client({ auth: apiKey });
  return notionClient;
}

function getDatabaseId() {
  const databaseId = process.env.NOTION_OUTFIT_DATABASE_ID;
  if (!databaseId) {
    throw new Error('NOTION_OUTFIT_DATABASE_ID is not configured.');
  }
  return databaseId;
}

function extractTitle(page) {
  const nameProperty = page?.properties?.Name;
  if (nameProperty?.title?.length > 0) {
    return nameProperty.title.map((t) => t.plain_text).join('');
  }

  const titleProp = Object.values(page?.properties || {}).find(
    (prop) => prop?.type === 'title' && Array.isArray(prop.title)
  );
  if (titleProp?.title?.length > 0) {
    return titleProp.title.map((t) => t.plain_text).join('');
  }

  return 'Untitled';
}

function extractImages(page) {
  const imageProperty = page?.properties?.Image;
  if (imageProperty?.type !== 'files' || !Array.isArray(imageProperty.files)) {
    return [];
  }

  return imageProperty.files
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

  if (typeProp.type === 'select') {
    return typeProp.select?.name || null;
  }
  if (typeProp.type === 'multi_select') {
    return typeProp.multi_select?.[0]?.name || null;
  }
  if (typeProp.type === 'rich_text') {
    return typeProp.rich_text?.map((t) => t.plain_text).join('') || null;
  }
  return null;
}

async function queryOutfits(notion, databaseId) {
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
          throw new Error('Could not resolve Notion data source from NOTION_OUTFIT_DATABASE_ID.');
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
    const response = await queryOutfits(notion, databaseId);

    const outfits = (response?.results || []).map((page) => ({
      id: page.id,
      name: extractTitle(page),
      images: extractImages(page),
      type: extractType(page),
    }));

    res.status(200).json({ outfits });
  } catch (err) {
    console.error('Notion API error:', err);
    res.status(500).json({ error: err?.message || 'Unknown server error' });
  }
}
