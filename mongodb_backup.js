const spawn = require('child_process').spawn;

exports.dbAutoBackUp = function() {
    const back_path = './dump/omc/' + Date.now() + '.gz';
    let backupProcess = spawn('mongodump', [
        `--db=omc`,
        `--archive=${back_path}`,
        `--gzip`
    ]);



    /*  backupProcess.stdout.on('data', (data) => {
         console.log('stdoup', data)
     })
     backupProcess.stderr.on('data', (data) => {
         console.log('stdoup', Buffer.from(data).toString())
     })
     backupProcess.on('error', (err) => {
         console.log(err);
     }) */

    backupProcess.on('exit', (code, signal) => {
        if (code)
            console.log('Backup process exited with code ', code);
        else if (signal)
            console.error('Backup process was killed with singal ', signal);
        else
            console.log('Successfully backedup the database')
    });

}