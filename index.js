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

function getConsumerEventByName(name, event) {
  let reg = /^(.*?)"event"(:)"(.*?)"/;
  let newReg = new RegExp(
    reg
      .toString()
      .replace('event', name)
      .replace('/', '')
      .replace('/', '')
  );
  let result = event.match(newReg);
  return result != null && result.length >= 4 ? result[result.length - 1] : null;
}

function getEventByName(name, event) {
  let reg = /^(.*?)event(=>)"(.*?)"/;
  let newReg = new RegExp(
    reg
      .toString()
      .replace('event', name)
      .replace('/', '')
      .replace('/', '')
  );
  let result = event.match(newReg);
  return result != null && result.length >= 4 ? result[result.length - 1] : null;
}

function getPublishEventByNameOrchestrator(name, event) {
  let reg = /^(.*?)event_name='(.*?)'/;
  let newReg = new RegExp(
    reg
      .toString()
      .replace('event_name', name)
      .replace('/', '')
      .replace('/', '')
  );
  let result = event.match(newReg);
  return result != null && result.length >= 3 ? result[result.length - 1] : null;
}

function getRoutingKey(event) {
  let reg = /^(.*?)routing_key:(\ )?'(.*?)'/;
  let newReg = new RegExp(
    reg
      .toString()
      .replace('/', '')
      .replace('/', '')
  );
  let result = event.match(newReg);
  return result != null && result.length >= 3 ? result[result.length - 1] : null;
}

rl.on('line', line => {
  if (line != '' && line != '/n') {
    const date = getDate(line);
    const time = transformeDateIntoInteger(date);
    const consuming_event_name = getConsumerEventByName('event', line);
    const event_correlation = getConsumerEventByName('correlation_id', line) || getEventByName('correlation_id', line);
    const emitting_event_name = getPublishEventByNameOrchestrator('event_name', line);
    const key = getRoutingKey(line) || getPublishEventByNameOrchestrator('resource', line);

    if (consuming_event_name || emitting_event_name) {
      events.push({
        date: date,
        time: time,
        event_direction: !!consuming_event_name ? 'Consumed' : 'Emitted',
        key: key,
        event_correlation: event_correlation,
        event_name: consuming_event_name || emitting_event_name,
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
        'Direction': e.event_direction,
        'Event Name': e.event_name,
        'Key': e.key,
        'Correlation Id': e.event_correlation
      };
    })
  );
  writeStream.write(
    events.map(e => e.date + ' ' + e.event_name + ' ' + e.event_correlation + ' <> ' + e.event_content).join('\n')
  );
});
