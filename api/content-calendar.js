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
  const databaseId = process.env.NOTION_CONTENT_CALENDAR_DATABASE_ID;
  if (!databaseId) throw new Error('NOTION_CONTENT_CALENDAR_DATABASE_ID is not configured.');
  return databaseId;
}

async function queryDatabase(notion, databaseId, filter) {
  if (notion.dataSources?.query) {
    if (!resolvedDataSourceId) {
      try {
        const initial = await notion.dataSources.query({
          data_source_id: databaseId,
          page_size: 100,
          ...(filter ? { filter } : {}),
        });
        resolvedDataSourceId = databaseId;
        return initial;
      } catch {
        const db = await notion.databases.retrieve({ database_id: databaseId });
        resolvedDataSourceId = db?.data_sources?.[0]?.id || null;
        if (!resolvedDataSourceId) {
          throw new Error('Could not resolve Notion data source from NOTION_CONTENT_CALENDAR_DATABASE_ID.');
        }
      }
    }

    return notion.dataSources.query({
      data_source_id: resolvedDataSourceId,
      page_size: 100,
      ...(filter ? { filter } : {}),
    });
  }

  if (notion.databases?.query) {
    return notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      ...(filter ? { filter } : {}),
    });
  }

  throw new Error('Unsupported Notion SDK: no query method found.');
}

function detectKeys(database) {
  const props = database?.properties || {};
  const entries = Object.entries(props);

  const findByType = (type) => entries.find(([, prop]) => prop?.type === type)?.[0] || null;
  const findByNameAndType = (nameRegex, types) =>
    entries.find(([name, prop]) => nameRegex.test(name) && types.includes(prop?.type))?.[0] || null;

  const titleKey = findByType('title');
  const dateKey = findByNameAndType(/publish\s*date/i, ['date']) || findByType('date');
  const platformKey = findByNameAndType(/platform/i, ['select', 'multi_select', 'rich_text', 'status']) ||
    findByType('select') ||
    findByType('multi_select') ||
    findByType('status') ||
    findByType('rich_text');
  const filesKey = findByNameAndType(/files?\s*&?\s*media/i, ['files']) || findByType('files');

  return { titleKey, dateKey, platformKey, filesKey };
}

function extractPlatformOptions(database, platformKey) {
  const prop = database?.properties?.[platformKey];
  if (!prop) return [];
  if (prop.type === 'select') return (prop.select?.options || []).map((o) => o.name).filter(Boolean);
  if (prop.type === 'multi_select') return (prop.multi_select?.options || []).map((o) => o.name).filter(Boolean);
  if (prop.type === 'status') return (prop.status?.options || []).map((o) => o.name).filter(Boolean);
  return [];
}

function extractTitle(page, titleKey) {
  const prop = page?.properties?.[titleKey];
  if (!prop?.title?.length) return 'Untitled';
  return prop.title.map((t) => t.plain_text).join('');
}

function extractPlatform(page, platformKey) {
  const prop = page?.properties?.[platformKey];
  if (!prop) return null;
  if (prop.type === 'select') return prop.select?.name || null;
  if (prop.type === 'multi_select') return prop.multi_select?.[0]?.name || null;
  if (prop.type === 'status') return prop.status?.name || null;
  if (prop.type === 'rich_text') return prop.rich_text?.map((t) => t.plain_text).join('') || null;
  return null;
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

function extractImageUrl(page, filesKey) {
  const files = page?.properties?.[filesKey]?.files || [];
  const first = files[0];
  if (!first) return null;
  if (first.type === 'file') return first.file?.url || null;
  if (first.type === 'external') return first.external?.url || null;
  return null;
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

export default async function handler(req, res) {
  try {
    const notion = getNotionClient();
    const databaseId = getDatabaseId();
    const schemaProperties = await getSchemaProperties(notion, databaseId);
    const keys = detectKeys({ properties: schemaProperties });

    if (req.method === 'GET') {
      const date = req.query?.date || null;
      const filter = date && keys.dateKey
        ? { property: keys.dateKey, date: { equals: date } }
        : undefined;

      const response = await queryDatabase(notion, databaseId, filter);
      let items = (response?.results || []).map((page) => ({
        id: page.id,
        title: extractTitle(page, keys.titleKey),
        publishDate: keys.dateKey ? page?.properties?.[keys.dateKey]?.date?.start || null : null,
        platform: keys.platformKey ? extractPlatform(page, keys.platformKey) : null,
        imageUrl: keys.filesKey ? extractImageUrl(page, keys.filesKey) : null,
      }));

      if (date && !keys.dateKey) {
        items = [];
      }

      res.status(200).json({
        items,
        platformOptions: extractPlatformOptions({ properties: schemaProperties }, keys.platformKey),
      });
      return;
    }

    if (req.method === 'POST') {
      const body = parseBody(req.body);
      const publishDate = body.publishDate;
      const platform = body.platform;
      const imageUrl = body.imageUrl;
      const title = body.title || 'Generated Content';

      if (!publishDate || !platform || !imageUrl) {
        res.status(400).json({ error: 'publishDate, platform, and imageUrl are required.' });
        return;
      }

      if (!keys.titleKey || !keys.dateKey || !keys.platformKey || !keys.filesKey) {
        res.status(400).json({ error: 'Could not map required Notion properties (title, date, platform, files).' });
        return;
      }

      const properties = {
        [keys.titleKey]: {
          title: [{ type: 'text', text: { content: title } }],
        },
        [keys.dateKey]: {
          date: { start: publishDate },
        },
        [keys.filesKey]: {
          files: [{ name: 'Generated image', type: 'external', external: { url: imageUrl } }],
        },
      };

      const platformProp = schemaProperties[keys.platformKey];
      if (platformProp?.type === 'select') {
        properties[keys.platformKey] = { select: { name: platform } };
      } else if (platformProp?.type === 'multi_select') {
        properties[keys.platformKey] = { multi_select: [{ name: platform }] };
      } else if (platformProp?.type === 'status') {
        properties[keys.platformKey] = { status: { name: platform } };
      } else if (platformProp?.type === 'rich_text') {
        properties[keys.platformKey] = { rich_text: [{ type: 'text', text: { content: platform } }] };
      }

      await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
      });

      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Content Calendar API error:', err);
    res.status(500).json({ error: err?.message || 'Unknown server error' });
  }
}
