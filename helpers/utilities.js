const transformMinutesToMs = (minutes) => {
  return minutes * 60 * 1000
}

const transformHoursToMs = (hours) => {
  return hours * 60 * 60 * 1000
}

const transformHoursToS = (hours) => {
  return hours * 60 * 60
}

const transformMinutesToS = (minutes) => {
  return minutes * 60
}

module.exports = {
  transformHoursToS,
  transformMinutesToS,
  transformHoursToMs,
  transformMinutesToMs
}