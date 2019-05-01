const fs = require('fs');

module.exports = client => {
    console.log(`Logged in as ${client.user.tag}!`);
    fs.readFile('./version', 'utf8', function (err, data) {
        if (err) {
            console.log('ERROR: couldn\'t open the version file: ' + err);
        }
        else {
            client.user.setActivity('v' + data + ', type !help');
        }
    });
};