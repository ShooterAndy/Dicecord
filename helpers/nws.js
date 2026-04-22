module.exports = (strings, ...placeholders) => {
  // Build the string as normal, combining all the strings and placeholders:
  let withSpace = strings.reduce((result, string, i) => (result + placeholders[i - 1] + string))
  // Collapse only runs of spaces/tabs (not \n) so that intentional newlines are preserved.
  // Also collapse a newline followed by spaces/tabs into a single space (line continuations).
  return withSpace.replace(/\n[ \t]+/g, ' ').replace(/[ \t]{2,}/g, ' ')
}