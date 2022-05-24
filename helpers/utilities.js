const transformMinutesToMs = (minutes) => {
    return minutes * 60 * 1000
}

const transformHoursToMs = (hours) => {
    return hours * 60 * 60 * 1000
}

module.exports = {
    transformHoursToMs,
    transformMinutesToMs
}