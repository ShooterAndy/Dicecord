**saveRoll** command **IS CURRENTLY UNAVAILABLE** ~~allows you to save a roll command for later use.~~

The syntax for that is as follows:
```/saveRoll comand-name command text```

Examples:
```/saveRoll some-command 1d20```
```/saveRoll some-command 1d20+10 vs 20, 22 ? comment => 2d6+2 ?! comment```

The saved command is tied to your Discord account, so only you can use it. You have a limit of 10
saved roll commands. You can delete one by using the `/deleteSaved` command. If you find that you've
accidentally saved an incorrect roll command, you can update it by using this command with the same
name, but a different roll command.

Please note that the command name is case-insensitive, must be shorter than 16 symbols, and must
contain only latin characters, numbers, the `-` and `_` symbols.

Also, note that the actual command is not checked for its validity before being saved, so please
check for it by rolling it first via `/roll`.

After the command is saved, you can roll it via `/rollSaved` or get it via `/getSaved`. If it is not
used in either of these ways or updated for 30 days, it will expire and be removed. 