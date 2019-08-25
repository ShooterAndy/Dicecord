module.exports = args => {
    const message = args.message;
    const client = args.client;
    if(message.author.id) {
        client.fetchApplication().then(application => {
            if(message.author.id !== application.owner.id) {
                console.error('-- > User ' + message.author.username + '#' + message.author.tag + '(' +
                    message.author.id + ') attempted to disconnect this bot!');
                return message.reply('**ERROR:** You cannot use this command.').catch(console.error);
            }
            client.destroy().then(() => {
                console.log('-- > Bot disconnected successfully.');
            }, (error) => {
                console.error('-- > ERROR: There was a problem with attempting to disconnect: ', error);
            });
        }).catch(console.error);
    }
};