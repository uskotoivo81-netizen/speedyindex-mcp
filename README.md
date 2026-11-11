# SpeedyIndex MCP server

`speedyindex-mcp` connects AI assistants such as Claude, Cursor and VS Code to SpeedyIndex, a service for link indexing, Google, Bing and Yandex index checking and Google rank tracking. Ask in plain words: "which of these URLs are not in Google's index?", "what moved in my rankings since the last check?", "is my site cited in the AI Overview for this keyword?". It is built on the [SpeedyIndex API](https://en.speedyindex.com/api.php) and the [`speedyindex`](https://www.npmjs.com/package/speedyindex) Node.js client.

## Tools

| Tool | What it does | Spends balance |
|---|---|---|
| `get_balance` | Tokens and credits | no |
| `check_index` | Index check of up to 10,000 URLs in Google, Bing or Yandex | checker credits |
| `submit_for_indexing` | Indexing task for Google or Yandex, optional drip feed | yes |
| `list_tasks` | Recent tasks with indexed counts | no |
| `get_report` | Indexed / unindexed URLs, SERP titles, error codes | no |
| `check_backlinks` | Find links to your domains on donor pages | yes |
| `get_backlink_report` | Per-donor results | no |
| `rank_projects` | Rank Tracker projects | no |
| `rank_positions` | Keyword positions and changes since the previous check | no |
| `rank_keyword_details` | Top 10 and AI Overview citation for one keyword | no |
| `rank_cost` | Cost of the next position check | no |
| `rank_run_check` | Run a position check | yes |
| `rank_check_status` | Progress of a check | no |
| `rank_locations` | Find a Google location for a region | no |

Tools that spend the balance tell the assistant to ask you first.

## Setup

You need Node.js 18+ and a SpeedyIndex API key from your dashboard or the SpeedyIndex Telegram bot settings.

**Claude Desktop** (`claude_desktop_config.json`), **Cursor** (`.cursor/mcp.json`) and other clients that use the same format:

```json
{
  "mcpServers": {
    "speedyindex": {
      "command": "npx",
      "args": ["-y", "speedyindex-mcp"],
      "env": { "SPEEDYINDEX_API_KEY": "your-key" }
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add speedyindex -e SPEEDYINDEX_API_KEY=your-key -- npx -y speedyindex-mcp
```

## Example prompts

- "Check whether these 20 URLs are indexed in Google and list the ones that are not."
- "Show the keywords of my example.com project that dropped since the last check."
- "For 'pizza delivery', is example.com cited in the AI Overview?"
- "How much will the next position check of this project cost?"

## Hosted server

No install needed: add `https://mcp.speedyindex.com/mcp` as a custom connector (streamable HTTP) in Claude or any client that supports remote MCP servers, then sign in with your SpeedyIndex API key. Docs: [mcp.speedyindex.com/docs](https://mcp.speedyindex.com/docs). Privacy: [mcp.speedyindex.com/privacy](https://mcp.speedyindex.com/privacy).

## Listed on

- [Official MCP Registry](https://registry.modelcontextprotocol.io/v0/servers?search=io.github.uskotoivo81-netizen/speedyindex) (`io.github.uskotoivo81-netizen/speedyindex`)
- [Glama](https://glama.ai/mcp/servers/uskotoivo81-netizen/speedyindex-mcp)
- [mcp.so](https://mcp.so/servers/speedyindex-mcp-server)
- [npm](https://www.npmjs.com/package/speedyindex-mcp)

The SpeedyIndex REST API behind it: [docs](https://en.speedyindex.com/api.php), [OpenAPI](https://en.speedyindex.com/openapi.yaml), [Postman](https://www.postman.com/speedyindex/speedyindex-api), [RapidAPI](https://rapidapi.com/lindabjorkvin/api/speedyindex2).

## License

MIT
