**Dicecord** allows you to save certain commands so that they can be easily re-used later, without the need for you to re-input their parameters.

Currently, these commands allow this:
* `/deal`
* `/draw`
* `/drawShuffled`
* `/insert`
* `/order`
* `/pick`
* `/roll`
* `/shuffle`
* `/slots`

After you send a command from this list, the response from **Dicecord** will include one or two save buttons. These buttons will expire after 10 minutes. If you're in a server, you'll see **"Save for me"** and **"Save for server"**. In DMs, only "Save command" (personal) is shown.

**"Save for me"** saves the command for your personal use. You can use it on any server where **Dicecord** is present.

**"Save for server"** saves the command for the entire server. Any member of that server can execute it.

When you click either button, **Dicecord** will ask you for the name you wish to use for this command. You will have up to 5 minutes to fill in the name and submit. Please note that only Latin symbols, numbers, underscore, and the minus sign can be used for this, and the names would all be converted to lowercase. Additionally, the name can not be longer than 16 characters.

If you input the name, the command is then saved. You can use it via the `/executeSaved` command. You can also examine it via the `/examineSaved` command, that way you can copy its text to modify it. Lastly, you can see the names of all your saved commands (both personal and server) via the `/listSaved` command.

Keep in mind that you can have up to **10 personal** and **10 server** commands saved at the same time. The server command limit is per user — each user can save up to 10 server commands across all servers. To clear space for more, use the `/deleteSaved` command.

Server commands can be deleted by the user who created them, or by any member with the **Manage Server** permission.

Additionally, please note that unless this command has been accessed via `/executeSaved` or `/examineSaved`, it will expire and be deleted in 30 days. Accessing it resets this counter.