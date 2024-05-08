# Privacy Policy

This policy has been last updated on May 8th, 2024.

Please keep in mind that the [Discord's Privacy Policy](https://discord.com/privacy) should apply by the very nature of the usage of **Dicecord** via Discord.

For clarity: when this document mentions Discord's internal ids, it refers to the unique, automatically-generated strings of numbers that Discord uses to identify entities within it, such as servers, channels, and users. The timestamps mentioned are internal and do not have access to the user's timezone information.

**Dicecord** only stores the information you provide to it, and the information that is strictly necessary for its operations. This means:
* When using most of its application commands, **Dicecord** stores no information whatsoever;
* When using application commands that require **Dicecord** to store information, the following information is stored:
  * For shuffling the card decks, the Discord internal id of the relevant channel is stored, along with the timestamp of when the deck was shuffled. For custom decks, the cards in the deck are also stored.
  * For interacting with the card decks in any other way, the stored timestamp will be updated with the current timestamp.
  * Saving the application commands will store the full command, your internal Discord user id, and the current timestamp. Interacting with your saved commands in any other way will update the stored timestamp with the current one.
* For the purposes of debugging, if the application encounters an unexpected/unhandled error, it might send the full data on the interaction that caused it to the error log. You can read on what will be included there in the Discord Developer Portal documentation. 

While none of this data is publicly-accessible, you still shouldn't store any sensitive data. 