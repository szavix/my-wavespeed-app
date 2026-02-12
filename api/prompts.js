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
  const databaseId = process.env.NOTION_PROMPTS_DATABASE_ID;
  if (!databaseId) throw new Error('NOTION_PROMPTS_DATABASE_ID is not configured.');
  return databaseId;
}

async function queryPrompts(notion, databaseId) {
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
          throw new Error('Could not resolve Notion data source from NOTION_PROMPTS_DATABASE_ID.');
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

function getPropertyByName(properties, nameRegex) {
  const entry = Object.entries(properties || {}).find(([name]) => nameRegex.test(name));
  return entry ? entry[1] : null;
}

function extractTitle(page) {
  const titleProp = Object.values(page?.properties || {}).find((prop) => prop?.type === 'title');
  if (!titleProp?.title?.length) return 'Untitled';
  return titleProp.title.map((t) => t.plain_text).join('');
}

function extractPromptText(page) {
  const props = page?.properties || {};
  const promptProp = getPropertyByName(props, /^prompt$/i) ||
    Object.values(props).find((prop) => prop?.type === 'rich_text');

  if (!promptProp) return '';
  if (promptProp.type === 'rich_text') {
    return promptProp.rich_text?.map((t) => t.plain_text).join('') || '';
  }
  if (promptProp.type === 'title') {
    return promptProp.title?.map((t) => t.plain_text).join('') || '';
  }
  return '';
}

function isFavourite(page) {
  const props = page?.properties || {};
  const favProp = getPropertyByName(props, /^favo(u)?rite$/i);
  if (!favProp) return false;

  if (favProp.type === 'checkbox') return Boolean(favProp.checkbox);
  if (favProp.type === 'select') return String(favProp.select?.name || '').toLowerCase() === 'yes';
  if (favProp.type === 'status') return String(favProp.status?.name || '').toLowerCase() === 'yes';
  if (favProp.type === 'rich_text') {
    const text = favProp.rich_text?.map((t) => t.plain_text).join('').trim().toLowerCase();
    return text === 'yes' || text === 'true' || text === '1';
  }
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const notion = getNotionClient();
    const databaseId = getDatabaseId();
    const response = await queryPrompts(notion, databaseId);

    const prompts = (response?.results || [])
      .filter((page) => isFavourite(page))
      .map((page) => ({
        id: page.id,
        title: extractTitle(page),
        prompt: extractPromptText(page),
      }))
      .filter((item) => item.prompt);

    res.status(200).json({ prompts });
  } catch (err) {
    console.error('Prompts API error:', err);
    res.status(500).json({ error: err?.message || 'Unknown server error' });
  }
}
