module.exports = (strings, ...placeholders) => {
    // Build the string as normal, combining all the strings and placeholders:
    let withSpace = strings.reduce((result, string, i) => (result + placeholders[i - 1] + string))
    return withSpace.replace(/\s\s+/g, ' ')
}