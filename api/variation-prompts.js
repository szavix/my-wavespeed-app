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
  const databaseId = process.env.NOTION_VARIATION_PROMPTS_DATABASE_ID || process.env.NOTION_PROMPTS_DATABASE_ID;
  if (!databaseId) {
    throw new Error('NOTION_VARIATION_PROMPTS_DATABASE_ID or NOTION_PROMPTS_DATABASE_ID is not configured.');
  }
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
          throw new Error('Could not resolve Notion data source from variation prompts database ID.');
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
  const textProp = getPropertyByName(props, /^text$/i) ||
    getPropertyByName(props, /^prompt$/i) ||
    Object.values(props).find((prop) => prop?.type === 'rich_text');

  if (!textProp) return '';
  if (textProp.type === 'rich_text') {
    return textProp.rich_text?.map((t) => t.plain_text).join('') || '';
  }
  if (textProp.type === 'title') {
    return textProp.title?.map((t) => t.plain_text).join('') || '';
  }
  return '';
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
      .map((page) => ({
        id: page.id,
        title: extractTitle(page),
        prompt: extractPromptText(page),
      }))
      .filter((item) => item.prompt);

    res.status(200).json({ prompts });
  } catch (err) {
    console.error('Variation prompts API error:', err);
    res.status(500).json({ error: err?.message || 'Unknown server error' });
  }
}
