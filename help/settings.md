**Dicecord** has per-server settings that can be configured by server administrators (users with the **Manage Server** permission).

**Available settings:**

* **Plain text mode** — when enabled, the bot will send all replies as plain text instead of rich embeds. This is useful if you or your server members have embeds disabled in their Discord client settings.
  * To enable: `/settings setting:Plain text mode (no embeds) enabled:True`
  * To disable: `/settings setting:Plain text mode (no embeds) enabled:False`

**Viewing current settings:**

* `/settings` — lists all settings and their current values.
* `/settings setting:Plain text mode (no embeds)` — shows the current value of that specific setting.

_Note: settings apply to the entire server. DMs always use embeds._

