import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// Notion API plugin – adds dev-server middleware for /api/outfits and /api/notion-image
function notionPlugin() {
  let notionClient = null;
  let outfitDatabaseId = '';
  let referenceDatabaseId = '';
  let contentCalendarDatabaseId = '';
  let promptsDatabaseId = '';

  return {
    name: 'notion-api',
    configureServer(server) {
      const getNotion = () => {
        if (notionClient) return notionClient;
        const env = loadEnv('', process.cwd(), '');
        const apiKey = env.NOTION_API_KEY;
        outfitDatabaseId = env.NOTION_OUTFIT_DATABASE_ID;
        referenceDatabaseId = env.NOTION_REFERENCE_DATABASE_ID;
        contentCalendarDatabaseId = env.NOTION_CONTENT_CALENDAR_DATABASE_ID;
        promptsDatabaseId = env.NOTION_PROMPTS_DATABASE_ID;
        if (!apiKey || !outfitDatabaseId) {
          throw new Error('NOTION_API_KEY and NOTION_OUTFIT_DATABASE_ID must be set in .env.local');
        }
        // Use require() to avoid Vite's esbuild transform mangling the import
        const { Client } = require('@notionhq/client');
        notionClient = new Client({ auth: apiKey });
        return notionClient;
      };

      // GET /api/outfits — returns list of outfits with names and image URLs
      server.middlewares.use('/api/outfits', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const notion = getNotion();

          // Notion SDK v5 uses dataSources.query; older SDKs used databases.query
          let response;
          if (notion.dataSources?.query) {
            try {
              response = await notion.dataSources.query({
                data_source_id: outfitDatabaseId,
                page_size: 100,
              });
            } catch (queryErr) {
              // If user provided a database ID, resolve its first data source and retry.
              if (!notion.databases?.retrieve) throw queryErr;
              const db = await notion.databases.retrieve({ database_id: outfitDatabaseId });
              const resolvedDataSourceId = db?.data_sources?.[0]?.id;
              if (!resolvedDataSourceId) throw queryErr;
              response = await notion.dataSources.query({
                data_source_id: resolvedDataSourceId,
                page_size: 100,
              });
            }
          } else if (notion.databases?.query) {
            response = await notion.databases.query({
              database_id: outfitDatabaseId,
              page_size: 100,
            });
          } else {
            throw new Error('Unsupported Notion SDK: no query method found on dataSources or databases.');
          }

          const outfits = response.results.map((page) => {
            // Extract name
            const nameProperty = page.properties.Name;
            let name = 'Untitled';
            if (nameProperty?.title?.length > 0) {
              name = nameProperty.title.map(t => t.plain_text).join('');
            }

            // Extract image URLs from the "Image" files property
            const imageProperty = page.properties.Image;
            const images = [];
            if (imageProperty?.files) {
              for (const file of imageProperty.files) {
                if (file.type === 'file') {
                  images.push(file.file.url);
                } else if (file.type === 'external') {
                  images.push(file.external.url);
                }
              }
            }

            const typeProperty = page.properties.type || page.properties.Type;
            let type = null;
            if (typeProperty?.type === 'select') {
              type = typeProperty.select?.name || null;
            } else if (typeProperty?.type === 'multi_select') {
              type = typeProperty.multi_select?.[0]?.name || null;
            } else if (typeProperty?.type === 'rich_text') {
              type = typeProperty.rich_text?.map((t) => t.plain_text).join('') || null;
            }

            return {
              id: page.id,
              name,
              images,
              type,
            };
          });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ outfits }));
        } catch (err) {
          console.error('Notion API error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // GET /api/prompts — return favourite prompts from Notion prompts database
      server.middlewares.use('/api/prompts', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          if (!promptsDatabaseId) {
            throw new Error('NOTION_PROMPTS_DATABASE_ID must be set in .env.local');
          }

          const notion = getNotion();
          let response;
          if (notion.dataSources?.query) {
            try {
              response = await notion.dataSources.query({
                data_source_id: promptsDatabaseId,
                page_size: 100,
              });
            } catch (queryErr) {
              if (!notion.databases?.retrieve) throw queryErr;
              const db = await notion.databases.retrieve({ database_id: promptsDatabaseId });
              const resolvedDataSourceId = db?.data_sources?.[0]?.id;
              if (!resolvedDataSourceId) throw queryErr;
              response = await notion.dataSources.query({
                data_source_id: resolvedDataSourceId,
                page_size: 100,
              });
            }
          } else if (notion.databases?.query) {
            response = await notion.databases.query({
              database_id: promptsDatabaseId,
              page_size: 100,
            });
          } else {
            throw new Error('Unsupported Notion SDK: no query method found on dataSources or databases.');
          }

          const isFavourite = (page) => {
            const props = page?.properties || {};
            const favEntry = Object.entries(props).find(([name]) => /^favo(u)?rite$/i.test(name));
            const favProp = favEntry?.[1];
            if (!favProp) return false;
            if (favProp.type === 'checkbox') return Boolean(favProp.checkbox);
            if (favProp.type === 'select') return String(favProp.select?.name || '').toLowerCase() === 'yes';
            if (favProp.type === 'status') return String(favProp.status?.name || '').toLowerCase() === 'yes';
            if (favProp.type === 'rich_text') {
              const text = favProp.rich_text?.map((t) => t.plain_text).join('').trim().toLowerCase();
              return text === 'yes' || text === 'true' || text === '1';
            }
            return false;
          };

          const prompts = (response.results || [])
            .filter((page) => isFavourite(page))
            .map((page) => {
              const props = page?.properties || {};
              const titleProp = Object.values(props).find((prop) => prop?.type === 'title');
              const promptProp = Object.entries(props).find(([name]) => /^prompt$/i.test(name))?.[1] ||
                Object.values(props).find((prop) => prop?.type === 'rich_text');

              const title = titleProp?.title?.length
                ? titleProp.title.map((t) => t.plain_text).join('')
                : 'Untitled';
              const prompt = promptProp?.type === 'rich_text'
                ? promptProp.rich_text?.map((t) => t.plain_text).join('') || ''
                : promptProp?.type === 'title'
                  ? promptProp.title?.map((t) => t.plain_text).join('') || ''
                  : '';

              return { id: page.id, title, prompt };
            })
            .filter((item) => item.prompt);

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ prompts }));
        } catch (err) {
          console.error('Prompts API error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // /api/content-calendar — GET by date + POST schedule item
      server.middlewares.use('/api/content-calendar', async (req, res) => {
        if (!['GET', 'POST'].includes(req.method)) {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          if (!contentCalendarDatabaseId) {
            throw new Error('NOTION_CONTENT_CALENDAR_DATABASE_ID must be set in .env.local');
          }

          const notion = getNotion();
          const database = await notion.databases.retrieve({ database_id: contentCalendarDatabaseId });
          let properties = database.properties || {};
          if (Object.keys(properties).length === 0 && notion.dataSources?.retrieve) {
            const dataSourceId = database?.data_sources?.[0]?.id;
            if (dataSourceId) {
              const dataSource = await notion.dataSources.retrieve({ data_source_id: dataSourceId });
              properties = dataSource?.properties || dataSource?.data_source?.properties || {};
            }
          }
          const entries = Object.entries(properties);
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

          const queryWithFilter = async (filter) => {
            let response;
            if (notion.dataSources?.query) {
              try {
                response = await notion.dataSources.query({
                  data_source_id: contentCalendarDatabaseId,
                  page_size: 100,
                  ...(filter ? { filter } : {}),
                });
              } catch (queryErr) {
                if (!notion.databases?.retrieve) throw queryErr;
                const db = await notion.databases.retrieve({ database_id: contentCalendarDatabaseId });
                const resolvedDataSourceId = db?.data_sources?.[0]?.id;
                if (!resolvedDataSourceId) throw queryErr;
                response = await notion.dataSources.query({
                  data_source_id: resolvedDataSourceId,
                  page_size: 100,
                  ...(filter ? { filter } : {}),
                });
              }
            } else if (notion.databases?.query) {
              response = await notion.databases.query({
                database_id: contentCalendarDatabaseId,
                page_size: 100,
                ...(filter ? { filter } : {}),
              });
            } else {
              throw new Error('Unsupported Notion SDK: no query method found on dataSources or databases.');
            }
            return response;
          };

          if (req.method === 'GET') {
            const url = new URL(req.url, 'http://localhost');
            const date = url.searchParams.get('date');
            const filter = date && dateKey ? { property: dateKey, date: { equals: date } } : undefined;
            const response = await queryWithFilter(filter);

            const items = (response.results || []).map((page) => {
              const title = titleKey && page.properties?.[titleKey]?.title?.length
                ? page.properties[titleKey].title.map((t) => t.plain_text).join('')
                : 'Untitled';

              const platformProp = platformKey ? page.properties?.[platformKey] : null;
              let platform = null;
              if (platformProp?.type === 'select') platform = platformProp.select?.name || null;
              else if (platformProp?.type === 'multi_select') platform = platformProp.multi_select?.[0]?.name || null;
              else if (platformProp?.type === 'status') platform = platformProp.status?.name || null;
              else if (platformProp?.type === 'rich_text') platform = platformProp.rich_text?.map((t) => t.plain_text).join('') || null;

              const files = filesKey ? page.properties?.[filesKey]?.files || [] : [];
              const first = files[0];
              let imageUrl = null;
              if (first?.type === 'file') imageUrl = first.file?.url || null;
              else if (first?.type === 'external') imageUrl = first.external?.url || null;

              return {
                id: page.id,
                title,
                publishDate: dateKey ? page.properties?.[dateKey]?.date?.start || null : null,
                platform,
                imageUrl,
              };
            });

            const platformProp = platformKey ? properties[platformKey] : null;
            let platformOptions = [];
            if (platformProp?.type === 'select') {
              platformOptions = (platformProp.select?.options || []).map((o) => o.name).filter(Boolean);
            } else if (platformProp?.type === 'multi_select') {
              platformOptions = (platformProp.multi_select?.options || []).map((o) => o.name).filter(Boolean);
            } else if (platformProp?.type === 'status') {
              platformOptions = (platformProp.status?.options || []).map((o) => o.name).filter(Boolean);
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ items, platformOptions }));
            return;
          }

          // POST
          let rawBody = '';
          await new Promise((resolve, reject) => {
            req.on('data', (chunk) => { rawBody += chunk; });
            req.on('end', resolve);
            req.on('error', reject);
          });
          const body = rawBody ? JSON.parse(rawBody) : {};

          const { title = 'Generated Content', publishDate, platform, imageUrl } = body;
          if (!publishDate || !platform || !imageUrl) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'publishDate, platform, and imageUrl are required.' }));
            return;
          }
          if (!titleKey || !dateKey || !platformKey || !filesKey) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Could not map required Notion properties (title, date, platform, files).' }));
            return;
          }

          const createProperties = {
            [titleKey]: {
              title: [{ type: 'text', text: { content: title } }],
            },
            [dateKey]: {
              date: { start: publishDate },
            },
            [filesKey]: {
              files: [{ name: 'Generated image', type: 'external', external: { url: imageUrl } }],
            },
          };

          const platformProp = properties[platformKey];
          if (platformProp?.type === 'select') {
            createProperties[platformKey] = { select: { name: platform } };
          } else if (platformProp?.type === 'multi_select') {
            createProperties[platformKey] = { multi_select: [{ name: platform }] };
          } else if (platformProp?.type === 'status') {
            createProperties[platformKey] = { status: { name: platform } };
          } else if (platformProp?.type === 'rich_text') {
            createProperties[platformKey] = { rich_text: [{ type: 'text', text: { content: platform } }] };
          }

          await notion.pages.create({
            parent: { database_id: contentCalendarDatabaseId },
            properties: createProperties,
          });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true }));
        } catch (err) {
          console.error('Content Calendar API error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // GET /api/reference-images — returns list of reference images from second database
      server.middlewares.use('/api/reference-images', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          if (!referenceDatabaseId) {
            throw new Error('NOTION_REFERENCE_DATABASE_ID must be set in .env.local');
          }

          const notion = getNotion();
          let response;
          if (notion.dataSources?.query) {
            try {
              response = await notion.dataSources.query({
                data_source_id: referenceDatabaseId,
                page_size: 100,
              });
            } catch (queryErr) {
              if (!notion.databases?.retrieve) throw queryErr;
              const db = await notion.databases.retrieve({ database_id: referenceDatabaseId });
              const resolvedDataSourceId = db?.data_sources?.[0]?.id;
              if (!resolvedDataSourceId) throw queryErr;
              response = await notion.dataSources.query({
                data_source_id: resolvedDataSourceId,
                page_size: 100,
              });
            }
          } else if (notion.databases?.query) {
            response = await notion.databases.query({
              database_id: referenceDatabaseId,
              page_size: 100,
            });
          } else {
            throw new Error('Unsupported Notion SDK: no query method found on dataSources or databases.');
          }

          const referenceImages = response.results.map((page) => {
            const nameProperty = Object.values(page.properties || {}).find(
              (prop) => prop?.type === 'title' && Array.isArray(prop.title)
            );
            const filesProperty = Object.values(page.properties || {}).find(
              (prop) => prop?.type === 'files' && Array.isArray(prop.files)
            );

            const name = nameProperty?.title?.length > 0
              ? nameProperty.title.map((t) => t.plain_text).join('')
              : 'Untitled';

            const images = filesProperty?.files
              ? filesProperty.files
                .map((file) => {
                  if (file.type === 'file') return file.file.url;
                  if (file.type === 'external') return file.external.url;
                  return null;
                })
                .filter(Boolean)
              : [];

            return { id: page.id, name, images };
          });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ referenceImages }));
        } catch (err) {
          console.error('Reference image API error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // GET /api/notion-image?url=<encoded-url> — proxies a Notion image and returns base64 data URL
      server.middlewares.use('/api/notion-image', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const url = new URL(req.url, 'http://localhost');
          const imageUrl = url.searchParams.get('url');

          if (!imageUrl) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
          }

          // Fetch the image from Notion
          const imageResponse = await fetch(imageUrl);
          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status}`);
          }

          const contentType = imageResponse.headers.get('content-type') || 'image/png';
          const arrayBuffer = await imageResponse.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const dataUrl = `data:${contentType};base64,${base64}`;

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ dataUrl }));
        } catch (err) {
          console.error('Image proxy error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), notionPlugin()],
})
