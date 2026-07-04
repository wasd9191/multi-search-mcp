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
git clone https://github.com/你的用户名/multi-search-mcp.git
cd multi-search-mcp
npm install
