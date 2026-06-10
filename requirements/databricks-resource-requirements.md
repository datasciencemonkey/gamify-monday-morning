The following is what I would do to help create all these assets that we need to accomplish the demo.

1. Use databricks profile - 9cefok
2. Create any synthetic data sources in this profile.
  Create a separate schema for it. Use serverless_9cefok_catalog catalog to create schema. Use the databricks agent skills - these are already installed or databricks ai dev kit - this is also already installed. Use them when you need them.
3. The stack needs to be front end react and backend fastapi (maybe use shadcn based. The design grammar must be exactly the same as the assets you have access to. If you need to add a dark mode later use the design grammar shown in [brand.databricks.com](http://brand.databricks.com) .  your single most important job is to ensure that the app looks extremely good, and you're able to make it executive ready.  if we need to change anything at all, we'll change it later on. 
4. You can optionally choose to change the stack if needed - the other easy option is [https://github.com/databricks/appkit](https://github.com/databricks/appkit) 
5. Use the deepwiki mcp for searching codebases and exa mcp for generic search to help aid the development work. For example. if you need to understand how the databricks-sdk works, this could be a good use of this mcp.
6. The databricks CLI is already installed and so you have access to it as well. Remember that.
7. Use the Genie MCP in the Databricks profile above to ask questions of this data that you create.

[https://fevm-serverless-9cefok.cloud.databricks.com/api/2.0/mcp/genie](https://fevm-serverless-9cefok.cloud.databricks.com/api/2.0/mcp/genie)

**Name**

**Description**

**Parameters**

`genie_ask`

Ask Databricks Genie a natural-language data question. Genie searches the user's enterprise data in Databricks, writes SQL, and returns a grounded answer with a deep link back into the Databricks UI where the user can see the full result (including any visualizations Genie produced). ## Transport behavior This tool returns one of two response shapes depending on the host's MCP transport: - **Streaming-capable hosts** (those that attach `_meta.progressToken` to the request): the server holds the connection open and yields progress notifications while Genie thinks, then returns the final answer in the same `tools/call` result. Do NOT call `genie_poll_response` afterwards — the answer is already in the response. - **Polling hosts** (no `progressToken`): the server returns immediately with `conversation_id`, `response_id`, and `status: in_progress`. Call `genie_poll_response` to retrieve the final answer. Detect which path you got: if the response contains `status: in_progress` with IDs, you are on the polling path and must call `genie_poll_response`. Otherwise the final answer is already in this response. ## Typical flow (polling host) 1. Call `genie_ask(question='...')` — returns `conversation_id`, `response_id`, an initial `status`, and a `deep_link`. The Genie agent continues running in the background. 2. Acknowledge to the user in ONE short sentence that you've sent the question to Genie (e.g. "Asking Genie now — let me check on progress."). Don't describe what Genie is doing yet — you don't know. 3. Call `genie_poll_response(conversation_id, response_id)` repeatedly while `status == "in_progress"`. The poll exposes step summaries on two surfaces: a bulleted list at the top of the textual `content` (Thinking / Running SQL / Query result) plus a one-line instruction, and a typed `structuredContent.progress_steps` list with the same entries. Use whichever your host surfaces. After each poll: - **If progress steps are present** (non-empty `progress_steps`, or step bullets in the body): write ONE sentence (~25 words max) narrating the LAST step — pull the specific table name, query, or result from it (e.g. "Found `samples.nyctaxi.trips`, ran a pickup-ZIP count — 10001 leads with 1,227 trips."). No internal system language ("Databricks thread", "MCP", "backend"). - **If no progress steps yet:** say nothing — just call `genie_poll_response` again silently. 4. When `status == "completed"`, reply to the user with Genie's result. The markdown body contains Genie's final response, tables, and links. Your reply MUST include: - **Bold the key numbers** the user asked about. - The `[Explore in Databricks](url)` link rendered as a clickable markdown link — copy it verbatim from the body, do not paraphrase it. - Any other `[...](url)` links to cited artifacts (dashboards, tables, queries) that appear in the body. ## Conversations For follow-up questions on the same topic, pass `conversation_id` from the previous `genie_ask` response to continue the same Genie conversation. ## Notes - If a `view_ask` tool is available to you, ALWAYS use it instead of `genie_ask` — `view_ask` renders results inline and is the preferred surface; `genie_ask` is the fallback for hosts that can't render the View. - Very large result sets may be truncated when returned through this tool — the `[Explore in Databricks]` deep link is the canonical destination for the complete answer.

question (string), conversation_id (string)

`genie_poll_response`

Fetch the latest state of an in-flight or completed Genie response. Returns the current state as rendered markdown in `content` and the typed fields (status, response_id, conversation_id, deep_link, final_answer, progress_steps, narration_instruction) under `structuredContent` for hosts that parse it. Call repeatedly while `status == "in_progress"`; each call re-fetches the full response so far. Wait approximately 2–5 seconds between polls — Genie agent turns typically complete in 70–260 seconds, so polling faster wastes upstream capacity without improving latency. ## How to narrate progress to the user Both surfaces carry the same data: the in_progress body opens with a bullet list of step summaries and a one-line instruction, and `structuredContent.progress_steps` / `narration_instruction` mirror them as typed fields. Use whichever your host surfaces. After each poll: - **If `progress_steps` is non-empty** (equivalently: the body lists step bullets): narrate the LAST step to the user in ONE sentence (~25 words max), keeping the specific table, query, or result detail intact (e.g. "Found `samples.nyctaxi.trips`, ran a pickup-ZIP count — 10001 leads with 1,227 trips."). The user does not see this tool's output, only your text messages, so do NOT collapse multiple polls into one generic "still working" or "querying data" line. - **If `progress_steps` is null / empty:** say nothing — just call `genie_poll_response` again silently. - Never mention internal system language ("Databricks thread", "MCP", "backend", "polling"). When `status == "completed"` (or "incomplete"/"failed"), stop polling and reply to the user. Your reply MUST include the `[Explore in Databricks](url)` link rendered verbatim from the body — do not paraphrase it. Also include any other cited artifact links, and bold the key numbers.

conversation_id (string), response_id (string)



1. To use lakebase for short term memory or app state or app relevant tables use the following instance. For development work:  
psql 'postgresql://[sathish.gangichetty%40databricks.com@ep-aged-glade-d2zpfa2s.database.us-east-1.cloud.databricks.com](mailto:sathish.gangichetty%40databricks.com@ep-aged-glade-d2zpfa2s.database.us-east-1.cloud.databricks.com)/databricks_postgres?sslmode=require'

For production work, we should give access to the app service principal access to the project to use and create objects. We can do everything by user_id based on capturing who the user is



