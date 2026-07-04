import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URLSearchParams } from 'url';

// ============================
// 1. 配置
// ============================
const CONFIG = {
  cacheTTL: 5 * 60 * 1000,        // 缓存过期时间 5分钟
  maxResults: 5,                  // 默认返回条数
  requestTimeout: 15000,          // 请求超时 ms
  delayBetweenRequests: 1000,     // 同一引擎连续请求间隔 ms
  maxRetries: 2,                  // 失败重试次数
};

// ============================
// 2. 工具函数：延迟 & UA轮换
// ============================
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
];
let uaIndex = 0;
const getNextUA = () => userAgents[uaIndex++ % userAgents.length];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 带重试的请求
async function fetchWithRetry(url, options, retries = CONFIG.maxRetries) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        ...options,
        timeout: CONFIG.requestTimeout,
      });
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await delay(2000 * (i + 1)); // 退避
    }
  }
}

// ============================
// 3. 搜索引擎抓取器（均无需API）
// ============================

// ---------- 百度 ----------
async function fetchBaidu(query, max) {
  const url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
  const response = await fetchWithRetry(url, {
    headers: {
      'User-Agent': getNextUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  const $ = cheerio.load(response.data);
  const results = [];
  const selectors = ['.result', '.c-container'];
  let found = false;
  for (const sel of selectors) {
    const elems = $(sel);
    if (elems.length > 0) {
      elems.each((i, elem) => {
        if (i >= max) return false;
        const titleElem = $(elem).find('h3 a, .t a');
        let title = titleElem.text().trim();
        let link = titleElem.attr('href');
        if (!title || !link) return;
        // 处理百度跳转
        if (link.startsWith('/url?q=')) {
          const qs = new URLSearchParams(link.split('?')[1]);
          link = qs.get('q') || link;
        } else if (link && !link.startsWith('http')) {
          link = 'https://www.baidu.com' + link;
        }
        const snippet = $(elem).find('.c-abstract, .content-abstract, .abs').text().trim();
        results.push({ title, link, snippet, source: 'baidu' });
      });
      if (results.length > 0) { found = true; break; }
    }
  }
  return results;
}

// ---------- 必应 (Bing) ----------
async function fetchBing(query, max) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
  const response = await fetchWithRetry(url, {
    headers: {
      'User-Agent': getNextUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  const $ = cheerio.load(response.data);
  const results = [];
  $('#b_results .b_algo').each((i, elem) => {
    if (i >= max) return false;
    const titleElem = $(elem).find('h2 a');
    const title = titleElem.text().trim();
    let link = titleElem.attr('href');
    if (!title || !link) return;
    // Bing 可能使用 /url?q= 类似跳转
    if (link.startsWith('/url?q=')) {
      const qs = new URLSearchParams(link.split('?')[1]);
      link = qs.get('q') || link;
    }
    const snippet = $(elem).find('.b_caption p').text().trim();
    results.push({ title, link, snippet, source: 'bing' });
  });
  return results;
}

// ---------- 搜狗 (Sogou) ----------
async function fetchSogou(query, max) {
  const url = `https://www.sogou.com/web?query=${encodeURIComponent(query)}`;
  const response = await fetchWithRetry(url, {
    headers: {
      'User-Agent': getNextUA(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
  });
  const $ = cheerio.load(response.data);
  const results = [];
  $('.vrwrap, .rb, .pt').each((i, elem) => {
    if (i >= max) return false;
    const titleElem = $(elem).find('h3 a, .pt a');
    let title = titleElem.text().trim();
    let link = titleElem.attr('href');
    if (!title || !link) return;
    // 处理搜狗跳转
    if (link.startsWith('/link?url=')) {
      const qs = new URLSearchParams(link.split('?')[1]);
      link = qs.get('url') || link;
    } else if (link && !link.startsWith('http')) {
      link = 'https://www.sogou.com' + link;
    }
    const snippet = $(elem).find('.p, .str_info').text().trim();
    results.push({ title, link, snippet, source: 'sogou' });
  });
  return results;
}

// ============================
// 4. 缓存（LRU + TTL）
// ============================
class SearchCache {
  constructor(ttl) {
    this.ttl = ttl;
    this.cache = new Map();
  }
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }
  set(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  clear() {
    this.cache.clear();
  }
}
const cache = new SearchCache(CONFIG.cacheTTL);

// ============================
// 5. 多引擎聚合、去重、排序
// ============================
async function searchAllEngines(query, maxResults) {
  // 1) 从缓存获取
  const cacheKey = `${query}_${maxResults}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.error('✅ 命中缓存');
    return cached;
  }

  // 2) 并行抓取所有引擎（每个引擎抓取 maxResults*2 条以丰富候选）
  const engineFetchers = [
    fetchBaidu(query, maxResults * 2),
    fetchBing(query, maxResults * 2),
    fetchSogou(query, maxResults * 2),
  ];
  const resultsArrays = await Promise.allSettled(engineFetchers);

  // 收集成功的结果
  let allResults = [];
  resultsArrays.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      allResults = allResults.concat(result.value);
    } else {
      console.error(`⚠️ 引擎 ${['baidu','bing','sogou'][idx]} 抓取失败:`, result.reason.message);
    }
  });

  if (allResults.length === 0) {
    return [];
  }

  // 3) 去重（基于链接，若链接不可靠则用标题前10字符）
  const seen = new Set();
  const unique = [];
  for (const item of allResults) {
    const key = item.link || item.title.substring(0, 10);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  // 4) 相关性排序（简单：关键词命中次数）
  const keywords = query.split(/\s+/).filter(w => w.length > 1);
  const scored = unique.map(item => {
    let score = 0;
    const text = (item.title + ' ' + item.snippet).toLowerCase();
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) score += 1;
    }
    if (item.source === 'baidu') score += 0.5;
    return { ...item, score };
  });
  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  const finalResults = scored.slice(0, maxResults);

  // 存入缓存
  cache.set(cacheKey, finalResults);

  return finalResults;
}

// ============================
// 6. MCP 服务器（修正版）
// ============================
const server = new Server(
  {
    name: 'multi-engine-search-mcp',
    version: '2.0.0',
  },
  {
    capabilities: { tools: {} },
  }
);

// 注册工具列表 - 使用 ListToolsRequestSchema
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search',
      description: '使用百度、必应、搜狗多引擎搜索中文网页，自动合并去重排序，支持缓存。',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
          max_results: { type: 'number', description: '返回结果数量（1-10），默认5' },
        },
        required: ['query'],
      },
    },
  ],
}));

// 处理工具调用 - 使用 CallToolRequestSchema
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // 注意：request.params 结构为 { name, arguments }
  if (request.params.name !== 'search') {
    throw new Error(`未知工具: ${request.params.name}`);
  }

  const { query, max_results = CONFIG.maxResults } = request.params.arguments || {};
  if (!query) {
    throw new Error('缺少查询参数 query');
  }

  const max = Math.min(Math.max(parseInt(max_results) || CONFIG.maxResults, 1), 10);

  try {
    const results = await searchAllEngines(query, max);

    if (results.length === 0) {
      return {
        content: [{ type: 'text', text: `😅 未找到关于“${query}”的搜索结果，请尝试其他关键词。` }],
      };
    }

    // 格式化输出
    let text = `🔍 搜索“${query}”的结果（共 ${results.length} 条，来自 ${new Set(results.map(r=>r.source)).size} 个引擎）：\n\n`;
    results.forEach((r, i) => {
      text += `${i + 1}. [${r.source}] ${r.title}\n`;
      text += `   ${r.snippet || '（无摘要）'}\n`;
      text += `   🔗 ${r.link}\n\n`;
    });

    return {
      content: [{ type: 'text', text }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `❌ 搜索出错: ${error.message}` }],
    };
  }
});

// ============================
// 7. 启动
// ============================
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('✅ 多引擎搜索 MCP 服务器已启动（百度+Bing+搜狗，缓存已启用）');
