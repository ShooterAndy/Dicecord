Dicecord currently has two settings:

`DICECORD_NO_NOT_FOUND` is a way to disable the default "Command not found" error message.
`DICECORD_DO_NOT_REPLY` is a way to make Dicecord not mention you in its replies to your commands. 

Setting these options is accomplished by adding a special role to your Discord server and assigning 
it to Dicecord.

Go to your Server Settings → Roles, add a new role named `DICECORD_NO_NOT_FOUND` or 
`DICECORD_DO_NOT_REPLY` (or both). Then add this role to Dicecord on your server.