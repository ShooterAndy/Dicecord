const fs = require('fs');
module.exports = (client, error) => {
    let errorText = '**Error Name:** ' + error.name + '\n**Error Message:**\n```' + error.message + '```';
    fs.writeFile('./lastError', errorText, function(err) {
        if (err) {
            console.error(err);
        }
    });
    console.error(error);
};