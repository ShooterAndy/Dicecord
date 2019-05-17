module.exports = (client, error) => {
    if(typeof error === 'object') {
        console.error('-- > Bot Error: ' + JSON.stringify(error));
    }
    else {
        console.error('-- > Bot Error: ' + error);
    }
};