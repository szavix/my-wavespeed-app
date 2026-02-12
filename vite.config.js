import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// Notion API plugin – adds dev-server middleware for /api/outfits and /api/notion-image
function notionPlugin() {
  let notionClient = null;
  let outfitDatabaseId = '';
  let referenceDatabaseId = '';

  return {
    name: 'notion-api',
    configureServer(server) {
      const getNotion = () => {
        if (notionClient) return notionClient;
        const env = loadEnv('', process.cwd(), '');
        const apiKey = env.NOTION_API_KEY;
        outfitDatabaseId = env.NOTION_OUTFIT_DATABASE_ID;
        referenceDatabaseId = env.NOTION_REFERENCE_DATABASE_ID;
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
