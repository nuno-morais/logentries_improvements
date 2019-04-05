var readline = require('readline');
var fs = require('fs');
var table = require('table');

const readStream = fs.createReadStream('log.in');
const writeStream = fs.createWriteStream('output.out');
let lineIndex = 0;

var rl = readline.createInterface({
  input: readStream,
  output: writeStream,
  console: false
});

let events = [];

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
  let reg = /^(.*?)event((=>)|:)"(.*?)"/;
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

function getResponseOnFunctionFinished(event) {
  let reg = /^(.*?)(\{.*)/;
  let result = event.match(reg)[2];
  reg = /:(.*?)=>/g;
  let event_result = result.replace(reg, (a, b) => `"${b}":`);
  reg = /"(.*?)"=>/g;
  event_result = event_result.replace(reg, (a, b) => `"${b}":`);
  event_result = event_result.replace(/nil/g, 'null');
  return JSON.parse(event_result);
}

rl.on('line', line => {
  if (line != '' && line != '/n') {
    lineIndex++;
    try {
      const date = getDate(line);
      const time = transformeDateIntoInteger(date);
      const consuming_event_name = getConsumerEventByName('event', line) || getEventByName('verb', line);
      const event_correlation =
        getConsumerEventByName('correlation_id', line) ||
        getEventByName('correlation_id', line) ||
        getEventByName(':type=>"step", :id', line);
      const emitting_event_name = getPublishEventByNameOrchestrator('event_name', line);
      const key = getRoutingKey(line) || getPublishEventByNameOrchestrator('resource', line);
      let result = null;
      if (consuming_event_name == 'finish' || emitting_event_name == 'finish') {
        result = getResponseOnFunctionFinished(line);
      }

      events.push({
        date: date,
        time: time,
        event_direction: consuming_event_name ? 'Consumed' : 'Emitted',
        key: key,
        event_correlation: event_correlation,
        event_name: consuming_event_name || emitting_event_name,
        event_content: line,
        result: result
      });
    } catch (err) {
      console.error(`Error on line number: ${lineIndex} > ${line}`);
    }
  }
});

rl.on('close', () => {
  events.sort((a, b) => a.time - b.time);
  writeStream.write(
    events.map(e => e.date + ' ' + e.event_name + ' ' + e.event_correlation + ' <> ' + e.event_content).join('\n')
  );

  events = events.filter(q => q.event_name != null && q.event_name != 'initialize' && q.event_name != 'execute');
  console.log('Timeline');
  console.table(
    events.map(e => {
      return {
        'Event Date': e.date,
        Direction: e.event_direction,
        'Event Name': e.event_name,
        Key: e.key,
        'Correlation Id': e.event_correlation
      };
    })
  );

  console.log('\n');
  console.log('Timeline');
  const config = {
    border: {
      bodyLeft: ` `,
      bodyRight: ` `,
      bodyJoin: ` `
    },
    columns: {
      0: {
        alignment: 'center',
        width: 3
      },
      1: {
        alignment: 'center',
        width: 23
      },
      2: {
        alignment: 'center',
        width: 8
      },
      3: {
        alignment: 'center',
        width: 36,
        wrapWord: true
      },
      4: {
        alignment: 'center',
        width: 40,
        wrapWord: true
      },
      5: {
        alignment: 'center',
        width: 36
      },
      6: {
        alignment: 'left',
        width: 40,
        wrapWord: true
      }
    }
  };

  const output = table.table(
    [[null, 'Date', '<>', 'Name', 'Key', 'Correlation Id', 'Result']].concat(
      events.map((e, i) => {
        return [
          i,
          e.date
            .replace('T', ' ')
            .replace('.', '')
            .substring(0, 22),
          e.event_direction,
          e.event_name,
          e.key,
          e.event_correlation,
          e.result ? JSON.stringify(e.result.object).replace(/:/g, ': ') : null
        ];
      })
    ),
    config
  );

  console.log(output);
});
