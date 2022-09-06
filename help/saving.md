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

After you send a command from this list, the response from **Dicecord** will include a "Save command" button. If you click it, **Diceord** will ask you for the name you wish to use for this command. Please note that only Latin symbols, numbers, underscore, and the minus sign can be used for this, and the names would all be converted to lowercase. Additionally, the name can not be longer than 16 characters.

If you input the name, the command is then saved. You can use this command on any server where **Dicecord** is present by using the `/executeSaved` command. You can also examine it via the `/examineSaved` command, that way you can copy its text to modify it. Lastly, you can see the names of all your saved commands via the `/listSaved` command.

Keep in mind that you can only have 10 commands saved at the same time. To clear space for more, use the `/deleteSaved` command.

Additionally, please note that unless this command has been accessed via `/executeSaved` or `/examineSaved`, it will expire and be deleted in 30 days. Accessing it resets this counter.