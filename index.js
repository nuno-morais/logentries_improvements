var readline = require('readline');
var fs = require('fs');

const readStream = fs.createReadStream('log.in');
const writeStream = fs.createWriteStream('output.out');

var rl = readline.createInterface({
  input: readStream,
  output: writeStream,
  console: false
});

const events = [];

function getDate(event) {
  let reg = /^(.*?)(.*?)([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6})/;
  let result = event.match(reg);
  return result[3];
}

function transformeDateIntoInteger(date) {
  return date.replace(new RegExp(/T|:|-|\./, 'g'), '');
}

function getEventByName(name, event) {
  let reg = /^(.*?)"event"(:)"(.*?)"/;
  let newReg = new RegExp(
    reg
      .toString()
      .replace('event', name)
      .replace('/', '')
      .replace('/', '')
  );
  let result = event.match(newReg);
  return result != null && result.length >= 4 ? result[3] : null;
}

rl.on('line', line => {
  if (line != '' && line != '/n') {
    const date = getDate(line);
    const time = transformeDateIntoInteger(date);
    const event_name = getEventByName('event', line);
    const event_correlation = getEventByName('correlation_id', line);
    if (event_name) {
      events.push({
        date: date,
        time: time,
        event_correlation: event_correlation,
        event_name: event_name,
        event_content: line
      });
    }
  }
});

rl.on('close', () => {
  events.sort((a, b) => a.time - b.time);
  console.table(
    events.map(e => {
      return {
        'Event Date': e.date,
        'Event Name': e.event_name,
        'Correlation Id': e.event_correlation
      };
    })
  );
  writeStream.write(
    events.map(e => e.date + ' ' + e.event_name + ' ' + e.event_correlation + ' <> ' + e.event_content).join('\n')
  );
});
