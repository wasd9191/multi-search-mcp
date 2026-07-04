# multi-search-mcp

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Multi-search MCP server** – 一个轻量级、无需 API 密钥的 MCP 服务器，为 LM Studio 等客户端提供百度、必应、搜狗三引擎聚合搜索能力。内置缓存、反爬策略和结果去重排序，占用极低。

## ✨ 特性

- 🔍 **多引擎聚合** – 同时抓取百度、必应（Bing）、搜狗，合并结果，按相关性排序
- 🚫 **无需任何 API Key** – 模拟真实浏览器请求，直接抓取公开搜索结果
- ⚡ **内置缓存** – 相同查询 5 分钟内直接返回缓存，大幅降低重复请求
- 🛡️ **反爬策略** – User-Agent 轮换 + 请求重试退避，降低被封风险
- 💾 **极低资源占用** – 仅依赖 Node.js 运行时，内存常驻约 30–50 MB
- 🔧 **灵活可调** – 可配置缓存时间、最大结果数、超时等参数
- 🧩 **适配 LM Studio** – 完美兼容 MCP 协议，即插即用

## 🚀 快速开始

### 1. 克隆并安装依赖

```bash
git clone https://github.com/你的用户名/multi-search-mcp.git（这个用户名后面的路径就不要打了因为我突然发现这个js文件与json文件没有搞文件夹你需要自己创建一个文件夹并放进去）
cd multi-search-mcp
npm install



2. 配置 LM Studio
在 LM Studio 的 MCP 设置中编辑 mcp.json（通常位于 ~/.lmstudio/mcp.json 或设置界面内），添加：
{
  "mcpServers": {
    "multi-search": {
      "command": "node",
      "args": ["/你的绝对路径/multi-search-mcp/index.js"],
      "env": {}
    }
  }
}

保存并重启 LM Studio 的 MCP 服务。

3. 在对话中使用

加载任意支持工具调用的模型（如 Qwen、DeepSeek 等），输入类似：
text

搜索今天的科技新闻

模型将自动调用 search 工具，返回来自多个引擎的综合结果。

⚙️ 配置参数

在 index.js 开头的 CONFIG 对象中可调整：
参数	默认值	说明
cacheTTL	5 * 60 * 1000	缓存有效期（毫秒）
maxResults	5	默认返回结果条数
requestTimeout	15000	每个请求超时时间（毫秒）
maxRetries	2	请求失败重试次数
🛠️ 工作原理

    查询输入 – 用户或模型发起搜索请求

    缓存检查 – 若相同查询在 TTL 内，直接返回缓存结果

    并行抓取 – 同时向百度、必应、搜狗发起 HTTP 请求（模拟浏览器）

    解析与提取 – 使用 cheerio 解析 HTML，提取标题、链接、摘要

    去重与排序 – 按链接去重，根据关键词命中次数 + 来源权重排序

    返回结果 – 将处理后的结构化结果返回给客户端

⚠️ 注意事项

    反爬风险 – 频繁请求可能触发搜索引擎的验证码，建议合理控制调用频率。

    页面结构变化 – 若百度/Bing/搜狗修改 HTML 布局，可能导致解析失效。届时需更新对应的 cheerio 选择器（见 fetchBaidu, fetchBing, fetchSogou 函数）。

    网络环境 – 确保服务器可正常访问上述搜索引擎（国内网络需能直连百度、搜狗，必应可能需代理）。

这个项目在设计和实现上，参考了 MCP 社区中许多优秀的开源项目，主要灵感来源如下：
📚 百度搜索 MCP 服务器

    caiyili/baidu-search-mcp：核心的百度搜索功能灵感来源。它无需 API Key，直接请求并解析百度页面，对项目影响很深。

    iflow-mcp/baidu-search-mcp：另一个百度搜索实现，其项目结构和对不同模型的支持提供了参考。

    @alex.ss/mcp-server-baidu-search：同为百度搜索 MCP 服务，提供了不同的实现思路。

    Evilran/baidu-mcp-server：同样提供基于百度的网页搜索与内容抓取能力。

🔍 多引擎搜索 MCP 服务器

    dlmufei/go-web-search-mcp：一个优秀的 Go 语言多引擎搜索实现，项目“多引擎聚合”的核心思想受其启发。

    MemoryClear/claude-web-search-mcp：专为中国用户优化，明确支持百度、搜狗等国产搜索引擎，其“并行搜索”和“智能去重”功能是重要参考。

    MetaSearchMCP：一个完整的元搜索后端，其“多提供者聚合”和“结果去重”等设计理念很有价值。

    pranavms13/web-search-mcp：通过无头浏览器抓取 Google、DuckDuckGo 和 Bing，提供了另一种技术实现思路。

    tamb/simple-web-search-mcp：一个“零配置”的 MCP 服务器，其追求极简配置的理念值得借鉴。

🧩 MCP SDK 与示例

    @modelcontextprotocol/sdk：项目的基础，所有工具和通信都构建在官方提供的 SDK 之上。

    Model Context Protocol 官方文档、：理解 MCP 协议、设计服务器 capabilities 和工具接口的根本依据。

💡 其他灵感来源

    web-research-mcp：提供了“无需 API 密钥”和“并行多查询”等设计思路。

    lc-mcp-server：其“模拟模式”为项目的测试和开发提供了参考。

    Tencent/WebSearchMCP：腾讯开源的联网搜索 MCP 服务，展示了企业级 MCP 服务的实现。


注意：1.本mcp编译与开发依赖deepseek，但本人实际实际使用过可以正常运行
     2.所有内容与这个仓库的一些配置也是deepseek帮助我搞的所以如果有缺陷欢迎指出
     3.如果您不信任此项目能力那就可以不用克隆此项目了为您节省时间，不过感谢您看完README.md
     
最后感谢您下载并使用此项目
